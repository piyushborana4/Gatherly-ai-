import {
  BudgetSummary,
  EventPlan,
  GuestRecord,
  SmartInsight,
  TimelineTask,
  VendorRecord,
} from '../types/domain';
import { formatCurrency } from './financials';
import { evaluateTasksAndDependencies } from './timeline';

/**
 * Generates deterministic, factual smart insights and alerts across Budget, Timeline, Vendors, and Guests.
 */
export function computeSmartInsights(
  event: EventPlan,
  budget: BudgetSummary,
  tasks: TimelineTask[],
  vendors: VendorRecord[],
  guests: GuestRecord[],
  referenceDateIso?: string
): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // 1. Budget Overrun Check
  if (budget.isOverSpent || budget.isOverCommitted) {
    const excess = Math.abs(budget.remainingFromCommitted);
    insights.push({
      id: 'insight-budget-overrun',
      severity: 'critical',
      category: 'budget',
      title: 'Budget Overrun Detected',
      metricLabel: `${budget.committedPercent}% Committed`,
      description: `Committed expenses exceed your ${formatCurrency(
        budget.totalBudget,
        event.currency
      )} budget by ${formatCurrency(excess, event.currency)}.`,
      suggestedAction: 'Rebalance allocations or ask Copilot for low-cost alternatives',
      targetTab: 'budget',
    });
  } else if (budget.committedPercent >= 90) {
    insights.push({
      id: 'insight-budget-tight',
      severity: 'warning',
      category: 'budget',
      title: 'Approaching Budget Ceiling',
      metricLabel: `${budget.committedPercent}% Utilized`,
      description: `Only ${formatCurrency(
        budget.remainingFromCommitted,
        event.currency
      )} remains uncommitted for contingency expenses.`,
      suggestedAction: 'Review planned vendor quotations before paying next deposits',
      targetTab: 'budget',
    });
  } else {
    insights.push({
      id: 'insight-budget-healthy',
      severity: 'positive',
      category: 'budget',
      title: 'Budget Reconciliation Healthy',
      metricLabel: `${formatCurrency(budget.remainingFromCommitted, event.currency)} Buffer`,
      description: `Your allocations and committed expenses are within your ${formatCurrency(
        budget.totalBudget,
        event.currency
      )} target (${formatCurrency(budget.perGuestBudget, event.currency)}/guest).`,
      suggestedAction: 'View category breakdown & payment schedule',
      targetTab: 'budget',
    });
  }

  // 2. Pending Vendor / Expense Payments
  if (budget.totalPendingPayments > 0) {
    insights.push({
      id: 'insight-pending-payments',
      severity: 'info',
      category: 'budget',
      title: 'Pending Vendor Payments',
      metricLabel: formatCurrency(budget.totalPendingPayments, event.currency),
      description: `${formatCurrency(
        budget.totalDepositsPaid,
        event.currency
      )} paid in deposits so far; ${formatCurrency(
        budget.totalPendingPayments,
        event.currency
      )} remains payable across active categories.`,
      suggestedAction: 'Track deposits and pending balances in Budget Ledger',
      targetTab: 'budget',
    });
  }

  // 3. Timeline Overdue & Critical Tasks
  const taskEval = evaluateTasksAndDependencies(tasks, referenceDateIso);
  if (taskEval.overdueCount > 0) {
    insights.push({
      id: 'insight-overdue-tasks',
      severity: 'critical',
      category: 'timeline',
      title: `${taskEval.overdueCount} Overdue Planning ${
        taskEval.overdueCount === 1 ? 'Task' : 'Tasks'
      }`,
      metricLabel: `${taskEval.overdueCount} Overdue`,
      description: `Critical preparation milestones have passed their target due dates and need immediate rescheduling or completion.`,
      suggestedAction: 'Review overdue tasks in Timeline',
      targetTab: 'timeline',
    });
  }

  if (taskEval.blockedCount > 0) {
    insights.push({
      id: 'insight-blocked-tasks',
      severity: 'warning',
      category: 'timeline',
      title: `${taskEval.blockedCount} Dependent ${
        taskEval.blockedCount === 1 ? 'Task' : 'Tasks'
      } Waiting`,
      metricLabel: `${taskEval.blockedCount} Blocked`,
      description: `Downstream tasks are waiting on prerequisite milestones (such as venue confirmation) to be marked complete.`,
      suggestedAction: 'Complete prerequisite milestones in Timeline',
      targetTab: 'timeline',
    });
  }

  // 4. Essential Vendor Coverage
  const essentialCategories = ['Venues', 'Caterers', 'Photographers', 'Decorators'] as const;
  const bookedOrShortlistedCategories = new Set(
    vendors
      .filter((v) => v.bookingStatus !== 'declined')
      .map((v) => v.category)
  );
  const missingCategories = essentialCategories.filter(
    (cat) => !bookedOrShortlistedCategories.has(cat)
  );

  if (missingCategories.length > 0) {
    insights.push({
      id: 'insight-missing-vendors',
      severity: 'warning',
      category: 'vendors',
      title: 'Missing Core Vendor Shortlists',
      metricLabel: `${missingCategories.length} Unassigned`,
      description: `No active shortlist or booking found for: ${missingCategories.join(', ')}.`,
      suggestedAction: 'Shortlist or discover vendors in Vendor Directory',
      targetTab: 'vendors',
    });
  }

  // 5. Guest RSVP Headcount vs Planned Capacity
  const confirmedHeadcount = guests
    .filter((g) => g.rsvpStatus === 'confirmed')
    .reduce((sum, g) => sum + 1 + g.plusOneCount, 0);
  const totalInvitedHeadcount = guests
    .filter((g) => g.rsvpStatus !== 'declined')
    .reduce((sum, g) => sum + 1 + g.plusOneCount, 0);

  if (totalInvitedHeadcount > event.guestCount) {
    insights.push({
      id: 'insight-guest-overflow',
      severity: 'warning',
      category: 'guests',
      title: 'Guest List Exceeds Target Capacity',
      metricLabel: `${totalInvitedHeadcount} / ${event.guestCount} Guests`,
      description: `Total invited guests including plus-ones (${totalInvitedHeadcount}) exceed your planned capacity of ${event.guestCount}.`,
      suggestedAction: 'Recalculate catering budget or adjust guest list',
      targetTab: 'guests',
    });
  } else if (guests.length > 0) {
    insights.push({
      id: 'insight-guest-rsvp-progress',
      severity: 'info',
      category: 'guests',
      title: 'Guest RSVP Confirmation Progress',
      metricLabel: `${confirmedHeadcount} Confirmed`,
      description: `${confirmedHeadcount} guests confirmed (including plus-ones) out of ${event.guestCount} planned capacity.`,
      suggestedAction: 'Manage RSVP statuses and dietary preferences',
      targetTab: 'guests',
    });
  }

  return insights;
}
