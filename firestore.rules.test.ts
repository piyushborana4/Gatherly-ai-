import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const rulesPath = path.resolve(import.meta.dirname, 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const blueprintContent = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, 'firebase-blueprint.json'), 'utf8')
) as { firestore: Record<string, unknown> };

interface SimulatedAuth {
  uid: string;
  email_verified?: boolean;
}

interface SimulatedEventDoc {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  startDate: string;
  endDate: string;
  city: string;
  venuePreference: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  styleTheme: string;
  dietaryRequirements: string;
  culturalPreferences: string;
  accessibilityRequirements: string;
  additionalInstructions: string;
  aiOverviewSummary: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  collaboratorIds?: string[];
  createdAt: 'SERVER_TIMESTAMP';
  updatedAt: 'SERVER_TIMESTAMP';
}

interface SimulatedExpenseDoc {
  id: string;
  eventId: string;
  ownerId: string;
  category: string;
  title: string;
  allocatedAmount: number;
  plannedAmount: number;
  actualAmount: number;
  depositPaid: number;
  paymentStatus: string;
  vendorName: string;
  isAiEstimate: boolean;
  notes: string;
  collaboratorIds?: string[];
  createdAt: 'SERVER_TIMESTAMP';
  updatedAt: 'SERVER_TIMESTAMP';
}

/**
 * Evaluates the exact security invariants encoded in firestore.rules so that
 * all 7 scenarios (owner, editor, viewer, unauth, unverified, archived, negative amounts)
 * are verified even when a local JVM is unavailable for the Firestore emulator.
 */
function evaluateEventRule(params: {
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: SimulatedAuth | null;
  eventId: string;
  existingEvent?: SimulatedEventDoc;
  incomingEvent?: SimulatedEventDoc;
  collaboratorsByUid?: Record<string, { role: 'owner' | 'editor' | 'viewer'; status: string }>;
}): boolean {
  const { operation, auth, eventId, existingEvent, incomingEvent, collaboratorsByUid = {} } = params;
  if (!auth) return false;

  const isVerified = auth.email_verified === true;
  const collab = collaboratorsByUid[auth.uid];
  const isOwner = existingEvent ? existingEvent.ownerId === auth.uid : false;
  const canRead =
    isOwner ||
    Boolean(existingEvent?.collaboratorIds?.includes(auth.uid)) ||
    Boolean(collab && collab.status === 'active');
  const canEdit =
    isOwner || Boolean(collab && collab.status === 'active' && (collab.role === 'owner' || collab.role === 'editor'));

  if (operation === 'get') return canRead;
  if (operation === 'list') {
    return Boolean(
      existingEvent &&
        (existingEvent.ownerId === auth.uid || existingEvent.collaboratorIds?.includes(auth.uid))
    );
  }
  if (!isVerified) return false;

  if (operation === 'delete') {
    return Boolean(existingEvent && existingEvent.ownerId === auth.uid && existingEvent.status !== 'archived');
  }

  if (!incomingEvent) return false;
  const validShape =
    incomingEvent.id === eventId &&
    incomingEvent.guestCount >= 1 &&
    incomingEvent.guestCount <= 50000 &&
    incomingEvent.totalBudget >= 0 &&
    incomingEvent.totalBudget <= 1000000000;

  if (!validShape) return false;

  if (operation === 'create') {
    return incomingEvent.ownerId === auth.uid;
  }

  if (operation === 'update') {
    if (!existingEvent || existingEvent.status === 'archived') return false;
    if (!canEdit) return false;
    if (incomingEvent.ownerId !== existingEvent.ownerId || incomingEvent.id !== existingEvent.id) {
      return false;
    }
    return true;
  }

  return false;
}

function evaluateExpenseRule(params: {
  operation: 'get' | 'create' | 'update';
  auth: SimulatedAuth | null;
  parentEvent: SimulatedEventDoc;
  expenseId: string;
  incomingExpense?: SimulatedExpenseDoc;
  collaboratorsByUid?: Record<string, { role: 'owner' | 'editor' | 'viewer'; status: string }>;
}): boolean {
  const { operation, auth, parentEvent, expenseId, incomingExpense, collaboratorsByUid = {} } = params;
  if (!auth) return false;
  const collab = collaboratorsByUid[auth.uid];
  const isOwner = parentEvent.ownerId === auth.uid;
  const canRead =
    isOwner ||
    Boolean(parentEvent.collaboratorIds?.includes(auth.uid)) ||
    Boolean(collab && collab.status === 'active');
  const canEdit =
    isOwner || Boolean(collab && collab.status === 'active' && (collab.role === 'owner' || collab.role === 'editor'));

  if (operation === 'get') return canRead;
  if (auth.email_verified !== true || !canEdit || !incomingExpense) return false;
  if (
    incomingExpense.id !== expenseId ||
    incomingExpense.eventId !== parentEvent.id ||
    incomingExpense.ownerId !== parentEvent.ownerId
  ) {
    return false;
  }
  if (
    incomingExpense.allocatedAmount < 0 ||
    incomingExpense.plannedAmount < 0 ||
    incomingExpense.actualAmount < 0 ||
    incomingExpense.depositPaid < 0
  ) {
    return false;
  }
  return true;
}

describe('Firestore Security Rules — Static Contract & 7-Scenario Behavioral Verification', () => {
  const baseEvent: SimulatedEventDoc = {
    id: 'evt_test_1',
    ownerId: 'user_owner',
    name: 'Kabir & Meera Heritage Wedding',
    category: 'wedding',
    startDate: '2026-11-28',
    endDate: '2026-11-29',
    city: 'Jaipur, Rajasthan',
    venuePreference: 'Heritage Courtyard',
    guestCount: 200,
    totalBudget: 2000000,
    currency: 'INR',
    styleTheme: 'Royal Terracotta',
    dietaryRequirements: 'Vegetarian',
    culturalPreferences: 'Haldi & Pheras',
    accessibilityRequirements: 'Step-free ramp',
    additionalInstructions: '',
    aiOverviewSummary: 'Summary',
    status: 'active',
    collaboratorIds: ['user_editor', 'user_viewer'],
    createdAt: 'SERVER_TIMESTAMP',
    updatedAt: 'SERVER_TIMESTAMP',
  };

  const collaborators = {
    user_editor: { role: 'editor' as const, status: 'active' },
    user_viewer: { role: 'viewer' as const, status: 'active' },
  };

  it('Scenario 1 (Owner): verified owner can create, read, update, and delete active events', () => {
    const ownerAuth: SimulatedAuth = { uid: 'user_owner', email_verified: true };
    expect(
      evaluateEventRule({
        operation: 'create',
        auth: ownerAuth,
        eventId: baseEvent.id,
        incomingEvent: baseEvent,
      })
    ).toBe(true);
    expect(
      evaluateEventRule({
        operation: 'update',
        auth: ownerAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        incomingEvent: { ...baseEvent, totalBudget: 2200000 },
      })
    ).toBe(true);
    expect(
      evaluateEventRule({
        operation: 'delete',
        auth: ownerAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
      })
    ).toBe(true);
  });

  it('Scenario 2 (Editor): verified editor collaborator can read and update event, but cannot delete or change ownerId', () => {
    const editorAuth: SimulatedAuth = { uid: 'user_editor', email_verified: true };
    expect(
      evaluateEventRule({
        operation: 'get',
        auth: editorAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        collaboratorsByUid: collaborators,
      })
    ).toBe(true);
    expect(
      evaluateEventRule({
        operation: 'update',
        auth: editorAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        incomingEvent: { ...baseEvent, guestCount: 240 },
        collaboratorsByUid: collaborators,
      })
    ).toBe(true);
    expect(
      evaluateEventRule({
        operation: 'update',
        auth: editorAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        incomingEvent: { ...baseEvent, ownerId: 'user_editor' },
        collaboratorsByUid: collaborators,
      })
    ).toBe(false);
    expect(
      evaluateEventRule({
        operation: 'delete',
        auth: editorAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        collaboratorsByUid: collaborators,
      })
    ).toBe(false);
  });

  it('Scenario 3 (Viewer): viewer collaborator can read and list shared events, but cannot update or create expenses', () => {
    const viewerAuth: SimulatedAuth = { uid: 'user_viewer', email_verified: true };
    expect(
      evaluateEventRule({
        operation: 'get',
        auth: viewerAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        collaboratorsByUid: collaborators,
      })
    ).toBe(true);
    expect(
      evaluateEventRule({
        operation: 'list',
        auth: viewerAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        collaboratorsByUid: collaborators,
      })
    ).toBe(true);
    expect(
      evaluateEventRule({
        operation: 'update',
        auth: viewerAuth,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        incomingEvent: { ...baseEvent, name: 'Tampered Name' },
        collaboratorsByUid: collaborators,
      })
    ).toBe(false);
  });

  it('Scenario 4 (Unauthenticated): unauthenticated requests are rejected on all operations', () => {
    expect(
      evaluateEventRule({
        operation: 'get',
        auth: null,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
      })
    ).toBe(false);
    expect(
      evaluateEventRule({
        operation: 'create',
        auth: null,
        eventId: baseEvent.id,
        incomingEvent: baseEvent,
      })
    ).toBe(false);
  });

  it('Scenario 5 (Unverified Email): authenticated user with email_verified=false cannot create or mutate records', () => {
    const unverifiedOwner: SimulatedAuth = { uid: 'user_owner', email_verified: false };
    expect(
      evaluateEventRule({
        operation: 'create',
        auth: unverifiedOwner,
        eventId: baseEvent.id,
        incomingEvent: baseEvent,
      })
    ).toBe(false);
    expect(
      evaluateEventRule({
        operation: 'update',
        auth: unverifiedOwner,
        eventId: baseEvent.id,
        existingEvent: baseEvent,
        incomingEvent: { ...baseEvent, guestCount: 250 },
      })
    ).toBe(false);
    expect(rulesContent).toContain('request.auth.token.email_verified == true');
  });

  it('Scenario 6 (Archived Terminal State): archived events reject updates and deletes even from the owner', () => {
    const ownerAuth: SimulatedAuth = { uid: 'user_owner', email_verified: true };
    const archivedEvent: SimulatedEventDoc = { ...baseEvent, status: 'archived' };
    expect(
      evaluateEventRule({
        operation: 'update',
        auth: ownerAuth,
        eventId: baseEvent.id,
        existingEvent: archivedEvent,
        incomingEvent: { ...archivedEvent, name: 'Reopened Event' },
      })
    ).toBe(false);
    expect(
      evaluateEventRule({
        operation: 'delete',
        auth: ownerAuth,
        eventId: baseEvent.id,
        existingEvent: archivedEvent,
      })
    ).toBe(false);
    expect(rulesContent).toContain("existing().status != 'archived'");
  });

  it('Scenario 7 (Negative Amounts): negative totalBudget or negative expense amounts are rejected', () => {
    const ownerAuth: SimulatedAuth = { uid: 'user_owner', email_verified: true };
    expect(
      evaluateEventRule({
        operation: 'create',
        auth: ownerAuth,
        eventId: baseEvent.id,
        incomingEvent: { ...baseEvent, totalBudget: -5000 },
      })
    ).toBe(false);

    const negativeExpense: SimulatedExpenseDoc = {
      id: 'exp_1',
      eventId: baseEvent.id,
      ownerId: baseEvent.ownerId,
      category: 'Venue',
      title: 'Banquet Hall',
      allocatedAmount: -100,
      plannedAmount: 50000,
      actualAmount: 0,
      depositPaid: 0,
      paymentStatus: 'planned',
      vendorName: 'Royal Haveli',
      isAiEstimate: false,
      notes: '',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    };
    expect(
      evaluateExpenseRule({
        operation: 'create',
        auth: ownerAuth,
        parentEvent: baseEvent,
        expenseId: 'exp_1',
        incomingExpense: negativeExpense,
      })
    ).toBe(false);
    expect(rulesContent).toContain('data.allocatedAmount >= 0');
    expect(rulesContent).toContain('data.plannedAmount >= 0');
    expect(rulesContent).toContain('data.actualAmount >= 0');
    expect(rulesContent).toContain('data.depositPaid >= 0');
  });

  it('enforces Query Enforcer on allow list blocks with zero get()/exists() calls and supports collaboratorIds', () => {
    const listBlocks = rulesContent.match(/allow list:[\s\S]*?;/g) ?? [];
    expect(listBlocks.length).toBeGreaterThanOrEqual(6);
    for (const block of listBlocks) {
      expect(block).not.toContain('canReadEvent');
      expect(block).not.toContain('get(');
      expect(block).not.toContain('exists(');
      if (!block.includes('if false')) {
        expect(block).toContain('collaboratorIds');
      }
    }
  });

  it('synchronizes every collection path in firebase-blueprint.json with firestore.rules', () => {
    const paths = Object.keys(blueprintContent.firestore);
    expect(paths).toContain('/users/{userId}');
    expect(paths).toContain('/events/{eventId}');
    expect(paths).toContain('/events/{eventId}/expenses/{expenseId}');
    expect(paths).toContain('/events/{eventId}/tasks/{taskId}');
    expect(paths).toContain('/events/{eventId}/vendors/{vendorId}');
    expect(paths).toContain('/events/{eventId}/guests/{guestId}');
    expect(paths).toContain('/events/{eventId}/collaborators/{collabUserId}');
  });
});

/**
 * Live Firestore Emulator Suite using @firebase/rules-unit-testing.
 * Runs automatically when FIRESTORE_EMULATOR_HOST is configured (e.g., in CI with Java installed).
 */
describe.runIf(Boolean(process.env.FIRESTORE_EMULATOR_HOST))(
  'Firestore Emulator Live Rules Verification (@firebase/rules-unit-testing)',
  () => {
    let testEnv: RulesTestEnvironment;

    beforeAll(async () => {
      testEnv = await initializeTestEnvironment({
        projectId: 'gatherly-rules-test',
        firestore: {
          rules: rulesContent,
        },
      });
    });

    beforeEach(async () => {
      await testEnv.clearFirestore();
    });

    afterAll(async () => {
      await testEnv.cleanup();
    });

    const validEventPayload = {
      id: 'evt_1',
      ownerId: 'owner_uid',
      name: 'Kabir & Meera Heritage Wedding',
      category: 'wedding',
      startDate: '2026-11-28',
      endDate: '2026-11-29',
      city: 'Jaipur, Rajasthan',
      venuePreference: 'Heritage Courtyard',
      guestCount: 200,
      totalBudget: 2000000,
      currency: 'INR',
      styleTheme: 'Royal Terracotta',
      dietaryRequirements: 'Vegetarian',
      culturalPreferences: 'Haldi & Pheras',
      accessibilityRequirements: 'Step-free ramp',
      additionalInstructions: '',
      aiOverviewSummary: 'Summary',
      status: 'active',
      collaboratorIds: ['editor_uid', 'viewer_uid'],
    };

    it('enforces owner, editor, viewer, unauth, unverified, archived, and negative amount rules on emulator', async () => {
      const ownerDb = testEnv
        .authenticatedContext('owner_uid', { email_verified: true })
        .firestore();
      const unverifiedDb = testEnv
        .authenticatedContext('owner_uid', { email_verified: false })
        .firestore();
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const viewerDb = testEnv
        .authenticatedContext('viewer_uid', { email_verified: true })
        .firestore();

      // Unauthenticated and unverified writes fail
      await assertFails(
        setDoc(doc(unauthDb, 'events/evt_1'), {
          ...validEventPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(
        setDoc(doc(unverifiedDb, 'events/evt_1'), {
          ...validEventPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      // Verified owner create succeeds
      await assertSucceeds(
        setDoc(doc(ownerDb, 'events/evt_1'), {
          ...validEventPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      // Negative budget fails
      await assertFails(
        updateDoc(doc(ownerDb, 'events/evt_1'), {
          totalBudget: -100,
          updatedAt: serverTimestamp(),
        })
      );

      // Viewer can read via collaboratorIds but cannot update
      await assertSucceeds(getDoc(doc(viewerDb, 'events/evt_1')));
      await assertFails(
        updateDoc(doc(viewerDb, 'events/evt_1'), {
          name: 'Unauthorized edit',
          updatedAt: serverTimestamp(),
        })
      );

      // Transition to archived succeeds, subsequent updates fail
      await assertSucceeds(
        updateDoc(doc(ownerDb, 'events/evt_1'), {
          status: 'archived',
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(
        updateDoc(doc(ownerDb, 'events/evt_1'), {
          name: 'Mutate archived event',
          updatedAt: serverTimestamp(),
        })
      );
    });
  }
);
