import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  CollaboratorRecord,
  EventPlan,
  ExpenseItem,
  GuestRecord,
  TimelineTask,
  UserProfile,
  VendorRecord,
} from '../types/domain';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Activate Firebase App Check in browser environments when a reCAPTCHA v3 site key is configured
const appCheckSiteKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined)
    : undefined;
if (typeof window !== 'undefined' && appCheckSiteKey && appCheckSiteKey.trim().length > 0) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey.trim()),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('Firebase App Check initialization skipped:', err);
  }
}

export async function getFirebaseIdToken(): Promise<string | null> {
  if (!auth.currentUser) {
    return null;
  }
  return await auth.currentUser.getIdToken();
}

export async function sendVerificationEmailToCurrentUser(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No signed-in user found.');
  }
  await sendEmailVerification(auth.currentUser);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required by firebase-integration-rpc
async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const newProfile: UserProfile = {
      uid: user.uid,
      displayName: (user.displayName || user.email?.split('@')[0] || 'Event Organizer').slice(
        0,
        100
      ),
      email: (user.email || 'organizer@example.com').slice(0, 254),
      preferredCurrency: 'INR',
      preferredLocale: 'en-IN',
      defaultCity: 'Mumbai, Maharashtra',
      dietaryDefault: 'Vegetarian',
    };
    await setDoc(userRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserProfilePreferences(
  uid: string,
  updates: Partial<
    Pick<
      UserProfile,
      'displayName' | 'preferredCurrency' | 'preferredLocale' | 'defaultCity' | 'dietaryDefault'
    >
  >
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeToUserEvents(
  uid: string,
  onData: (events: EventPlan[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const eventsPath = 'events';
  const ownedMap = new Map<string, EventPlan>();
  const sharedMap = new Map<string, EventPlan>();

  const emitMerged = () => {
    const merged = new Map<string, EventPlan>([...sharedMap, ...ownedMap]);
    onData(Array.from(merged.values()));
  };

  const ownedQuery = query(collection(db, 'events'), where('ownerId', '==', uid));
  const sharedQuery = query(
    collection(db, 'events'),
    where('collaboratorIds', 'array-contains', uid)
  );

  const unsubOwned = onSnapshot(
    ownedQuery,
    (snapshot) => {
      ownedMap.clear();
      for (const d of snapshot.docs) {
        const ev = d.data() as EventPlan;
        ownedMap.set(ev.id, ev);
      }
      emitMerged();
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, eventsPath);
    }
  );

  const unsubShared = onSnapshot(
    sharedQuery,
    (snapshot) => {
      sharedMap.clear();
      for (const d of snapshot.docs) {
        const ev = d.data() as EventPlan;
        sharedMap.set(ev.id, ev);
      }
      emitMerged();
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, eventsPath);
    }
  );

  return () => {
    unsubOwned();
    unsubShared();
  };
}

/**
 * Strips client-side timestamp fields so updates never overwrite immutable createdAt.
 */
export function buildCreatePayload<T extends object>(
  record: T
): Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } {
  const clone = { ...(record as Record<string, unknown>) };
  delete clone.createdAt;
  delete clone.updatedAt;
  return {
    ...(clone as Omit<T, 'createdAt' | 'updatedAt'>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildUpdatePayload<T extends object>(
  updates: T
): Omit<T, 'createdAt' | 'id' | 'ownerId' | 'eventId'> & { updatedAt: unknown } {
  const clone = { ...(updates as Record<string, unknown>) };
  delete clone.createdAt;
  delete clone.id;
  delete clone.ownerId;
  delete clone.eventId;
  return {
    ...(clone as Omit<T, 'createdAt' | 'id' | 'ownerId' | 'eventId'>),
    updatedAt: serverTimestamp(),
  };
}

export async function saveEventPlanToFirestore(event: EventPlan): Promise<void> {
  const path = `events/${event.id}`;
  const eventRef = doc(db, 'events', event.id);
  try {
    const existing = await getDoc(eventRef);
    if (existing.exists()) {
      await updateDoc(eventRef, buildUpdatePayload(event));
    } else {
      await setDoc(eventRef, buildCreatePayload({ ...event, collaboratorIds: event.collaboratorIds ?? [] }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveEventBundleToFirestore(bundle: {
  event: EventPlan;
  expenses: ExpenseItem[];
  tasks: TimelineTask[];
  vendors: VendorRecord[];
  guests: GuestRecord[];
}): Promise<void> {
  const path = `events/${bundle.event.id}`;
  try {
    const batch = writeBatch(db);
    const eventRef = doc(db, 'events', bundle.event.id);
    const existingEventSnap = await getDoc(eventRef);

    if (existingEventSnap.exists()) {
      batch.update(eventRef, buildUpdatePayload(bundle.event));
    } else {
      batch.set(
        eventRef,
        buildCreatePayload({
          ...bundle.event,
          isDemo: false,
          collaboratorIds: bundle.event.collaboratorIds ?? [],
        })
      );
    }

    const syncCollection = async <
      T extends { id: string; createdAt?: unknown; updatedAt?: unknown; collaboratorIds?: string[] }
    >(
      subName: 'expenses' | 'tasks' | 'vendors' | 'guests',
      items: T[]
    ) => {
      for (const item of items) {
        const ref = doc(db, 'events', bundle.event.id, subName, item.id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          batch.update(ref, buildUpdatePayload(item));
        } else {
          batch.set(
            ref,
            buildCreatePayload({
              ...item,
              collaboratorIds: item.collaboratorIds ?? bundle.event.collaboratorIds ?? [],
            })
          );
        }
      }
    };

    await syncCollection('expenses', bundle.expenses);
    await syncCollection('tasks', bundle.tasks);
    await syncCollection('vendors', bundle.vendors);
    await syncCollection('guests', bundle.guests);

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateEventPlanInFirestore(
  eventId: string,
  updates: Partial<Omit<EventPlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'isDemo'>>
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await updateDoc(doc(db, 'events', eventId), buildUpdatePayload(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventPlanFromFirestore(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Subcollection CRUD Helpers with owner & collaborator list support and strict create/update separation
export function subscribeToEventSubcollection<T>(
  eventId: string,
  ownerId: string,
  subcollectionName: 'expenses' | 'tasks' | 'vendors' | 'guests' | 'collaborators',
  onData: (items: T[]) => void
): Unsubscribe {
  const subPath = `events/${eventId}/${subcollectionName}`;
  const currentUid = auth.currentUser?.uid;
  const isOwner = !currentUid || currentUid === ownerId;

  const q = isOwner
    ? query(
        collection(db, 'events', eventId, subcollectionName),
        where('eventId', '==', eventId),
        where('ownerId', '==', ownerId)
      )
    : query(
        collection(db, 'events', eventId, subcollectionName),
        where('eventId', '==', eventId),
        where('collaboratorIds', 'array-contains', currentUid)
      );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as T));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, subPath);
    }
  );
}

export async function createSubcollectionRecord<
  T extends
    | ExpenseItem
    | TimelineTask
    | VendorRecord
    | GuestRecord
    | CollaboratorRecord
>(
  eventId: string,
  subcollectionName: 'expenses' | 'tasks' | 'vendors' | 'guests' | 'collaborators',
  docId: string,
  record: T
): Promise<void> {
  const path = `events/${eventId}/${subcollectionName}/${docId}`;
  const ref = doc(db, 'events', eventId, subcollectionName, docId);
  try {
    await setDoc(
      ref,
      buildCreatePayload({
        ...record,
        collaboratorIds: record.collaboratorIds ?? [],
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSubcollectionRecord(
  eventId: string,
  subcollectionName: 'expenses' | 'tasks' | 'vendors' | 'guests' | 'collaborators',
  docId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const path = `events/${eventId}/${subcollectionName}/${docId}`;
  try {
    await updateDoc(
      doc(db, 'events', eventId, subcollectionName, docId),
      buildUpdatePayload(updates)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSubcollectionRecord(
  eventId: string,
  subcollectionName: 'expenses' | 'tasks' | 'vendors' | 'guests' | 'collaborators',
  docId: string
): Promise<void> {
  const path = `events/${eventId}/${subcollectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId, subcollectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchSharedEventById(eventId: string): Promise<EventPlan | null> {
  const path = `events/${eventId}`;
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists()) return null;
    return snap.data() as EventPlan;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchSubcollectionOnce<T>(
  eventId: string,
  ownerId: string,
  subcollectionName: 'expenses' | 'tasks' | 'vendors' | 'guests' | 'collaborators'
): Promise<T[]> {
  const path = `events/${eventId}/${subcollectionName}`;
  const currentUid = auth.currentUser?.uid;
  const isOwner = !currentUid || currentUid === ownerId;
  try {
    const q = isOwner
      ? query(
          collection(db, 'events', eventId, subcollectionName),
          where('eventId', '==', eventId),
          where('ownerId', '==', ownerId)
        )
      : query(
          collection(db, 'events', eventId, subcollectionName),
          where('eventId', '==', eventId),
          where('collaboratorIds', 'array-contains', currentUid)
        );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
