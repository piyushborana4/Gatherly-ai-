import { AiGeneratedPlan } from '../schemas/validation';
import { getFirebaseIdToken } from './firebase';
import {
  BudgetSummary,
  CopilotProposedAction,
  CurrencyCode,
  EventPlan,
  ExpenseCategory,
  ExpenseItem,
  TaskPriority,
  TimelineStage,
  TimelineTask,
  VendorCategory,
  VendorPriorityLevel,
} from '../types/domain';

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await getFirebaseIdToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface GeneratePlanApiResponse {
  plan: AiGeneratedPlan;
  reconciledExpenses: {
    category: ExpenseCategory;
    title: string;
    allocatedAmount: number;
    plannedAmount: number;
    notes: string;
  }[];
  calculatedMilestones: {
    title: string;
    description: string;
    stage: TimelineStage;
    priority: TaskPriority;
    dueDate: string;
  }[];
  calculatedVendors: {
    name: string;
    category: VendorCategory;
    priorityLevel: VendorPriorityLevel;
    estimatedCost: number;
    notes: string;
  }[];
}

export async function generateStructuredEventPlan(
  wizardInput: object
): Promise<GeneratePlanApiResponse> {
  const headers = await buildAuthHeaders();
  const response = await fetch('/api/ai/generate-plan', {
    method: 'POST',
    headers,
    body: JSON.stringify(wizardInput),
  });

  const data = (await response.json()) as { error?: string } & Partial<GeneratePlanApiResponse>;
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate AI event plan.');
  }
  return data as GeneratePlanApiResponse;
}

export interface CopilotApiResponse {
  reply: string;
  proposedActions: CopilotProposedAction[];
  groundingSources?: { title: string; uri: string }[];
}

export async function sendCopilotMessage(params: {
  message: string;
  enableSearchGrounding?: boolean;
  event: EventPlan;
  budget: BudgetSummary;
  tasks: TimelineTask[];
  expenses: ExpenseItem[];
}): Promise<CopilotApiResponse> {
  const headers = await buildAuthHeaders();
  const response = await fetch('/api/ai/copilot', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: params.message,
      enableSearchGrounding: Boolean(params.enableSearchGrounding),
      eventContext: {
        id: params.event.id,
        name: params.event.name.slice(0, 140),
        category: params.event.category,
        city: params.event.city.slice(0, 100),
        startDate: params.event.startDate,
        endDate: params.event.endDate,
        guestCount: params.event.guestCount,
        totalBudget: params.event.totalBudget,
        currency: params.event.currency,
        dietaryRequirements: params.event.dietaryRequirements.slice(0, 200),
        styleTheme: params.event.styleTheme.slice(0, 200),
        budgetSummary: {
          totalAllocated: params.budget.totalAllocated,
          totalPlanned: params.budget.totalPlanned,
          totalActual: params.budget.totalActual,
          totalDepositsPaid: params.budget.totalDepositsPaid,
          totalPendingPayments: params.budget.totalPendingPayments,
          remainingFromCommitted: params.budget.remainingFromCommitted,
        },
        tasksSummary: params.tasks.slice(0, 15).map((t) => ({
          title: t.title.slice(0, 200),
          dueDate: t.dueDate,
          status: t.status,
          priority: t.priority,
        })),
        expensesSummary: params.expenses.slice(0, 12).map((e) => ({
          category: e.category,
          title: e.title.slice(0, 160),
          allocatedAmount: e.allocatedAmount,
          actualAmount: e.actualAmount,
          paymentStatus: e.paymentStatus,
        })),
      },
    }),
  });

  const data = (await response.json()) as { error?: string } & Partial<CopilotApiResponse>;
  if (!response.ok) {
    throw new Error(data.error || 'Failed to communicate with Gatherly AI Copilot.');
  }
  return data as CopilotApiResponse;
}

export interface GroundedResearchResponse {
  researchSummary: string;
  groundingSources: { title: string; uri: string }[];
}

export async function fetchGroundedMarketResearch(params: {
  city: string;
  category: string;
  queryTopic: string;
  currency: CurrencyCode;
}): Promise<GroundedResearchResponse> {
  const headers = await buildAuthHeaders();
  const response = await fetch('/api/ai/research', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = (await response.json()) as {
    error?: string;
    researchSummary?: string;
    groundingSources?: { title: string; uri: string }[];
  };
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch market research.');
  }
  return {
    researchSummary: data.researchSummary ?? '',
    groundingSources: data.groundingSources ?? [],
  };
}
