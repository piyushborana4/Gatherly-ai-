export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';
export type LocaleCode = 'en-IN' | 'en-US' | 'en-GB';

export type EventCategory =
  | 'wedding'
  | 'birthday'
  | 'community'
  | 'college'
  | 'festival'
  | 'custom';

export type EventStatus = 'draft' | 'active' | 'completed' | 'archived';

export type ExpenseCategory =
  | 'Venue'
  | 'Catering'
  | 'Decoration'
  | 'Photography'
  | 'Entertainment'
  | 'Clothing'
  | 'Transportation'
  | 'Accommodation'
  | 'Invitations'
  | 'Miscellaneous';

export type PaymentStatus =
  | 'planned'
  | 'deposit_paid'
  | 'partially_paid'
  | 'paid'
  | 'cancelled';

export type TimelineStage =
  | '6+ Months Out'
  | '3-5 Months Out'
  | '1-2 Months Out'
  | '2-3 Weeks Out'
  | 'Event Week'
  | 'Event Day'
  | 'Post-Event';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked';

export type VendorCategory =
  | 'Venues'
  | 'Caterers'
  | 'Photographers'
  | 'Decorators'
  | 'Makeup Artists'
  | 'DJs & Entertainers'
  | 'Transportation'
  | 'Florists'
  | 'Invitation Designers';

export type VendorSourceType =
  | 'ai_suggestion'
  | 'demo_sample'
  | 'user_entered'
  | 'search_grounded';

export type VendorBookingStatus =
  | 'discovered'
  | 'shortlisted'
  | 'contacted'
  | 'quoted'
  | 'booked'
  | 'declined';

export type VendorPaymentStatus = 'unpaid' | 'deposit_paid' | 'paid';
export type VendorPriorityLevel = 'immediate' | 'high' | 'standard' | 'optional';

export type GuestGroup =
  | 'Bride Family'
  | 'Groom Family'
  | 'Close Friends'
  | 'Colleagues'
  | 'VIP & Elders'
  | 'Community & Neighbors'
  | 'General';

export type RsvpStatus =
  | 'invited'
  | 'confirmed'
  | 'declined'
  | 'tentative'
  | 'not_sent';

export type DietaryPreference =
  | 'Vegetarian'
  | 'Jain Vegetarian'
  | 'Vegan'
  | 'Non-Vegetarian'
  | 'Gluten-Free'
  | 'No Preference';

export type CollaboratorRole = 'editor' | 'viewer';
export type CollaboratorStatus = 'active' | 'revoked';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  preferredCurrency: CurrencyCode;
  preferredLocale: LocaleCode;
  defaultCity: string;
  dietaryDefault: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EventPlan {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  category: EventCategory;
  startDate: string;
  endDate: string;
  city: string;
  venuePreference: string;
  guestCount: number;
  totalBudget: number;
  currency: CurrencyCode;
  styleTheme: string;
  dietaryRequirements: string;
  culturalPreferences: string;
  accessibilityRequirements: string;
  additionalInstructions: string;
  status: EventStatus;
  aiOverview: string;
  aiStrategy: string;
  aiThemeIdeas: string;
  aiFoodSuggestions: string;
  aiEntertainmentIdeas: string;
  aiRiskPlan: string;
  aiGuestRecommendations: string;
  aiReminders: string;
  isDemo: boolean;
  collaboratorIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExpenseItem {
  id: string;
  eventId: string;
  ownerId: string;
  category: ExpenseCategory;
  title: string;
  allocatedAmount: number;
  plannedAmount: number;
  actualAmount: number;
  depositPaid: number;
  paymentStatus: PaymentStatus;
  vendorName: string;
  isAiEstimate: boolean;
  notes: string;
  collaboratorIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TimelineTask {
  id: string;
  eventId: string;
  ownerId: string;
  title: string;
  description: string;
  stage: TimelineStage;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  assigneeName: string;
  dependsOnTaskId: string;
  reminderEnabled: boolean;
  collaboratorIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VendorRecord {
  id: string;
  eventId: string;
  ownerId: string;
  name: string;
  category: VendorCategory;
  city: string;
  sourceType: VendorSourceType;
  contactInfo: string;
  estimatedCost: number;
  quotedAmount: number;
  depositPaid: number;
  bookingStatus: VendorBookingStatus;
  paymentStatus: VendorPaymentStatus;
  userRating: number;
  priorityLevel: VendorPriorityLevel;
  notes: string;
  collaboratorIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GuestRecord {
  id: string;
  eventId: string;
  ownerId: string;
  fullName: string;
  groupName: GuestGroup;
  contactPhoneOrEmail: string;
  rsvpStatus: RsvpStatus;
  invitationSent: boolean;
  dietaryPreference: DietaryPreference;
  plusOneCount: number;
  specialNotes: string;
  collaboratorIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CollaboratorRecord {
  userId: string;
  eventId: string;
  ownerId: string;
  email: string;
  displayName: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  collaboratorIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CategoryBudgetBreakdown {
  category: ExpenseCategory;
  allocated: number;
  planned: number;
  actual: number;
  depositPaid: number;
  pendingBalance: number;
  utilizationPercent: number;
  isOverrun: boolean;
  itemCount: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalAllocated: number;
  unallocatedBudget: number;
  totalPlanned: number;
  totalActual: number;
  totalDepositsPaid: number;
  totalPendingPayments: number;
  remainingFromActual: number;
  remainingFromCommitted: number;
  utilizationPercent: number;
  committedPercent: number;
  isOverAllocated: boolean;
  isOverSpent: boolean;
  isOverCommitted: boolean;
  perGuestBudget: number;
  perGuestActual: number;
  categoryBreakdowns: CategoryBudgetBreakdown[];
}

export interface SmartInsight {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  category: 'budget' | 'timeline' | 'vendors' | 'guests';
  title: string;
  metricLabel: string;
  description: string;
  suggestedAction: string;
  targetTab: 'overview' | 'budget' | 'timeline' | 'vendors' | 'guests' | 'copilot';
}

export type CopilotFunctionName =
  | 'update_event_budget'
  | 'update_guest_count'
  | 'add_timeline_task'
  | 'move_task_deadline'
  | 'add_expense_item'
  | 'add_vendor_suggestion'
  | 'rebalance_category_allocations';

export interface CopilotProposedAction {
  id: string;
  functionName: CopilotFunctionName;
  summary: string;
  requiresConfirmation: boolean;
  isFinancialOrDestructive: boolean;
  arguments: Record<string, unknown>;
  status: 'pending' | 'executed' | 'cancelled';
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  proposedActions?: CopilotProposedAction[];
  groundingSources?: { title: string; uri: string }[];
}
