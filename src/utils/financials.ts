import {
  BudgetSummary,
  CategoryBudgetBreakdown,
  CurrencyCode,
  ExpenseCategory,
  ExpenseItem,
  LocaleCode,
} from '../types/domain';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
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
];

export const DEFAULT_CATEGORY_WEIGHTS: Record<ExpenseCategory, number> = {
  Venue: 25,
  Catering: 28,
  Decoration: 12,
  Photography: 8,
  Entertainment: 6,
  Clothing: 7,
  Transportation: 4,
  Accommodation: 5,
  Invitations: 2,
  Miscellaneous: 3,
};

/**
 * Formats currency using Indian numbering (Lakhs/Crores) for INR or standard locale formatting.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'INR',
  locale: LocaleCode = 'en-IN'
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Math.round(safeAmount));
  } catch {
    const symbol = currency === 'INR' ? '₹' : `${currency} `;
    return `${symbol}${Math.round(safeAmount).toLocaleString('en-IN')}`;
  }
}

/**
 * Formats compact Indian currency strings (e.g., ₹12.00 Lakh, ₹1.45 Cr) for high-level KPI sublabels.
 */
export function formatCompactIndianCurrency(
  amount: number,
  currency: CurrencyCode = 'INR'
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (currency !== 'INR') {
    return formatCurrency(safeAmount, currency);
  }
  const abs = Math.abs(safeAmount);
  const sign = safeAmount < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} Lakh`;
  }
  return formatCurrency(safeAmount, 'INR');
}

/**
 * Deterministic financial calculation layer.
 * Never trusts AI arithmetic; computes exact totals, category breakdowns, deposits, and overruns.
 */
export function calculateBudgetSummary(
  totalBudget: number,
  guestCount: number,
  expenses: ExpenseItem[]
): BudgetSummary {
  const safeTotalBudget = Math.max(0, Number.isFinite(totalBudget) ? Math.round(totalBudget) : 0);
  const safeGuestCount = Math.max(1, Number.isFinite(guestCount) ? Math.floor(guestCount) : 1);

  const activeExpenses = expenses.filter((e) => e.paymentStatus !== 'cancelled');

  const categoryMap = new Map<ExpenseCategory, CategoryBudgetBreakdown>();
  for (const category of EXPENSE_CATEGORIES) {
    categoryMap.set(category, {
      category,
      allocated: 0,
      planned: 0,
      actual: 0,
      depositPaid: 0,
      pendingBalance: 0,
      utilizationPercent: 0,
      isOverrun: false,
      itemCount: 0,
    });
  }

  let totalAllocated = 0;
  let totalPlanned = 0;
  let totalActual = 0;
  let totalDepositsPaid = 0;
  let totalPendingPayments = 0;

  for (const item of activeExpenses) {
    if (
      item.allocatedAmount < 0 ||
      item.plannedAmount < 0 ||
      item.actualAmount < 0 ||
      item.depositPaid < 0
    ) {
      throw new Error(`Negative financial value rejected in expense item: ${item.title}`);
    }

    const allocated = Math.round(item.allocatedAmount);
    const planned = Math.round(item.plannedAmount);
    const actual = Math.round(item.actualAmount);
    const deposit = Math.round(item.depositPaid);

    // Effective committed cost for an item is actual (if > 0) or planned
    const effectiveCost = actual > 0 ? actual : planned;
    const itemPending =
      item.paymentStatus === 'paid' ? 0 : Math.max(0, effectiveCost - deposit);

    totalAllocated += allocated;
    totalPlanned += planned;
    totalActual += actual;
    totalDepositsPaid += item.paymentStatus === 'paid' ? effectiveCost : deposit;
    totalPendingPayments += itemPending;

    const bucket = categoryMap.get(item.category) ?? categoryMap.get('Miscellaneous')!;
    bucket.allocated += allocated;
    bucket.planned += planned;
    bucket.actual += actual;
    bucket.depositPaid += item.paymentStatus === 'paid' ? effectiveCost : deposit;
    bucket.pendingBalance += itemPending;
    bucket.itemCount += 1;
  }

  const categoryBreakdowns: CategoryBudgetBreakdown[] = [];
  for (const category of EXPENSE_CATEGORIES) {
    const bucket = categoryMap.get(category)!;
    const effectiveSpend = bucket.actual > 0 ? bucket.actual : bucket.planned;
    bucket.utilizationPercent =
      bucket.allocated > 0
        ? Math.round((effectiveSpend / bucket.allocated) * 1000) / 10
        : effectiveSpend > 0
        ? 100
        : 0;
    bucket.isOverrun =
      (bucket.allocated > 0 && bucket.actual > bucket.allocated) ||
      (bucket.allocated > 0 && bucket.planned > bucket.allocated);
    if (bucket.itemCount > 0 || bucket.allocated > 0) {
      categoryBreakdowns.push(bucket);
    }
  }

  const unallocatedBudget = safeTotalBudget - totalAllocated;
  const remainingFromActual = safeTotalBudget - totalActual;
  const effectiveTotalCommitted = Math.max(totalPlanned, totalActual);
  const remainingFromCommitted = safeTotalBudget - effectiveTotalCommitted;

  const utilizationPercent =
    safeTotalBudget > 0
      ? Math.round((totalActual / safeTotalBudget) * 1000) / 10
      : totalActual > 0
      ? 100
      : 0;

  const committedPercent =
    safeTotalBudget > 0
      ? Math.round((effectiveTotalCommitted / safeTotalBudget) * 1000) / 10
      : effectiveTotalCommitted > 0
      ? 100
      : 0;

  return {
    totalBudget: safeTotalBudget,
    totalAllocated,
    unallocatedBudget,
    totalPlanned,
    totalActual,
    totalDepositsPaid,
    totalPendingPayments,
    remainingFromActual,
    remainingFromCommitted,
    utilizationPercent,
    committedPercent,
    isOverAllocated: totalAllocated > safeTotalBudget,
    isOverSpent: totalActual > safeTotalBudget,
    isOverCommitted: effectiveTotalCommitted > safeTotalBudget,
    perGuestBudget: Math.round(safeTotalBudget / safeGuestCount),
    perGuestActual: Math.round(totalActual / safeGuestCount),
    categoryBreakdowns,
  };
}

/**
 * Normalizes AI-proposed percentage allocations so that the sum of allocated amounts
 * never silently exceeds `totalBudget` and reconciles to the exact rupee/dollar.
 */
export function reconcileAiBudgetAllocations(
  totalBudget: number,
  rawAllocations: {
    category: ExpenseCategory;
    title: string;
    percentageOfTotal: number;
    rationale: string;
  }[]
): {
  category: ExpenseCategory;
  title: string;
  allocatedAmount: number;
  plannedAmount: number;
  notes: string;
}[] {
  const safeBudget = Math.max(0, Math.round(totalBudget));
  if (rawAllocations.length === 0 || safeBudget === 0) {
    return [];
  }

  const totalWeight = rawAllocations.reduce(
    (sum, item) => sum + Math.max(0, item.percentageOfTotal),
    0
  );

  const normalizedWeights =
    totalWeight > 0
      ? rawAllocations.map((item) => Math.max(0, item.percentageOfTotal) / totalWeight)
      : rawAllocations.map(() => 1 / rawAllocations.length);

  let runningSum = 0;
  return rawAllocations.map((item, idx) => {
    const isLast = idx === rawAllocations.length - 1;
    const remainingBudget = Math.max(0, safeBudget - runningSum);
    const weight = normalizedWeights[idx] ?? 0;
    const exactAmount = isLast
      ? remainingBudget
      : Math.min(Math.round(safeBudget * weight), remainingBudget);
    runningSum += exactAmount;
    return {
      category: item.category,
      title: item.title,
      allocatedAmount: exactAmount,
      plannedAmount: exactAmount,
      notes: `${item.rationale} (AI Estimate — Reconciled to budget)`,
    };
  });
}

/**
 * Proportionally scales existing expense allocations to match a new total budget.
 */
export function recalculateAllocationsForNewTotal(
  newTotalBudget: number,
  expenses: ExpenseItem[]
): ExpenseItem[] {
  if (newTotalBudget < 0) {
    throw new Error('Budget cannot be negative');
  }
  const safeNewBudget = Math.round(newTotalBudget);
  const active = expenses.filter((e) => e.paymentStatus !== 'cancelled');
  if (active.length === 0) return expenses;

  let lastActiveIndex = -1;
  for (let i = expenses.length - 1; i >= 0; i--) {
    const candidate = expenses[i];
    if (candidate && candidate.paymentStatus !== 'cancelled') {
      lastActiveIndex = i;
      break;
    }
  }

  const currentAllocatedTotal = active.reduce((s, e) => s + e.allocatedAmount, 0);
  let runningAllocated = 0;

  return expenses.map((expense, index) => {
    if (expense.paymentStatus === 'cancelled') return expense;
    const weight =
      currentAllocatedTotal > 0
        ? expense.allocatedAmount / currentAllocatedTotal
        : 1 / active.length;
    const isLast = index === lastActiveIndex;
    const remainingBudget = Math.max(0, safeNewBudget - runningAllocated);
    const nextAllocated = isLast
      ? remainingBudget
      : Math.min(Math.round(safeNewBudget * weight), remainingBudget);
    runningAllocated += nextAllocated;

    const nextPlanned =
      expense.actualAmount === 0 ? nextAllocated : expense.plannedAmount;

    return {
      ...expense,
      allocatedAmount: nextAllocated,
      plannedAmount: nextPlanned,
    };
  });
}
