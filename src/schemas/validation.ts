import { z } from 'zod';

export const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export const CurrencyEnum = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']);
export const LocaleEnum = z.enum(['en-IN', 'en-US', 'en-GB']);
export const EventCategoryEnum = z.enum([
  'wedding',
  'birthday',
  'community',
  'college',
  'festival',
  'custom',
]);
export const EventStatusEnum = z.enum(['draft', 'active', 'completed', 'archived']);

export const ExpenseCategoryEnum = z.enum([
  'Venue',
  'Catering',
  'Decoration',
  'Photography',
  'Entertainment',
  'Clothing',
  'Transportation',
  'Accommodation',
  'Invitations',
  'Miscellaneous',
]);

export const PaymentStatusEnum = z.enum([
  'planned',
  'deposit_paid',
  'partially_paid',
  'paid',
  'cancelled',
]);

export const TimelineStageEnum = z.enum([
  '6+ Months Out',
  '3-5 Months Out',
  '1-2 Months Out',
  '2-3 Weeks Out',
  'Event Week',
  'Event Day',
  'Post-Event',
]);

export const TaskPriorityEnum = z.enum(['critical', 'high', 'medium', 'low']);
export const TaskStatusEnum = z.enum(['todo', 'in_progress', 'completed', 'blocked']);

export const VendorCategoryEnum = z.enum([
  'Venues',
  'Caterers',
  'Photographers',
  'Decorators',
  'Makeup Artists',
  'DJs & Entertainers',
  'Transportation',
  'Florists',
  'Invitation Designers',
]);

export const VendorSourceTypeEnum = z.enum([
  'ai_suggestion',
  'demo_sample',
  'user_entered',
  'search_grounded',
]);

export const VendorBookingStatusEnum = z.enum([
  'discovered',
  'shortlisted',
  'contacted',
  'quoted',
  'booked',
  'declined',
]);

export const VendorPaymentStatusEnum = z.enum(['unpaid', 'deposit_paid', 'paid']);
export const VendorPriorityLevelEnum = z.enum([
  'immediate',
  'high',
  'standard',
  'optional',
]);

export const GuestGroupEnum = z.enum([
  'Bride Family',
  'Groom Family',
  'Close Friends',
  'Colleagues',
  'VIP & Elders',
  'Community & Neighbors',
  'General',
]);

export const RsvpStatusEnum = z.enum([
  'invited',
  'confirmed',
  'declined',
  'tentative',
  'not_sent',
]);

export const DietaryPreferenceEnum = z.enum([
  'Vegetarian',
  'Jain Vegetarian',
  'Vegan',
  'Non-Vegetarian',
  'Gluten-Free',
  'No Preference',
]);

export const CollaboratorRoleEnum = z.enum(['editor', 'viewer']);

export function isValidIsoCalendarDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const IsoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(isValidIsoCalendarDate, 'Date must be a valid calendar date');

export const EventWizardInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Event name must be at least 2 characters').max(140),
    category: EventCategoryEnum,
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    city: z.string().trim().min(2, 'City is required').max(100),
    venuePreference: z.string().trim().max(200).default(''),
    guestCount: z
      .number()
      .int('Guest count must be a whole number')
      .min(1, 'At least 1 guest is required')
      .max(50000, 'Guest count cannot exceed 50,000'),
    totalBudget: z
      .number()
      .min(0, 'Budget cannot be negative')
      .max(1000000000, 'Budget exceeds maximum supported limit'),
    currency: CurrencyEnum,
    styleTheme: z.string().trim().max(200).default('Modern Traditional'),
    dietaryRequirements: z.string().trim().max(200).default('Vegetarian'),
    culturalPreferences: z.string().trim().max(300).default(''),
    accessibilityRequirements: z.string().trim().max(300).default(''),
    additionalInstructions: z.string().trim().max(1000).default(''),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  });

export const ExpenseInputSchema = z.object({
  category: ExpenseCategoryEnum,
  title: z.string().trim().min(1, 'Expense title is required').max(160),
  allocatedAmount: z.number().min(0, 'Allocated amount cannot be negative').max(1000000000),
  plannedAmount: z.number().min(0, 'Planned amount cannot be negative').max(1000000000),
  actualAmount: z.number().min(0, 'Actual amount cannot be negative').max(1000000000),
  depositPaid: z.number().min(0, 'Deposit paid cannot be negative').max(1000000000),
  paymentStatus: PaymentStatusEnum,
  vendorName: z.string().trim().max(140).default(''),
  isAiEstimate: z.boolean().default(false),
  notes: z.string().trim().max(500).default(''),
});

export const TimelineTaskInputSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().trim().max(600).default(''),
  stage: TimelineStageEnum,
  priority: TaskPriorityEnum,
  dueDate: IsoDateSchema,
  status: TaskStatusEnum,
  assigneeName: z.string().trim().max(100).default('Event Organizer'),
  dependsOnTaskId: z.string().trim().max(128).default(''),
  reminderEnabled: z.boolean().default(true),
});

export const VendorInputSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name is required').max(140),
  category: VendorCategoryEnum,
  city: z.string().trim().max(100).default(''),
  sourceType: VendorSourceTypeEnum,
  contactInfo: z.string().trim().max(200).default(''),
  estimatedCost: z.number().min(0).max(1000000000),
  quotedAmount: z.number().min(0).max(1000000000),
  depositPaid: z.number().min(0).max(1000000000),
  bookingStatus: VendorBookingStatusEnum,
  paymentStatus: VendorPaymentStatusEnum,
  userRating: z.number().min(0).max(5),
  priorityLevel: VendorPriorityLevelEnum,
  notes: z.string().trim().max(600).default(''),
});

export const GuestInputSchema = z.object({
  fullName: z.string().trim().min(1, 'Guest name is required').max(120),
  groupName: GuestGroupEnum,
  contactPhoneOrEmail: z.string().trim().max(160).default(''),
  rsvpStatus: RsvpStatusEnum,
  invitationSent: z.boolean().default(false),
  dietaryPreference: DietaryPreferenceEnum,
  plusOneCount: z.number().int().min(0).max(20),
  specialNotes: z.string().trim().max(400).default(''),
});

export const CollaboratorInviteSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(1, 'Collaborator UID is required')
    .max(128)
    .regex(SAFE_ID_REGEX, 'Invalid user ID format'),
  email: z.string().trim().email('Valid email is required').max(254),
  displayName: z.string().trim().min(1, 'Name is required').max(100),
  role: CollaboratorRoleEnum,
});

// Schema for validating Gemini AI generated structured event plans
export const AiGeneratedPlanSchema = z.object({
  overview: z.string().min(10).max(2400),
  strategy: z.string().min(10).max(2400),
  themeAndDecorIdeas: z.string().min(10).max(2400),
  foodAndCateringSuggestions: z.string().min(10).max(2400),
  entertainmentIdeas: z.string().min(10).max(2400),
  riskAndContingencyPlan: z.string().min(10).max(2400),
  guestManagementRecommendations: z.string().min(10).max(2400),
  importantReminders: z.string().min(10).max(2400),
  feasibilityNote: z.string().max(1000).optional().default(''),
  budgetAllocations: z
    .array(
      z.object({
        category: ExpenseCategoryEnum,
        title: z.string().min(1).max(160),
        percentageOfTotal: z.number().min(0).max(100),
        rationale: z.string().max(450),
      })
    )
    .min(3)
    .max(15),
  timelineMilestones: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(550),
        stage: TimelineStageEnum,
        priority: TaskPriorityEnum,
        daysBeforeEvent: z.number().int().min(-30).max(730),
      })
    )
    .min(4)
    .max(25),
  vendorRecommendations: z
    .array(
      z.object({
        name: z.string().min(1).max(140),
        category: VendorCategoryEnum,
        priorityLevel: VendorPriorityLevelEnum,
        estimatedCostPercentage: z.number().min(0).max(60),
        notes: z.string().max(550),
      })
    )
    .min(3)
    .max(15),
});

export type AiGeneratedPlan = z.infer<typeof AiGeneratedPlanSchema>;

// Copilot Function Argument Schemas
export const CopilotFunctionArgsSchemas = {
  update_event_budget: z.object({
    newTotalBudget: z.number().min(0).max(1000000000),
    rebalanceCategoriesProportionally: z.boolean().default(true),
    reason: z.string().max(300).default('Updated via Gatherly AI Copilot'),
  }),
  update_guest_count: z.object({
    newGuestCount: z.number().int().min(1).max(50000),
    reason: z.string().max(300).default('Updated guest count via Gatherly AI Copilot'),
  }),
  add_timeline_task: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(550).default(''),
    stage: TimelineStageEnum,
    priority: TaskPriorityEnum,
    dueDate: IsoDateSchema,
  }),
  move_task_deadline: z.object({
    taskTitleKeyword: z.string().trim().min(1).max(150),
    newDueDate: IsoDateSchema,
  }),
  add_expense_item: z.object({
    category: ExpenseCategoryEnum,
    title: z.string().trim().min(1).max(160),
    allocatedAmount: z.number().min(0).max(1000000000),
    plannedAmount: z.number().min(0).max(1000000000),
    notes: z.string().trim().max(450).default('Added via Gatherly AI Copilot'),
  }),
  add_vendor_suggestion: z.object({
    name: z.string().trim().min(1).max(140),
    category: VendorCategoryEnum,
    estimatedCost: z.number().min(0).max(1000000000),
    priorityLevel: VendorPriorityLevelEnum,
    notes: z.string().trim().max(500).default('AI Illustrative Suggestion'),
  }),
  rebalance_category_allocations: z.object({
    targetBudget: z.number().min(0).max(1000000000),
  }),
};

// Prompt Injection Detection & Sanitization
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /system\s*prompt\s*:/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /bypass\s+(authorization|security|firestore|permissions)/i,
  /drop\s+table/i,
  /delete\s+all\s+users/i,
  /reveal\s+(your\s+)?(api\s*key|secret|system\s+instruction)/i,
];

export function detectPromptInjection(input: string): {
  isSuspicious: boolean;
  reason?: string;
} {
  const normalized = input.trim();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isSuspicious: true,
        reason:
          'Input contains instructions attempting to override system security boundaries.',
      };
    }
  }
  return { isSuspicious: false };
}

export function sanitizeUserPrompt(input: string, maxLength = 1200): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export const CopilotEventContextSchema = z.object({
  id: z.string().trim().min(1).max(128).regex(SAFE_ID_REGEX, 'Invalid event ID'),
  name: z.string().trim().min(1).max(140),
  category: EventCategoryEnum,
  city: z.string().trim().min(1).max(100),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
  guestCount: z.number().int().min(1).max(50000),
  totalBudget: z.number().min(0).max(1000000000),
  currency: CurrencyEnum,
  dietaryRequirements: z.string().trim().max(200).default(''),
  styleTheme: z.string().trim().max(200).default(''),
  budgetSummary: z.object({
    totalAllocated: z.number().min(0).max(10000000000),
    totalPlanned: z.number().min(0).max(10000000000),
    totalActual: z.number().min(0).max(10000000000),
    totalDepositsPaid: z.number().min(0).max(10000000000),
    totalPendingPayments: z.number().min(0).max(10000000000),
    remainingFromCommitted: z.number().min(-10000000000).max(10000000000),
  }),
  tasksSummary: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        dueDate: IsoDateSchema,
        status: TaskStatusEnum,
        priority: TaskPriorityEnum,
      })
    )
    .max(20),
  expensesSummary: z
    .array(
      z.object({
        category: ExpenseCategoryEnum,
        title: z.string().trim().min(1).max(160),
        allocatedAmount: z.number().min(0).max(1000000000),
        actualAmount: z.number().min(0).max(1000000000),
        paymentStatus: PaymentStatusEnum,
      })
    )
    .max(20),
});

export const CopilotRequestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  enableSearchGrounding: z.boolean().optional().default(false),
  eventContext: CopilotEventContextSchema,
});

export type CopilotRequestPayload = z.infer<typeof CopilotRequestSchema>;

export const ResearchRequestSchema = z.object({
  city: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(50),
  queryTopic: z.string().trim().min(3).max(300),
  currency: CurrencyEnum.default('INR'),
});

export function inspectCopilotPayloadForInjection(payload: CopilotRequestPayload): {
  isSuspicious: boolean;
  reason?: string;
} {
  const fieldsToScan: string[] = [
    payload.message,
    payload.eventContext.name,
    payload.eventContext.city,
    payload.eventContext.dietaryRequirements,
    payload.eventContext.styleTheme,
    ...payload.eventContext.tasksSummary.map((t) => t.title),
    ...payload.eventContext.expensesSummary.map((e) => e.title),
  ];

  for (const field of fieldsToScan) {
    const check = detectPromptInjection(field);
    if (check.isSuspicious) {
      return check;
    }
  }
  return { isSuspicious: false };
}

