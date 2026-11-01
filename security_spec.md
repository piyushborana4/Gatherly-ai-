# Gatherly AI — Security Specification (Phase 0 Payload-First Security TDD)

## 1. Data Invariants (`firestore.rules`)

1. **Global Default-Deny**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Identity**: All write operations require `isVerifiedUser()` (`isSignedIn() && request.auth.token.email_verified == true`).
3. **PII Isolation (`/users/{userId}` & `/events/{eventId}/guests/{guestId}`)**:
   - A `UserProfile` document at `/users/{userId}` (validated by `isValidUserProfile`) can only be read (`get`), created, or updated by `request.auth.uid == userId`. Listing `/users` is strictly prohibited (`allow list: if false;`).
   - Guest records containing contact information (`/events/{eventId}/guests/{guestId}`, validated by `isValidGuestRecord`) can only be read by the event owner (`isEventOwner`) or an active collaborator (`isActiveCollaborator` / `canReadEvent`) on that specific `eventId`.
4. **Master Gate Relational Sync**:
   - Subcollections (`expenses`, `tasks`, `vendors`, `guests`, `collaborators`) under `/events/{eventId}` verify parent event existence and role membership (`canReadEvent` and `canEditEvent` using `isEventOwner`, `isActiveCollaborator`, and `isEditorCollaborator`).
   - Revoking or deleting a collaborator document immediately revokes subcollection read/write access and removes their UID from `collaboratorIds`.
5. **Query Enforcer (`allow list` with Zero `get()` Calls)**:
   - Top-level `/events/{eventId}` `allow list` requires `existing().ownerId == request.auth.uid || ('collaboratorIds' in existing() && request.auth.uid in existing().collaboratorIds)` (zero `get()` calls inside `allow list`).
   - Subcollection `allow list` operations check `existing().eventId == eventId` and `(existing().ownerId == request.auth.uid || ('collaboratorIds' in existing() && request.auth.uid in existing().collaboratorIds))`.
6. **Terminal State Locking**:
   - Once an `EventPlan` reaches `existing().status == 'archived'`, no subsequent `update` operations are permitted (`existing().status != 'archived'`).
7. **Temporal & Ownership Immutability**:
   - `createdAt` must equal `request.time` on `create` and remain immutable (`incoming().createdAt == existing().createdAt`) on `update` (enforced on the client via `buildCreatePayload` and `buildUpdatePayload` in `src/services/firebase.ts`).
   - `updatedAt` must equal `request.time` on both `create` and `update`.
   - `ownerId`, `id`, and `eventId` are immutable after creation.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Shadow Field Injection on Event Create)**: Valid `EventPlan` payload plus `"isAdmin": true` -> Rejected by `isValidEventPlan` (`data.keys().hasOnly(...)`).
2. **Payload 2 (Unverified Email Write Attempt)**: Authenticated token with `email_verified == false` creating `/users/{userId}` -> Rejected by `isVerifiedUser()`.
3. **Payload 3 (Cross-User Profile PII Snooping)**: `user_2` attempting `get` on `/users/{userId}` of `user_1` -> Rejected by `request.auth.uid == userId`.
4. **Payload 4 (Identity Spoofing on Event Creation)**: `user_1` creating `/events/{eventId}` with `ownerId: "user_2"` -> Rejected by `incoming().ownerId == request.auth.uid`.
5. **Payload 5 (ID Poisoning Attack)**: Creating `/events/{eventId}` with special characters -> Rejected by `isValidId(eventId)`.
6. **Payload 6 (Denial-of-Wallet 1MB String Payload)**: Updating `EventPlan` `name` with a 5,000-character string -> Rejected by `data.name.size() <= 140`.
7. **Payload 7 (Negative Budget Value Poisoning)**: Creating `ExpenseItem` with `actualAmount: -50000` -> Rejected by `isValidExpenseItem` (`data.actualAmount >= 0`).
8. **Payload 8 (Terminal State Bypass)**: Updating `/events/{eventId}` when `existing().status == 'archived'` -> Rejected by `existing().status != 'archived'`.
9. **Payload 9 (Ownership Hijack on Update)**: Collaborator `editor` attempting to change `ownerId` on `/events/{eventId}` -> Rejected by `incoming().ownerId == existing().ownerId` and `affectedKeys().hasOnly(...)`.
10. **Payload 10 (Viewer Privilege Escalation)**: Collaborator with `role == 'viewer'` attempting to create or update a task in `/events/{eventId}/tasks/{taskId}` -> Rejected by `canEditEvent(eventId)`.
11. **Payload 11 (Forged Client Timestamp)**: Creating `/events/{eventId}` with a past/future `createdAt` not matching `request.time` -> Rejected by `incoming().createdAt == request.time`.
12. **Payload 12 (Blanket Unfiltered List Query)**: Authenticated user attempting `list` on `/events/{eventId}` for events they neither own nor collaborate on -> Rejected by `existing().ownerId == request.auth.uid || ('collaboratorIds' in existing() && request.auth.uid in existing().collaboratorIds)`.

---

## 3. Hardened Red Team Audit Summary (`firestore.rules.test.ts`)

- **Shadow Update Test**: PASS — Every `create` uses `hasAll` + `hasOnly` (`isValidEventPlan`, `isValidExpenseItem`, `isValidTimelineTask`, `isValidVendorRecord`, `isValidGuestRecord`, `isValidCollaboratorRecord`), and every `update` restricts `affectedKeys().hasOnly(...)`.
- **Email Spoofing Test**: PASS — `isVerifiedUser()` enforces `request.auth.token.email_verified == true`.
- **PII Blanket Test**: PASS — `/users/{userId}` sets `allow list: if false;` and restricts `get` to `request.auth.uid == userId`; `/events/{eventId}/guests/{guestId}` restricts access to event owner and active collaborators.
- **Query Trust Test**: PASS — `/events/{eventId}` and all 5 subcollections enforce owner or `collaboratorIds` membership on `allow list` with zero `get()` calls.
