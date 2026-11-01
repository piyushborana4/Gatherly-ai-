import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signOutUser,
  sendVerificationEmailToCurrentUser,
  subscribeToAuthChanges,
  subscribeToUserEvents,
  saveEventPlanToFirestore,
  updateEventPlanInFirestore,
  deleteEventPlanFromFirestore,
  subscribeToEventSubcollection,
  createSubcollectionRecord,
  updateSubcollectionRecord,
  deleteSubcollectionRecord,
} from './services/firebase';
import {
  EventPlan,
  ExpenseItem,
  TimelineTask,
  VendorRecord,
  GuestRecord,
  CollaboratorRecord,
  CollaboratorRole,
  EventStatus,
  CopilotProposedAction,
  ExpenseCategory,
  TimelineStage,
  TaskPriority,
  VendorCategory,
  VendorPriorityLevel,
} from './types/domain';
import {
  calculateBudgetSummary,
  formatCurrency,
  recalculateAllocationsForNewTotal,
} from './utils/financials';
import { formatIndianDate } from './utils/timeline';
import { computeSmartInsights } from './utils/insights';
import { generateStructuredEventPlan } from './services/aiService';
import {
  createMumbaiWeddingDemoBundle,
  createAdditionalDemoBundles,
  MUMBAI_WEDDING_DEMO_EVENT_ID,
} from './utils/demoData';

import { LandingPage } from './components/LandingPage';
import { EditorialScene, mapCategoryToScene } from './components/EditorialVisuals';
import type { EventWizardInput } from './features/events/EventCreationWizard';
import { EventOverviewPanel } from './features/events/EventOverviewPanel';

const EventCreationWizard = lazy(() =>
  import('./features/events/EventCreationWizard').then((m) => ({
    default: m.EventCreationWizard,
  }))
);
const BudgetManager = lazy(() =>
  import('./features/budget/BudgetManager').then((m) => ({ default: m.BudgetManager }))
);
const TimelineManager = lazy(() =>
  import('./features/timeline/TimelineManager').then((m) => ({ default: m.TimelineManager }))
);
const VendorManager = lazy(() =>
  import('./features/vendors/VendorManager').then((m) => ({ default: m.VendorManager }))
);
const GuestManager = lazy(() =>
  import('./features/guests/GuestManager').then((m) => ({ default: m.GuestManager }))
);
const CopilotPanel = lazy(() =>
  import('./features/copilot/CopilotPanel').then((m) => ({ default: m.CopilotPanel }))
);
const CollaborationPanel = lazy(() =>
  import('./features/collaboration/CollaborationPanel').then((m) => ({
    default: m.CollaborationPanel,
  }))
);

type ActiveWorkspaceTab =
  | 'overview'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'guests'
  | 'copilot'
  | 'collaborate';

interface DemoBundleStore {
  events: EventPlan[];
  expensesByEvent: Record<string, ExpenseItem[]>;
  tasksByEvent: Record<string, TimelineTask[]>;
  vendorsByEvent: Record<string, VendorRecord[]>;
  guestsByEvent: Record<string, GuestRecord[]>;
  collaboratorsByEvent: Record<string, CollaboratorRecord[]>;
}

function buildInitialDemoStore(): DemoBundleStore {
  const primary = createMumbaiWeddingDemoBundle('demo_guest_user');
  const extras = createAdditionalDemoBundles('demo_guest_user');
  const allBundles = [primary, ...Object.values(extras)];

  const events: EventPlan[] = [];
  const expensesByEvent: Record<string, ExpenseItem[]> = {};
  const tasksByEvent: Record<string, TimelineTask[]> = {};
  const vendorsByEvent: Record<string, VendorRecord[]> = {};
  const guestsByEvent: Record<string, GuestRecord[]> = {};
  const collaboratorsByEvent: Record<string, CollaboratorRecord[]> = {};

  for (const b of allBundles) {
    events.push(b.event);
    expensesByEvent[b.event.id] = b.expenses;
    tasksByEvent[b.event.id] = b.tasks;
    vendorsByEvent[b.event.id] = b.vendors;
    guestsByEvent[b.event.id] = b.guests;
    collaboratorsByEvent[b.event.id] = b.collaborators;
  }

  return {
    events,
    expensesByEvent,
    tasksByEvent,
    vendorsByEvent,
    guestsByEvent,
    collaboratorsByEvent,
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Navigation & Drawer State
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('overview');
  const [showMyEventsPortfolio, setShowMyEventsPortfolio] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');

  // Firestore State
  const [events, setEvents] = useState<EventPlan[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([]);

  // Demo Store State
  const [demoStore, setDemoStore] = useState<DemoBundleStore>(() => buildInitialDemoStore());

  // Error Banner
  const [bannerError, setBannerError] = useState<string | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      if (firebaseUser) {
        setIsDemoMode(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to User's Events
  useEffect(() => {
    if (!isAuthReady || !user || isDemoMode) return;

    const unsub = subscribeToUserEvents(
      user.uid,
      (loadedEvents) => {
        setEvents(loadedEvents);
        setSelectedEventId((prev) => {
          if (prev && loadedEvents.some((e) => e.id === prev)) return prev;
          return loadedEvents[0]?.id ?? null;
        });
      },
      (err) =>
        setBannerError(err instanceof Error ? err.message : 'Unable to load events.')
    );

    return () => unsub();
  }, [isAuthReady, user, isDemoMode]);

  // Effective Active Event
  const activeEvents = isDemoMode ? demoStore.events : events;
  const activeEvent = useMemo(
    () => activeEvents.find((e) => e.id === selectedEventId) || activeEvents[0] || null,
    [activeEvents, selectedEventId]
  );

  // 3. Subscribe to Active Event Subcollections
  useEffect(() => {
    if (!isAuthReady || !user || isDemoMode || !activeEvent) {
      return;
    }

    const unsubExp = subscribeToEventSubcollection<ExpenseItem>(
      activeEvent.id,
      activeEvent.ownerId,
      'expenses',
      setExpenses
    );
    const unsubTasks = subscribeToEventSubcollection<TimelineTask>(
      activeEvent.id,
      activeEvent.ownerId,
      'tasks',
      setTasks
    );
    const unsubVendors = subscribeToEventSubcollection<VendorRecord>(
      activeEvent.id,
      activeEvent.ownerId,
      'vendors',
      setVendors
    );
    const unsubGuests = subscribeToEventSubcollection<GuestRecord>(
      activeEvent.id,
      activeEvent.ownerId,
      'guests',
      setGuests
    );
    const unsubCollabs = subscribeToEventSubcollection<CollaboratorRecord>(
      activeEvent.id,
      activeEvent.ownerId,
      'collaborators',
      setCollaborators
    );

    return () => {
      unsubExp();
      unsubTasks();
      unsubVendors();
      unsubGuests();
      unsubCollabs();
    };
  }, [isAuthReady, user, isDemoMode, activeEvent]);

  const activeExpenses = useMemo(() => {
    if (!activeEvent) return [];
    if (isDemoMode) return demoStore.expensesByEvent[activeEvent.id] || [];
    return user ? expenses : [];
  }, [isDemoMode, demoStore, activeEvent, user, expenses]);

  const activeTasks = useMemo(() => {
    if (!activeEvent) return [];
    if (isDemoMode) return demoStore.tasksByEvent[activeEvent.id] || [];
    return user ? tasks : [];
  }, [isDemoMode, demoStore, activeEvent, user, tasks]);

  const activeVendors = useMemo(() => {
    if (!activeEvent) return [];
    if (isDemoMode) return demoStore.vendorsByEvent[activeEvent.id] || [];
    return user ? vendors : [];
  }, [isDemoMode, demoStore, activeEvent, user, vendors]);

  const activeGuests = useMemo(() => {
    if (!activeEvent) return [];
    if (isDemoMode) return demoStore.guestsByEvent[activeEvent.id] || [];
    return user ? guests : [];
  }, [isDemoMode, demoStore, activeEvent, user, guests]);

  const activeCollaborators = useMemo(() => {
    if (!activeEvent) return [];
    if (isDemoMode) return demoStore.collaboratorsByEvent[activeEvent.id] || [];
    return user ? collaborators : [];
  }, [isDemoMode, demoStore, activeEvent, user, collaborators]);

  const budgetSummary = useMemo(() => {
    if (!activeEvent) {
      return calculateBudgetSummary(0, 1, []);
    }
    return calculateBudgetSummary(
      activeEvent.totalBudget,
      activeEvent.guestCount,
      activeExpenses
    );
  }, [activeEvent, activeExpenses]);

  const smartInsights = useMemo(() => {
    if (!activeEvent) return [];
    return computeSmartInsights(
      activeEvent,
      budgetSummary,
      activeTasks,
      activeVendors,
      activeGuests
    );
  }, [activeEvent, budgetSummary, activeTasks, activeVendors, activeGuests]);

  const totalPortfolioBudget = useMemo(
    () => activeEvents.reduce((sum, ev) => sum + (ev.totalBudget || 0), 0),
    [activeEvents]
  );

  const currentUserUid = user?.uid || 'demo_guest_user';
  const currentUserEmail = user?.email || 'demo@gatherly.ai';

  const canEditActiveEvent = useMemo(() => {
    if (!activeEvent) return false;
    if (isDemoMode) return true;
    if (activeEvent.ownerId === currentUserUid) return true;
    const collab = activeCollaborators.find(
      (c) => c.userId === currentUserUid && c.status === 'active'
    );
    return collab?.role === 'editor';
  }, [activeEvent, isDemoMode, currentUserUid, activeCollaborators]);

  // Handlers
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setBannerError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setBannerError(
        err instanceof Error ? err.message : 'Sign-in cancelled or blocked by popup settings.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEnterDemo = (scenarioId?: string) => {
    const freshStore = buildInitialDemoStore();
    setDemoStore(freshStore);
    setIsDemoMode(true);
    setSelectedEventId(scenarioId || MUMBAI_WEDDING_DEMO_EVENT_ID);
    setActiveTab('overview');
    setShowMyEventsPortfolio(false);
  };

  const handleCreateEvent = async (input: EventWizardInput) => {
    setIsGeneratingBlueprint(true);
    setBannerError(null);
    try {
      const apiRes = await generateStructuredEventPlan(input);
      const newEventId = `evt_${Date.now()}`;
      const ownerId = currentUserUid;
      const ownerName = user?.displayName || 'Event Organizer';

      const newEvent: EventPlan = {
        id: newEventId,
        ownerId,
        ownerName,
        name: input.name,
        category: input.category,
        startDate: input.startDate,
        endDate: input.endDate,
        city: input.city,
        venuePreference: input.venuePreference,
        guestCount: input.guestCount,
        totalBudget: input.totalBudget,
        currency: input.currency,
        styleTheme: input.styleTheme,
        dietaryRequirements: input.dietaryRequirements,
        culturalPreferences: input.culturalPreferences,
        accessibilityRequirements: input.accessibilityRequirements,
        additionalInstructions: input.additionalInstructions,
        status: 'active',
        aiOverview: apiRes.plan.overview,
        aiStrategy: apiRes.plan.strategy,
        aiThemeIdeas: apiRes.plan.themeAndDecorIdeas,
        aiFoodSuggestions: apiRes.plan.foodAndCateringSuggestions,
        aiEntertainmentIdeas: apiRes.plan.entertainmentIdeas,
        aiRiskPlan: apiRes.plan.riskAndContingencyPlan,
        aiGuestRecommendations: apiRes.plan.guestManagementRecommendations,
        aiReminders: apiRes.plan.importantReminders,
        isDemo: isDemoMode,
      };

      const newExpenses: ExpenseItem[] = apiRes.reconciledExpenses.map((exp, idx) => ({
        id: `${newEventId}_exp_${idx}`,
        eventId: newEventId,
        ownerId,
        category: exp.category,
        title: exp.title,
        allocatedAmount: exp.allocatedAmount,
        plannedAmount: exp.plannedAmount,
        actualAmount: 0,
        depositPaid: 0,
        paymentStatus: 'planned',
        vendorName: '',
        isAiEstimate: true,
        notes: exp.notes,
      }));

      const newTasks: TimelineTask[] = apiRes.calculatedMilestones.map((m, idx) => ({
        id: `${newEventId}_task_${idx}`,
        eventId: newEventId,
        ownerId,
        title: m.title,
        description: m.description,
        stage: m.stage,
        priority: m.priority,
        dueDate: m.dueDate,
        status: 'todo',
        assigneeName: ownerName,
        dependsOnTaskId: '',
        reminderEnabled: true,
      }));

      const newVendors: VendorRecord[] = apiRes.calculatedVendors.map((v, idx) => ({
        id: `${newEventId}_ven_${idx}`,
        eventId: newEventId,
        ownerId,
        name: v.name,
        category: v.category,
        city: input.city,
        sourceType: 'ai_suggestion',
        contactInfo: '',
        estimatedCost: v.estimatedCost,
        quotedAmount: 0,
        depositPaid: 0,
        bookingStatus: 'shortlisted',
        paymentStatus: 'unpaid',
        userRating: 4.5,
        priorityLevel: v.priorityLevel,
        notes: v.notes,
      }));

      if (isDemoMode) {
        setDemoStore((prev) => ({
          events: [newEvent, ...prev.events],
          expensesByEvent: { ...prev.expensesByEvent, [newEventId]: newExpenses },
          tasksByEvent: { ...prev.tasksByEvent, [newEventId]: newTasks },
          vendorsByEvent: { ...prev.vendorsByEvent, [newEventId]: newVendors },
          guestsByEvent: { ...prev.guestsByEvent, [newEventId]: [] },
          collaboratorsByEvent: { ...prev.collaboratorsByEvent, [newEventId]: [] },
        }));
      } else {
        await saveEventPlanToFirestore(newEvent);
        for (const exp of newExpenses) {
          await createSubcollectionRecord(newEventId, 'expenses', exp.id, exp);
        }
        for (const t of newTasks) {
          await createSubcollectionRecord(newEventId, 'tasks', t.id, t);
        }
        for (const v of newVendors) {
          await createSubcollectionRecord(newEventId, 'vendors', v.id, v);
        }
      }

      setSelectedEventId(newEventId);
      setShowCreateWizard(false);
      setShowMyEventsPortfolio(false);
      setActiveTab('overview');
    } catch (err: unknown) {
      setBannerError(
        err instanceof Error ? err.message : 'Failed to generate AI event blueprint.'
      );
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  const handleDeleteCurrentEvent = async (targetId?: string) => {
    const idToDelete = targetId || activeEvent?.id;
    if (!idToDelete) return;

    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== idToDelete),
      }));
      if (selectedEventId === idToDelete) {
        setSelectedEventId(null);
      }
      return;
    }

    await deleteEventPlanFromFirestore(idToDelete);
  };

  // Subcollection Mutation Handlers
  const handleUpdateStatus = async (status: EventStatus) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        events: prev.events.map((e) => (e.id === activeEvent.id ? { ...e, status } : e)),
      }));
    } else {
      await updateEventPlanInFirestore(activeEvent.id, { status });
    }
  };

  const handleUpdateTotalBudget = async (newTotal: number, rebalance: boolean) => {
    if (!activeEvent) return;
    const rebalanced = rebalance
      ? recalculateAllocationsForNewTotal(newTotal, activeExpenses)
      : activeExpenses;

    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === activeEvent.id ? { ...e, totalBudget: newTotal } : e
        ),
        expensesByEvent: {
          ...prev.expensesByEvent,
          [activeEvent.id]: rebalanced,
        },
      }));
    } else {
      await updateEventPlanInFirestore(activeEvent.id, { totalBudget: newTotal });
      if (rebalance) {
        for (const exp of rebalanced) {
          await updateSubcollectionRecord(activeEvent.id, 'expenses', exp.id, {
            allocatedAmount: exp.allocatedAmount,
            plannedAmount: exp.plannedAmount,
          });
        }
      }
    }
  };

  const handleAddExpense = async (
    item: Omit<ExpenseItem, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!activeEvent) return;
    const newItem: ExpenseItem = {
      ...item,
      id: `exp_${Date.now()}`,
      eventId: activeEvent.id,
      ownerId: activeEvent.ownerId,
    };
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        expensesByEvent: {
          ...prev.expensesByEvent,
          [activeEvent.id]: [...(prev.expensesByEvent[activeEvent.id] || []), newItem],
        },
      }));
    } else {
      await createSubcollectionRecord(activeEvent.id, 'expenses', newItem.id, newItem);
    }
  };

  const handleUpdateExpense = async (id: string, updates: Partial<ExpenseItem>) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        expensesByEvent: {
          ...prev.expensesByEvent,
          [activeEvent.id]: (prev.expensesByEvent[activeEvent.id] || []).map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        },
      }));
    } else {
      await updateSubcollectionRecord(activeEvent.id, 'expenses', id, updates);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        expensesByEvent: {
          ...prev.expensesByEvent,
          [activeEvent.id]: (prev.expensesByEvent[activeEvent.id] || []).filter(
            (e) => e.id !== id
          ),
        },
      }));
    } else {
      await deleteSubcollectionRecord(activeEvent.id, 'expenses', id);
    }
  };

  const handleAddTask = async (
    task: Omit<TimelineTask, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!activeEvent) return;
    const newTask: TimelineTask = {
      ...task,
      id: `task_${Date.now()}`,
      eventId: activeEvent.id,
      ownerId: activeEvent.ownerId,
    };
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        tasksByEvent: {
          ...prev.tasksByEvent,
          [activeEvent.id]: [...(prev.tasksByEvent[activeEvent.id] || []), newTask],
        },
      }));
    } else {
      await createSubcollectionRecord(activeEvent.id, 'tasks', newTask.id, newTask);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<TimelineTask>) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        tasksByEvent: {
          ...prev.tasksByEvent,
          [activeEvent.id]: (prev.tasksByEvent[activeEvent.id] || []).map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        },
      }));
    } else {
      await updateSubcollectionRecord(activeEvent.id, 'tasks', id, updates);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        tasksByEvent: {
          ...prev.tasksByEvent,
          [activeEvent.id]: (prev.tasksByEvent[activeEvent.id] || []).filter(
            (t) => t.id !== id
          ),
        },
      }));
    } else {
      await deleteSubcollectionRecord(activeEvent.id, 'tasks', id);
    }
  };

  const handleAddVendor = async (
    vendor: Omit<VendorRecord, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!activeEvent) return;
    const newVendor: VendorRecord = {
      ...vendor,
      id: `ven_${Date.now()}`,
      eventId: activeEvent.id,
      ownerId: activeEvent.ownerId,
    };
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        vendorsByEvent: {
          ...prev.vendorsByEvent,
          [activeEvent.id]: [...(prev.vendorsByEvent[activeEvent.id] || []), newVendor],
        },
      }));
    } else {
      await createSubcollectionRecord(activeEvent.id, 'vendors', newVendor.id, newVendor);
    }
  };

  const handleUpdateVendor = async (id: string, updates: Partial<VendorRecord>) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        vendorsByEvent: {
          ...prev.vendorsByEvent,
          [activeEvent.id]: (prev.vendorsByEvent[activeEvent.id] || []).map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        },
      }));
    } else {
      await updateSubcollectionRecord(activeEvent.id, 'vendors', id, updates);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        vendorsByEvent: {
          ...prev.vendorsByEvent,
          [activeEvent.id]: (prev.vendorsByEvent[activeEvent.id] || []).filter(
            (v) => v.id !== id
          ),
        },
      }));
    } else {
      await deleteSubcollectionRecord(activeEvent.id, 'vendors', id);
    }
  };

  const handleAddGuest = async (
    guest: Omit<GuestRecord, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!activeEvent) return;
    const newGuest: GuestRecord = {
      ...guest,
      id: `gst_${Date.now()}`,
      eventId: activeEvent.id,
      ownerId: activeEvent.ownerId,
    };
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        guestsByEvent: {
          ...prev.guestsByEvent,
          [activeEvent.id]: [...(prev.guestsByEvent[activeEvent.id] || []), newGuest],
        },
      }));
    } else {
      await createSubcollectionRecord(activeEvent.id, 'guests', newGuest.id, newGuest);
    }
  };

  const handleUpdateGuest = async (id: string, updates: Partial<GuestRecord>) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        guestsByEvent: {
          ...prev.guestsByEvent,
          [activeEvent.id]: (prev.guestsByEvent[activeEvent.id] || []).map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        },
      }));
    } else {
      await updateSubcollectionRecord(activeEvent.id, 'guests', id, updates);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!activeEvent) return;
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        guestsByEvent: {
          ...prev.guestsByEvent,
          [activeEvent.id]: (prev.guestsByEvent[activeEvent.id] || []).filter(
            (g) => g.id !== id
          ),
        },
      }));
    } else {
      await deleteSubcollectionRecord(activeEvent.id, 'guests', id);
    }
  };

  const handleInviteCollaborator = async (invite: {
    userId: string;
    email: string;
    displayName: string;
    role: CollaboratorRole;
  }) => {
    if (!activeEvent) return;
    const nextCollaboratorIds = Array.from(
      new Set([...(activeEvent.collaboratorIds ?? []), invite.userId])
    ).slice(0, 50);

    const record: CollaboratorRecord = {
      userId: invite.userId,
      eventId: activeEvent.id,
      ownerId: activeEvent.ownerId,
      email: invite.email,
      displayName: invite.displayName,
      role: invite.role,
      status: 'active',
      collaboratorIds: nextCollaboratorIds,
    };

    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        events: prev.events.map((ev) =>
          ev.id === activeEvent.id ? { ...ev, collaboratorIds: nextCollaboratorIds } : ev
        ),
        collaboratorsByEvent: {
          ...prev.collaboratorsByEvent,
          [activeEvent.id]: [
            ...(prev.collaboratorsByEvent[activeEvent.id] || []).filter(
              (c) => c.userId !== invite.userId
            ),
            record,
          ],
        },
      }));
    } else {
      const alreadyExists = activeCollaborators.some((c) => c.userId === invite.userId);
      if (alreadyExists) {
        await updateSubcollectionRecord(activeEvent.id, 'collaborators', invite.userId, {
          displayName: invite.displayName,
          role: invite.role,
          status: 'active',
          collaboratorIds: nextCollaboratorIds,
        });
      } else {
        await createSubcollectionRecord(
          activeEvent.id,
          'collaborators',
          invite.userId,
          record
        );
      }
      await updateEventPlanInFirestore(activeEvent.id, {
        collaboratorIds: nextCollaboratorIds,
      });
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!activeEvent) return;
    const nextCollaboratorIds = (activeEvent.collaboratorIds ?? []).filter(
      (id) => id !== userId
    );
    if (isDemoMode) {
      setDemoStore((prev) => ({
        ...prev,
        events: prev.events.map((ev) =>
          ev.id === activeEvent.id ? { ...ev, collaboratorIds: nextCollaboratorIds } : ev
        ),
        collaboratorsByEvent: {
          ...prev.collaboratorsByEvent,
          [activeEvent.id]: (prev.collaboratorsByEvent[activeEvent.id] || []).filter(
            (c) => c.userId !== userId
          ),
        },
      }));
    } else {
      await deleteSubcollectionRecord(activeEvent.id, 'collaborators', userId);
      await updateEventPlanInFirestore(activeEvent.id, {
        collaboratorIds: nextCollaboratorIds,
      });
    }
  };

  // Copilot Function Execution Dispatcher
  const handleExecuteCopilotAction = async (action: CopilotProposedAction) => {
    if (!activeEvent) return;
    const args = action.arguments || {};

    if (
      action.functionName === 'update_event_budget' ||
      action.functionName === 'rebalance_category_allocations'
    ) {
      const nextBudget = Number(
        args.newTotalBudget ?? args.targetBudget ?? activeEvent.totalBudget
      );
      if (!isNaN(nextBudget) && nextBudget >= 1000) {
        await handleUpdateTotalBudget(nextBudget, true);
      }
    } else if (action.functionName === 'update_guest_count') {
      const nextCount = Number(args.newGuestCount ?? activeEvent.guestCount);
      if (!isNaN(nextCount) && nextCount >= 1) {
        if (isDemoMode) {
          setDemoStore((prev) => ({
            ...prev,
            events: prev.events.map((e) =>
              e.id === activeEvent.id ? { ...e, guestCount: nextCount } : e
            ),
          }));
        } else {
          await updateEventPlanInFirestore(activeEvent.id, { guestCount: nextCount });
        }
      }
    } else if (action.functionName === 'add_timeline_task') {
      await handleAddTask({
        title: String(args.title || 'AI Proposed Milestone'),
        description: String(args.description || ''),
        stage: (args.stage as TimelineStage) || '1-2 Months Out',
        priority: (args.priority as TaskPriority) || 'high',
        dueDate: String(args.dueDate || activeEvent.startDate),
        status: 'todo',
        assigneeName: 'Event Organizer',
        dependsOnTaskId: '',
        reminderEnabled: true,
      });
    } else if (action.functionName === 'move_task_deadline') {
      const keyword = String(args.taskTitleKeyword || '').toLowerCase();
      const target = activeTasks.find((t) => t.title.toLowerCase().includes(keyword));
      if (target && args.newDueDate) {
        await handleUpdateTask(target.id, { dueDate: String(args.newDueDate) });
      }
    } else if (action.functionName === 'add_expense_item') {
      const alloc = Number(args.allocatedAmount || 25000);
      await handleAddExpense({
        category: (args.category as ExpenseCategory) || 'Miscellaneous',
        title: String(args.title || 'AI Proposed Expense'),
        allocatedAmount: alloc,
        plannedAmount: Number(args.plannedAmount ?? alloc),
        actualAmount: 0,
        depositPaid: 0,
        paymentStatus: 'planned',
        vendorName: '',
        isAiEstimate: true,
        notes: String(args.notes || 'Added via Gatherly AI Copilot'),
      });
    } else if (action.functionName === 'add_vendor_suggestion') {
      await handleAddVendor({
        name: String(args.name || 'Recommended Specialist'),
        category: (args.category as VendorCategory) || 'Decorators',
        city: activeEvent.city,
        sourceType: 'ai_suggestion',
        contactInfo: '',
        estimatedCost: Number(args.estimatedCost || 50000),
        quotedAmount: 0,
        depositPaid: 0,
        bookingStatus: 'shortlisted',
        paymentStatus: 'unpaid',
        userRating: 4.5,
        priorityLevel: (args.priorityLevel as VendorPriorityLevel) || 'high',
        notes: String(args.notes || 'AI Suggested Vendor'),
      });
    }
  };

  // Unauthenticated Landing Page View
  if (!user && !isDemoMode) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        onEnterDemo={handleEnterDemo}
        isSigningIn={isSigningIn}
      />
    );
  }

  const CEREMONIAL_SUITE_ITEMS = [
    {
      id: 'overview',
      label: 'Overview / Command',
      materialIcon: 'dashboard',
      active: !showMyEventsPortfolio && activeTab === 'overview',
      onClick: () => {
        setShowMyEventsPortfolio(false);
        setActiveTab('overview');
        setMobileSidebarOpen(false);
      },
    },
    {
      id: 'my-events',
      label: 'My Events',
      materialIcon: 'celebration',
      active: showMyEventsPortfolio,
      badge: activeEvents.length,
      onClick: () => {
        setShowMyEventsPortfolio(true);
        setMobileSidebarOpen(false);
      },
    },
    {
      id: 'budget',
      label: 'Budget & Escrow Ledger',
      materialIcon: 'account_balance_wallet',
      active: !showMyEventsPortfolio && activeTab === 'budget',
      onClick: () => {
        setShowMyEventsPortfolio(false);
        setActiveTab('budget');
        setMobileSidebarOpen(false);
      },
    },
    {
      id: 'timeline',
      label: 'Run-of-Show Timelines',
      materialIcon: 'schedule',
      active: !showMyEventsPortfolio && activeTab === 'timeline',
      badge: activeTasks.length,
      onClick: () => {
        setShowMyEventsPortfolio(false);
        setActiveTab('timeline');
        setMobileSidebarOpen(false);
      },
    },
    {
      id: 'vendors',
      label: 'Curated Vendors & Riders',
      materialIcon: 'storefront',
      active: !showMyEventsPortfolio && activeTab === 'vendors',
      badge: activeVendors.length,
      onClick: () => {
        setShowMyEventsPortfolio(false);
        setActiveTab('vendors');
        setMobileSidebarOpen(false);
      },
    },
    {
      id: 'guests',
      label: 'Royal Guests & RSVP Hub',
      materialIcon: 'groups',
      active: !showMyEventsPortfolio && activeTab === 'guests',
      badge: activeGuests.reduce((s, g) => s + 1 + g.plusOneCount, 0),
      onClick: () => {
        setShowMyEventsPortfolio(false);
        setActiveTab('guests');
        setMobileSidebarOpen(false);
      },
    },
  ];

  const INTELLIGENCE_ITEMS = [
    {
      id: 'copilot',
      label: 'Gemini Copilot',
      materialIcon: 'auto_awesome',
      active: !showMyEventsPortfolio && activeTab === 'copilot',
      isLive: true,
      onClick: () => {
        setShowMyEventsPortfolio(false);
        setActiveTab('copilot');
        setMobileSidebarOpen(false);
      },
    },
    {
      id: 'settings',
      label: 'Settings & Access',
      materialIcon: 'tune',
      active: !showMyEventsPortfolio && activeTab === 'collaborate',
      onClick: () => {
        setShowMyEventsPortfolio(false);
        setActiveTab('collaborate');
        setMobileSidebarOpen(false);
      },
    },
  ];

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerSearchQuery.trim().toLowerCase();
    if (!q) return;
    if (q.includes('budget') || q.includes('escrow') || q.includes('ledger') || q.includes('₹')) {
      setShowMyEventsPortfolio(false);
      setActiveTab('budget');
    } else if (q.includes('time') || q.includes('muhurat') || q.includes('task')) {
      setShowMyEventsPortfolio(false);
      setActiveTab('timeline');
    } else if (q.includes('vendor') || q.includes('cater') || q.includes('decor')) {
      setShowMyEventsPortfolio(false);
      setActiveTab('vendors');
    } else if (q.includes('guest') || q.includes('rsvp') || q.includes('vip')) {
      setShowMyEventsPortfolio(false);
      setActiveTab('guests');
    } else if (q.includes('ai') || q.includes('copilot') || q.includes('gemini')) {
      setShowMyEventsPortfolio(false);
      setActiveTab('copilot');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F4] text-[#1E1B18] flex antialiased selection:bg-[#FFDAD2] selection:text-[#3D0600]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#98341D] focus:text-white focus:font-bold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          role="presentation"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#1E1B18]/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ==================================================
          1. STITCH WARM LUXURY EDITORIAL SIDEBAR (w-72 bg-[#FAF2ED])
      ================================================== */}
      <aside
        aria-label="Workspace sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#FAF2ED] border-r border-[#DEC0B9]/25 flex flex-col justify-between shrink-0 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand & Navigation */}
        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#98341D] flex items-center justify-center text-white shadow-sm">
                <span className="font-serif text-xl italic">G</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-xl tracking-tight text-[#1E1B18]">
                    Gatherly
                  </span>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#FFDAD2] text-[#3D0600] font-bold">
                    AI
                  </span>
                </div>
                <p className="text-xs text-[#57423D]">Editorial Event Intelligence</p>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-full text-[#57423D] hover:bg-[#EEE7E2]"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Primary Navigation */}
          <nav aria-label="Primary navigation" className="space-y-1.5">
            <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-[#8A716C] mb-2">
              Ceremonial Suite
            </p>
            {CEREMONIAL_SUITE_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                aria-current={item.active ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  item.active
                    ? 'bg-[#FFFFFF] text-[#98341D] shadow-xs font-semibold border border-[#DEC0B9]/30'
                    : 'text-[#57423D] hover:bg-[#EEE7E2]/60 hover:text-[#1E1B18] font-medium'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      item.active ? 'text-[#98341D]' : 'text-[#7F525D]'
                    }`}
                  >
                    {item.materialIcon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      item.active
                        ? 'bg-[#FFDAD2] text-[#3D0600]'
                        : 'bg-[#FFD9E1] text-[#32101B]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            <div className="pt-4">
              <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-[#8A716C] mb-2">
                Intelligence
              </p>
              {INTELLIGENCE_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  aria-current={item.active ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                    item.active
                      ? 'bg-[#FFFFFF] text-[#98341D] shadow-xs font-semibold border border-[#DEC0B9]/30'
                      : 'text-[#57423D] hover:bg-[#EEE7E2]/60 hover:text-[#1E1B18] font-medium'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-[#7F525D]">
                      {item.materialIcon}
                    </span>
                    <span>{item.label}</span>
                  </span>
                  {item.isLive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D9E7CF] text-[#141E10] text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4C5946] animate-pulse"></span>
                      Live
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Active Celebrations Quick Switcher */}
          {activeEvents.length > 0 && (
            <div className="pt-3 border-t border-[#DEC0B9]/30 space-y-2">
              <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-[#8A716C]">
                Active Celebrations
              </p>
              <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                {activeEvents.map((ev) => {
                  const isSelected = activeEvent?.id === ev.id && !showMyEventsPortfolio;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => {
                        setSelectedEventId(ev.id);
                        setShowMyEventsPortfolio(false);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-[#FFFFFF] text-[#1E1B18] font-semibold shadow-2xs border border-[#DEC0B9]/40'
                          : 'text-[#57423D] hover:bg-[#EEE7E2]/60 hover:text-[#1E1B18]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? 'bg-[#98341D]' : 'bg-[#8A716C]/50'
                        }`}
                      />
                      <span className="truncate">{ev.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Portfolio Summary & User Profile Card */}
        <div className="p-5 space-y-3 border-t border-[#DEC0B9]/25">
          <div className="p-4 rounded-xl bg-[#F4ECE7] space-y-2.5 border border-[#DEC0B9]/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7F525D]">
                Portfolio Scope
              </span>
              <span className="material-symbols-outlined text-sm text-[#7F525D]">verified</span>
            </div>
            <p className="font-serif text-lg text-[#1E1B18] leading-snug">
              {activeEvents.length} Active Celebrations
            </p>
            <p className="text-xs text-[#57423D]">
              Total Escrowed:{' '}
              <strong className="text-[#1E1B18] font-currency-numeral">
                {formatCurrency(totalPortfolioBudget, 'INR')}
              </strong>
            </p>
            <div className="w-full bg-[#E8E1DC] rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#98341D] h-1.5 rounded-full" style={{ width: '88%' }}></div>
            </div>
            <button
              onClick={() => setShowMyEventsPortfolio(true)}
              className="text-xs font-semibold text-[#98341D] hover:underline flex items-center gap-1 pt-0.5 cursor-pointer"
            >
              <span>Audit All Celebration Ledgers</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {isDemoMode ? (
            <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DEC0B9]/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#98341D]">Interactive Demo Suite</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FFDAD2] text-[#3D0600]">
                  Live Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignIn}
                  className="flex-1 py-2 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign In with Google
                </button>
                <button
                  onClick={() => setIsDemoMode(false)}
                  className="py-2 px-3 rounded-full bg-[#F4ECE7] hover:bg-[#E8E1DC] text-[#57423D] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Home
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#7F525D] text-white flex items-center justify-center font-serif text-sm shrink-0">
                  {(user?.displayName || user?.email || 'G').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#1E1B18] truncate">
                    {user?.displayName || 'Principal Planner'}
                  </div>
                  <div className="text-[11px] text-[#57423D] truncate">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={() => signOutUser()}
                className="p-2 rounded-full text-[#57423D] hover:text-[#98341D] hover:bg-[#EEE7E2] transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ==================================================
          2. MAIN EXECUTIVE CANVAS
      ================================================== */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Utility & Context Header */}
        <header className="sticky top-0 z-30 h-20 bg-[#FFF8F4]/85 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between gap-4 border-b border-[#DEC0B9]/20">
          {/* Left: Mobile Drawer Button + Search / Active Celebration Selector */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-full bg-[#FAF2ED] border border-[#DEC0B9]/40 flex items-center justify-center text-[#1E1B18]"
              aria-label="Open Navigation"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            {activeEvent && !showMyEventsPortfolio && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FAF2ED] border border-[#DEC0B9]/40 shrink-0 max-w-[220px] sm:max-w-[280px]">
                <span className="material-symbols-outlined text-[#7F525D] text-[18px] shrink-0">
                  celebration
                </span>
                <select
                  aria-label="Select Active Celebration"
                  value={activeEvent.id}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setShowMyEventsPortfolio(false);
                  }}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-[#1E1B18] focus:outline-none truncate cursor-pointer"
                >
                  {activeEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} • {ev.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleHeaderSearchSubmit} className="hidden md:block relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8A716C] text-[20px]">
                search
              </span>
              <input
                type="text"
                aria-label="Search celebrations, vendors, Muhurat cues, or ledger items"
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                placeholder="Search celebrations, vendors, Muhurat cues, or ledger items..."
                className="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#FAF2ED] text-sm text-[#1E1B18] placeholder:text-[#8A716C] focus:outline-none focus:ring-2 focus:ring-[#98341D]/30 transition-all"
              />
            </form>
          </div>

          {/* Right: Currency Indicator, Copilot Shortcut & New Celebration CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF2ED] border border-[#DEC0B9]/30">
              <span className="font-currency-numeral text-sm text-[#98341D] font-bold">₹</span>
              <span className="text-xs text-[#1E1B18] font-semibold">INR (Lakhs / Cr)</span>
              <span className="w-2 h-2 rounded-full bg-[#4C5946]"></span>
            </div>

            <button
              onClick={() => {
                setShowMyEventsPortfolio(false);
                setActiveTab('copilot');
              }}
              className="relative w-10 h-10 rounded-full bg-[#FAF2ED] hover:bg-[#EEE7E2] flex items-center justify-center text-[#57423D] transition-colors cursor-pointer"
              title="Open Gemini Copilot"
              aria-label="Open Gemini Copilot"
            >
              <span className="material-symbols-outlined text-[20px] text-[#98341D]">
                auto_awesome
              </span>
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#98341D]"></span>
            </button>

            <button
              onClick={() => setShowCreateWizard(true)}
              className="px-5 py-2.5 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Celebration</span>
            </button>
          </div>
        </header>

        {user && !user.emailVerified && !isDemoMode && (
          <div
            role="status"
            aria-live="polite"
            className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-[#FAF2ED] border border-[#C6A364]/60 text-xs text-[#282522] flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <span className="font-bold text-[#98341D]">Email Verification Required: </span>
              <span>
                Your account email ({user.email}) is not yet verified. Cloud Firestore security
                rules require a verified email before saving changes.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await sendVerificationEmailToCurrentUser();
                    setBannerError('Verification email sent. Please check your inbox.');
                  } catch (err: unknown) {
                    setBannerError(
                      err instanceof Error ? err.message : 'Unable to send verification email.'
                    );
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#98341D] text-white font-semibold cursor-pointer"
              >
                Send Verification Email
              </button>
              <button
                type="button"
                onClick={async () => {
                  await user.reload();
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#DEC0B9] text-[#282522] font-semibold cursor-pointer"
              >
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {bannerError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs font-semibold text-[#93000A] flex items-center justify-between"
          >
            <span>{bannerError}</span>
            <button
              type="button"
              aria-label="Dismiss alert"
              onClick={() => setBannerError(null)}
              className="cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-8">
          {showMyEventsPortfolio ? (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DEC0B9]/30 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 text-[#98341D] text-xs font-bold uppercase tracking-widest mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#98341D]"></span>
                    <span>Celebration Portfolio</span>
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl text-[#1E1B18]">
                    My Planned Celebrations ({activeEvents.length})
                  </h1>
                </div>
                <button
                  onClick={() => setShowCreateWizard(true)}
                  className="px-5 py-2.5 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Architect New Celebration</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="group bg-[#FFFFFF] rounded-2xl border border-[#DEC0B9]/35 overflow-hidden shadow-xs hover:shadow-luxury transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-52">
                        <EditorialScene
                          scene={mapCategoryToScene(ev.category)}
                          className="w-full h-full"
                          alt={ev.name}
                          overlayTitle={ev.name}
                          overlaySubtitle={`${ev.city} • ${formatIndianDate(ev.startDate)}`}
                        />
                        <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#1E1B18]/80 backdrop-blur-md text-[#FFF8F4] text-[10px] font-bold uppercase tracking-wider">
                          {ev.status}
                        </span>
                      </div>
                      <div className="p-6 space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#57423D] font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#98341D]">
                              location_on
                            </span>
                            {ev.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#98341D]">
                              calendar_month
                            </span>
                            {formatIndianDate(ev.startDate)}
                          </span>
                          <span>{ev.guestCount} Pax</span>
                        </div>
                        {ev.aiOverview && (
                          <p className="text-xs text-[#57423D] line-clamp-2 leading-relaxed">
                            {ev.aiOverview}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-[#FAF2ED] border-t border-[#DEC0B9]/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#8A716C] block font-bold">
                          Committed Treasury
                        </span>
                        <span className="font-currency-numeral text-sm font-bold text-[#1E1B18]">
                          {formatCurrency(ev.totalBudget, ev.currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteCurrentEvent(ev.id)}
                          className="p-2 rounded-full text-[#8A716C] hover:text-[#BA1A1A] hover:bg-[#FFDAD6]/50 transition-colors cursor-pointer"
                          title="Delete Celebration"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEventId(ev.id);
                            setShowMyEventsPortfolio(false);
                            setActiveTab('overview');
                          }}
                          className="px-4 py-2 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Open Command
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !activeEvent ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#DEC0B9]/40 overflow-hidden shadow-luxury max-w-3xl mx-auto my-8">
              <EditorialScene
                scene="wedding"
                className="w-full h-64"
                alt="Gatherly AI Studio"
                overlayTitle="Welcome to Your Gatherly AI Command Suite"
                overlaySubtitle="Every Occasion. Thoughtfully Planned."
              />
              <div className="p-8 text-center space-y-5">
                <h2 className="font-serif text-3xl text-[#1E1B18]">
                  Ready to architect your first celebration?
                </h2>
                <p className="text-sm text-[#57423D] max-w-lg mx-auto leading-relaxed">
                  Tell Gemini about your wedding, milestone birthday, festival, or community
                  gathering to generate a complete INR escrow ledger, Muhurat timeline, and curated
                  vendor shortlist.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateWizard(true)}
                    className="px-6 py-3 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    <span>Create First AI Event Plan</span>
                  </button>
                  <button
                    onClick={() => handleEnterDemo(MUMBAI_WEDDING_DEMO_EVENT_ID)}
                    className="px-5 py-3 rounded-full bg-[#FAF2ED] hover:bg-[#EEE7E2] border border-[#DEC0B9]/50 text-sm font-semibold text-[#1E1B18] cursor-pointer"
                  >
                    Load Royal Wedding Demo (₹12L)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stitch Editorial Sub-Navigation Ribbon */}
              <div className="flex items-center justify-between gap-4 border-b border-[#DEC0B9]/30 pb-3 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'overview' as const, label: 'Executive Command', icon: 'dashboard' },
                    {
                      id: 'budget' as const,
                      label: 'Budget & Escrow Ledger',
                      icon: 'account_balance_wallet',
                    },
                    { id: 'timeline' as const, label: 'Muhurat & Timelines', icon: 'schedule' },
                    { id: 'vendors' as const, label: 'Curated Vendors', icon: 'storefront' },
                    { id: 'guests' as const, label: 'Royal Guests & RSVPs', icon: 'groups' },
                    { id: 'copilot' as const, label: 'Gemini Copilot', icon: 'auto_awesome' },
                    { id: 'collaborate' as const, label: 'Team & Access', icon: 'tune' },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-[#7F525D] text-white shadow-xs'
                            : 'bg-[#FAF2ED] text-[#57423D] hover:bg-[#EEE7E2] hover:text-[#1E1B18]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Suspense
                fallback={
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-10 rounded-2xl bg-white border border-[#DEC0B9]/30 text-center text-xs font-semibold text-[#57423D]"
                  >
                    Loading celebration workspace module...
                  </div>
                }
              >
                {activeTab === 'overview' && (
                  <EventOverviewPanel
                    event={activeEvent}
                    budgetSummary={budgetSummary}
                    expenses={activeExpenses}
                    tasks={activeTasks}
                    vendors={activeVendors}
                    guests={activeGuests}
                    insights={smartInsights}
                    canEdit={canEditActiveEvent}
                    onUpdateStatus={handleUpdateStatus}
                    onNavigateTab={(t) => setActiveTab(t)}
                  />
                )}

                {activeTab === 'budget' && (
                  <BudgetManager
                    event={activeEvent}
                    budgetSummary={budgetSummary}
                    expenses={activeExpenses}
                    canEdit={canEditActiveEvent}
                    onAddExpense={handleAddExpense}
                    onUpdateExpense={handleUpdateExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onUpdateTotalBudget={handleUpdateTotalBudget}
                  />
                )}

                {activeTab === 'timeline' && (
                  <TimelineManager
                    tasks={activeTasks}
                    canEdit={canEditActiveEvent}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )}

                {activeTab === 'vendors' && (
                  <VendorManager
                    event={activeEvent}
                    vendors={activeVendors}
                    canEdit={canEditActiveEvent}
                    onAddVendor={handleAddVendor}
                    onUpdateVendor={handleUpdateVendor}
                    onDeleteVendor={handleDeleteVendor}
                  />
                )}

                {activeTab === 'guests' && (
                  <GuestManager
                    targetGuestCount={activeEvent.guestCount}
                    guests={activeGuests}
                    canEdit={canEditActiveEvent}
                    onAddGuest={handleAddGuest}
                    onUpdateGuest={handleUpdateGuest}
                    onDeleteGuest={handleDeleteGuest}
                  />
                )}

                {activeTab === 'copilot' && (
                  <CopilotPanel
                    event={activeEvent}
                    budgetSummary={budgetSummary}
                    expenses={activeExpenses}
                    tasks={activeTasks}
                    vendors={activeVendors}
                    canEdit={canEditActiveEvent}
                    onExecuteAction={handleExecuteCopilotAction}
                  />
                )}

                {activeTab === 'collaborate' && (
                  <CollaborationPanel
                    event={activeEvent}
                    collaborators={activeCollaborators}
                    currentUserUid={currentUserUid}
                    currentUserEmail={currentUserEmail}
                    onInviteCollaborator={handleInviteCollaborator}
                    onRemoveCollaborator={handleRemoveCollaborator}
                  />
                )}
              </Suspense>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (from Stitch Mobile Shell) */}
        <nav
          aria-label="Mobile bottom navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F4]/95 backdrop-blur-xl border-t border-[#DEC0B9]/30 shadow-[0_-2px_12px_rgba(40,37,34,0.05)]"
        >
          <div className="flex items-center justify-around h-16 px-2">
            {[
              { id: 'overview' as const, label: 'Command', icon: 'dashboard' },
              { id: 'budget' as const, label: 'Ledger', icon: 'account_balance_wallet' },
              { id: 'timeline' as const, label: 'Timelines', icon: 'schedule' },
              { id: 'vendors' as const, label: 'Vendors', icon: 'storefront' },
              { id: 'copilot' as const, label: 'Copilot', icon: 'auto_awesome', badge: 'AI' },
            ].map((nav) => {
              const isCurrent = !showMyEventsPortfolio && activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => {
                    setShowMyEventsPortfolio(false);
                    setActiveTab(nav.id);
                  }}
                  className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors cursor-pointer ${
                    isCurrent ? 'text-[#98341D] font-bold' : 'text-[#57423D]'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">{nav.icon}</span>
                    {nav.badge && (
                      <span className="absolute -top-1 -right-2.5 px-1 rounded-full bg-[#98341D] text-white text-[9px] font-bold">
                        {nav.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] mt-0.5">{nav.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {showCreateWizard && (
        <Suspense fallback={null}>
          <EventCreationWizard
            onSubmit={handleCreateEvent}
            onCancel={() => setShowCreateWizard(false)}
            isGenerating={isGeneratingBlueprint}
          />
        </Suspense>
      )}
    </div>
  );
}
