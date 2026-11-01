import React, { useState } from 'react';
import {
  ExpenseItem,
  ExpenseCategory,
  PaymentStatus,
  EventPlan,
  BudgetSummary,
} from '../../types/domain';
import { EXPENSE_CATEGORIES, formatCurrency } from '../../utils/financials';
import { ExpenseInputSchema } from '../../schemas/validation';
import {
  IndianRupee,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Save,
  X,
  PieChart,
  CreditCard,
} from 'lucide-react';

interface BudgetManagerProps {
  event: EventPlan;
  budgetSummary: BudgetSummary;
  expenses: ExpenseItem[];
  canEdit: boolean;
  onAddExpense: (item: Omit<ExpenseItem, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateExpense: (id: string, updates: Partial<ExpenseItem>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onUpdateTotalBudget: (newTotal: number, rebalance: boolean) => Promise<void>;
}

const SEGMENT_COLORS = [
  '#B84420',
  '#87977E',
  '#D99B91',
  '#C87D55',
  '#242321',
  '#6E7E85',
  '#B5838D',
  '#E3A857',
];

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  event,
  budgetSummary,
  expenses,
  canEdit,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onUpdateTotalBudget,
}) => {
  const [isEditingCap, setIsEditingCap] = useState(false);
  const [capInput, setCapInput] = useState(String(event.totalBudget));
  const [rebalanceOnCapChange, setRebalanceOnCapChange] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add item state
  const [category, setCategory] = useState<ExpenseCategory>('Venue');
  const [title, setTitle] = useState('');
  const [allocatedAmount, setAllocatedAmount] = useState<number>(50000);
  const [plannedAmount, setPlannedAmount] = useState<number>(48000);
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('planned');
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');

  // Inline edit state
  const [editValues, setEditValues] = useState<{
    allocatedAmount: number;
    plannedAmount: number;
    actualAmount: number;
    depositPaid: number;
    paymentStatus: PaymentStatus;
  } | null>(null);

  const handleSaveCap = async () => {
    const parsed = Number(capInput);
    if (isNaN(parsed) || parsed < 1000) {
      setErrorMsg('Total event budget must be at least ₹1,000.');
      return;
    }
    setErrorMsg(null);
    await onUpdateTotalBudget(parsed, rebalanceOnCapChange);
    setIsEditingCap(false);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = ExpenseInputSchema.safeParse({
      category,
      title,
      allocatedAmount: Number(allocatedAmount),
      plannedAmount: Number(plannedAmount),
      actualAmount: Number(actualAmount),
      depositPaid: Number(depositPaid),
      paymentStatus,
      vendorName,
      isAiEstimate: false,
      notes,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Invalid expense item values.');
      return;
    }

    await onAddExpense(parsed.data);
    setTitle('');
    setVendorName('');
    setNotes('');
    setShowAddForm(false);
  };

  const startInlineEdit = (item: ExpenseItem) => {
    setEditingItemId(item.id);
    setEditValues({
      allocatedAmount: item.allocatedAmount,
      plannedAmount: item.plannedAmount,
      actualAmount: item.actualAmount,
      depositPaid: item.depositPaid,
      paymentStatus: item.paymentStatus,
    });
  };

  const saveInlineEdit = async (id: string) => {
    if (!editValues) return;
    if (
      editValues.allocatedAmount < 0 ||
      editValues.plannedAmount < 0 ||
      editValues.actualAmount < 0 ||
      editValues.depositPaid < 0
    ) {
      setErrorMsg('Amounts cannot be negative.');
      return;
    }
    setErrorMsg(null);
    await onUpdateExpense(id, editValues);
    setEditingItemId(null);
    setEditValues(null);
  };

  const pendingItems = expenses.filter(
    (item) => item.paymentStatus !== 'paid' && item.paymentStatus !== 'cancelled'
  );
  const effectiveCommittedTotal = Math.max(budgetSummary.totalPlanned, budgetSummary.totalActual);
  const overrunCategories = budgetSummary.categoryBreakdowns
    .filter((b) => b.isOverrun)
    .map((b) => b.category);

  return (
    <div className="space-y-8">
      {/* ==================================================
          STITCH ESCROW CUSTODY & GEMINI COST INTELLIGENCE STRIP
      ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-2xl bg-[#FAF2ED] border border-[#DEC0B9]/40 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#FFFFFF] flex items-center justify-center text-[#98341D] shadow-2xs shrink-0">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#98341D]">
                  Financial Safeguard • Multi-Sig Vault
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#D9E7CF] text-[#141E10] text-[10px] font-bold">
                  Escrow Live
                </span>
              </div>
              <p className="font-serif text-lg text-[#1E1B18] mt-0.5">
                Institutional Escrow Custody &amp; Deterministic INR Ledger
              </p>
              <p className="text-xs text-[#57423D]">
                Account # •••• 9842 • Milestone-verified vendor disbursements
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#4C5946] text-[24px] hidden sm:inline-flex">
            verified_user
          </span>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-[#EEE7E2] border border-[#DEC0B9]/40 p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FFFFFF] flex items-center justify-center shrink-0 text-[#98341D] shadow-2xs">
            <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[#7F525D]">
                Gemini Escrow Audit
              </span>
              <span className="text-[10px] text-[#4C5946] font-bold">Reconciled</span>
            </div>
            <p className="text-[#1E1B18] leading-relaxed">
              Committed spend is{' '}
              <strong className="text-[#98341D]">
                {formatCurrency(effectiveCommittedTotal, event.currency)}
              </strong>{' '}
              across {expenses.length} active line items ({budgetSummary.committedPercent}% of
              total treasury).
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          1. FINANCIAL COMMAND HEADER & TOTAL CAP CONTROL
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E6E0D7] shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E6E0D7]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#98341D]">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Financial Architecture &amp; Escrow Ledger</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1E1B18] mt-1">
              Budget &amp; Escrow Ledger
            </h2>
            <p className="text-sm text-[#57423D] mt-1">
              Deterministic INR calculations tracking planned allocations, vendor quotes, deposits
              paid, and pending settlements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canEdit && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-5 py-2.5 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Budget Line Item</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-6">
          {/* Card 1: Total Budget Cap */}
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
                Total Budget Cap
              </span>
              {canEdit && !isEditingCap && (
                <button
                  onClick={() => {
                    setCapInput(String(event.totalBudget));
                    setIsEditingCap(true);
                  }}
                  className="text-xs font-semibold text-[#B84420] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingCap ? (
              <div className="mt-2 space-y-2">
                <input
                  type="number"
                  aria-label="Total budget cap"
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#B84420] font-mono text-sm font-bold text-[#242321]"
                />
                <label className="flex items-center gap-1.5 text-[11px] text-[#77736D]">
                  <input
                    type="checkbox"
                    checked={rebalanceOnCapChange}
                    onChange={(e) => setRebalanceOnCapChange(e.target.checked)}
                  />
                  <span>Scale category allocations</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCap}
                    className="px-2.5 py-1 rounded bg-[#B84420] text-white text-xs font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingCap(false)}
                    className="px-2.5 py-1 rounded bg-[#E6E0D7] text-[#242321] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#242321] mt-2 tabular-nums">
                  {formatCurrency(budgetSummary.totalBudget, event.currency)}
                </div>
                <div className="text-[11px] text-[#77736D] mt-1">
                  {formatCurrency(budgetSummary.perGuestBudget, event.currency)} per guest
                </div>
              </>
            )}
          </div>

          {/* Card 2: Allocated Budget */}
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
              Allocated Budget
            </span>
            <div className="font-mono text-xl sm:text-2xl font-bold text-[#242321] mt-2 tabular-nums">
              {formatCurrency(budgetSummary.totalAllocated, event.currency)}
            </div>
            <div
              className={`text-[11px] font-mono mt-1 ${
                budgetSummary.isOverAllocated ? 'text-[#B42318] font-semibold' : 'text-[#77736D]'
              }`}
            >
              {budgetSummary.isOverAllocated
                ? `Over cap by ${formatCurrency(Math.abs(budgetSummary.unallocatedBudget), event.currency)}`
                : `${formatCurrency(budgetSummary.unallocatedBudget, event.currency)} unallocated`}
            </div>
          </div>

          {/* Card 3: Committed / Forecast */}
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
              Committed Forecast
            </span>
            <div className="font-mono text-xl sm:text-2xl font-bold text-[#B84420] mt-2 tabular-nums">
              {formatCurrency(effectiveCommittedTotal, event.currency)}
            </div>
            <div className="text-[11px] font-mono text-[#77736D] mt-1">
              {budgetSummary.committedPercent}% of total budget cap
            </div>
          </div>

          {/* Card 4: Actual Invoiced / Spent */}
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
              Actual Spent / Invoiced
            </span>
            <div className="font-mono text-xl sm:text-2xl font-bold text-[#242321] mt-2 tabular-nums">
              {formatCurrency(budgetSummary.totalActual, event.currency)}
            </div>
            <div className="text-[11px] font-mono text-[#2E6F40] mt-1">
              Deposits Paid: {formatCurrency(budgetSummary.totalDepositsPaid, event.currency)}
            </div>
          </div>

          {/* Card 5: Remaining Safe Balance */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              budgetSummary.isOverCommitted
                ? 'bg-[#B42318]/5 border-[#B42318]/30'
                : 'bg-[#2E6F40]/5 border-[#2E6F40]/25'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
              Remaining Balance
            </span>
            <div
              className={`font-mono text-xl sm:text-2xl font-bold mt-2 tabular-nums ${
                budgetSummary.isOverCommitted ? 'text-[#B42318]' : 'text-[#2E6F40]'
              }`}
            >
              {formatCurrency(budgetSummary.remainingFromCommitted, event.currency)}
            </div>
            <div className="text-[11px] font-mono text-[#77736D] mt-1">
              Pending payouts: {formatCurrency(budgetSummary.totalPendingPayments, event.currency)}
            </div>
          </div>
        </div>

        {/* Multi-Segment Stacked Budget Composition Bar */}
        <div className="mt-6 pt-5 border-t border-[#E6E0D7] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[#77736D]">
              Visual Category Share of Total Cap
            </span>
            <span className="font-mono text-[#242321]">
              {budgetSummary.categoryBreakdowns.length} Active Categories ·{' '}
              {budgetSummary.committedPercent}% Utilized
            </span>
          </div>

          <div className="w-full h-3.5 bg-[#F0EDE5] rounded-full overflow-hidden flex p-0.5 gap-0.5">
            {budgetSummary.categoryBreakdowns.map((bucket, idx) => {
              const committed = bucket.actual > 0 ? bucket.actual : bucket.planned;
              const widthPct =
                budgetSummary.totalBudget > 0
                  ? Math.max(1.5, Math.min(100, (committed / budgetSummary.totalBudget) * 100))
                  : 0;
              return (
                <div
                  key={bucket.category}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
                  }}
                  title={`${bucket.category}: ${formatCurrency(committed, event.currency)}`}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
            {budgetSummary.categoryBreakdowns.map((bucket, idx) => (
              <div
                key={bucket.category}
                className="flex items-center gap-1.5 text-xs text-[#77736D]"
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
                />
                <span className="font-medium text-[#242321]">{bucket.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================
          2. BUDGET WARNINGS & VARIANCE ALERTS
      ================================================== */}
      {(budgetSummary.isOverAllocated ||
        budgetSummary.isOverCommitted ||
        overrunCategories.length > 0 ||
        errorMsg) && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl p-5 bg-[#B42318]/5 border border-[#B42318]/30 space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B42318]">
            <AlertTriangle className="w-4 h-4" />
            <span>Financial Guardrail Alerts</span>
          </div>
          {errorMsg && <p className="text-xs font-semibold text-[#B42318]">{errorMsg}</p>}
          {budgetSummary.isOverAllocated && (
            <p className="text-xs text-[#242321]">
              • Category allocations exceed your master budget cap by{' '}
              <strong className="font-mono">
                {formatCurrency(Math.abs(budgetSummary.unallocatedBudget), event.currency)}
              </strong>
              .
            </p>
          )}
          {budgetSummary.isOverCommitted && (
            <p className="text-xs text-[#242321]">
              • Committed expenses exceed your master cap by{' '}
              <strong className="font-mono">
                {formatCurrency(Math.abs(budgetSummary.remainingFromCommitted), event.currency)}
              </strong>
              .
            </p>
          )}
          {overrunCategories.length > 0 && (
            <p className="text-xs text-[#242321]">
              • Categories exceeding their individual allocation:{' '}
              <strong>{overrunCategories.join(', ')}</strong>.
            </p>
          )}
        </div>
      )}

      {/* ==================================================
          3. ADD NEW BUDGET ITEM MODAL FORM
      ================================================== */}
      {showAddForm && canEdit && (
        <form
          onSubmit={handleCreateItem}
          className="bg-white rounded-2xl p-6 border border-[#B84420]/40 shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E6E0D7] pb-3">
            <h3 className="font-serif text-xl font-semibold text-[#242321]">
              Add New Budget Line Item
            </h3>
            <button
              type="button"
              aria-label="Close add budget line item form"
              onClick={() => setShowAddForm(false)}
              className="p-1.5 rounded-lg text-[#77736D] hover:text-[#242321]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="budget-category"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Category
              </label>
              <select
                id="budget-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="budget-title"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Line Item Title / Deliverable
              </label>
              <input
                id="budget-title"
                type="text"
                required
                placeholder="e.g., Sunset Sangeet LED Wall & Acoustic Line Array"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="budget-vendor"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Assigned Vendor (Optional)
              </label>
              <input
                id="budget-vendor"
                type="text"
                placeholder="e.g., Saffron Banquets"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="budget-allocated"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Allocated Cap (₹)
              </label>
              <input
                id="budget-allocated"
                type="number"
                min={0}
                required
                value={allocatedAmount}
                onChange={(e) => setAllocatedAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="budget-planned"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Planned / Quoted (₹)
              </label>
              <input
                id="budget-planned"
                type="number"
                min={0}
                required
                value={plannedAmount}
                onChange={(e) => setPlannedAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="budget-actual"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Actual Final Spend (₹)
              </label>
              <input
                id="budget-actual"
                type="number"
                min={0}
                required
                value={actualAmount}
                onChange={(e) => setActualAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="budget-deposit"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Deposit Paid (₹)
              </label>
              <input
                id="budget-deposit"
                type="number"
                min={0}
                required
                value={depositPaid}
                onChange={(e) => setDepositPaid(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="budget-payment-status"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Payment Status
              </label>
              <select
                id="budget-payment-status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
              >
                <option value="planned">Planned</option>
                <option value="deposit_paid">Deposit Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid in Full</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="budget-notes"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Notes / Payment Milestones
              </label>
              <input
                id="budget-notes"
                type="text"
                placeholder="e.g., Includes 18% GST and generator backup"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl border border-[#E6E0D7] text-xs font-semibold text-[#77736D]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#B84420] text-white text-xs font-semibold cursor-pointer"
            >
              Save Budget Line
            </button>
          </div>
        </form>
      )}

      {/* ==================================================
          4. VISUAL CATEGORY COMPARISON + PENDING PAYMENTS
      ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Planned vs Actual/Committed Visual Comparison */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#E6E0D7] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B84420]">
                Category Breakdown
              </span>
              <h3 className="font-serif text-xl font-semibold text-[#242321]">
                Allocated vs. Committed Spend
              </h3>
            </div>
            <PieChart className="w-4 h-4 text-[#B84420]" />
          </div>

          <div className="space-y-4">
            {budgetSummary.categoryBreakdowns.map((bucket, idx) => {
              const committed = bucket.actual > 0 ? bucket.actual : bucket.planned;
              const pct = Math.min(100, Math.round(bucket.utilizationPercent));
              const diff = bucket.allocated - committed;

              return (
                <div
                  key={bucket.category}
                  className="p-3.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
                        }}
                      />
                      <span className="text-xs font-semibold text-[#242321]">
                        {bucket.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="text-[#77736D]">
                        Cap: {formatCurrency(bucket.allocated, event.currency)}
                      </span>
                      <span className="font-bold text-[#242321]">
                        Committed: {formatCurrency(committed, event.currency)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          bucket.isOverrun
                            ? 'bg-[#B42318]/10 text-[#B42318]'
                            : 'bg-[#2E6F40]/10 text-[#2E6F40]'
                        }`}
                      >
                        {bucket.isOverrun
                          ? `+${formatCurrency(Math.abs(diff), event.currency)} Over`
                          : `${formatCurrency(Math.max(0, diff), event.currency)} Buffer`}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-[#E6E0D7] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: bucket.isOverrun
                          ? '#B42318'
                          : SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Pending Payments & Settlement Tracker */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E6E0D7] shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B84420]">
                  Cashflow Radar
                </span>
                <h3 className="font-serif text-xl font-semibold text-[#242321]">
                  Pending Vendor Settlements
                </h3>
              </div>
              <CreditCard className="w-4 h-4 text-[#B84420]" />
            </div>

            <div className="p-4 rounded-xl bg-[#242321] text-[#F8F6F1] flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[#D99B91]">
                  Total Pending Balance
                </div>
                <div className="font-mono text-xl font-bold text-white mt-0.5 tabular-nums">
                  {formatCurrency(budgetSummary.totalPendingPayments, event.currency)}
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/10 text-[#D99B91]">
                {pendingItems.length} Open Items
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {pendingItems.map((item) => {
                const effective =
                  item.actualAmount > 0 ? item.actualAmount : item.plannedAmount;
                const pendingBal = Math.max(0, effective - item.depositPaid);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#242321] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#77736D]">
                        {item.category} · Deposit: {formatCurrency(item.depositPaid, event.currency)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-[#242321] tabular-nums">
                        {formatCurrency(pendingBal, event.currency)}
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F0EDE5] text-[#B84420] font-semibold">
                        {item.paymentStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E6E0D7] text-xs text-[#77736D] flex items-center justify-between">
            <span>Mark items as “Paid” in the ledger below once settled.</span>
            <CheckCircle2 className="w-4 h-4 text-[#2E6F40]" />
          </div>
        </div>
      </div>

      {/* ==================================================
          5. DETAILED ITEMIZED LEDGER TABLE
      ================================================== */}
      <div className="bg-white rounded-2xl border border-[#E6E0D7] shadow-2xs overflow-hidden">
        <div className="px-6 py-4 bg-[#F0EDE5] border-b border-[#E6E0D7] flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-[#242321]">
            Itemized Financial Ledger ({expenses.length})
          </h3>
          <span className="text-xs font-mono text-[#77736D]">
            All values in {event.currency}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E0D7] text-[11px] font-semibold uppercase tracking-wider text-[#77736D] bg-[#F8F6F1]">
                <th className="py-3.5 px-4">Category & Deliverable</th>
                <th className="py-3.5 px-4 text-right">Allocated</th>
                <th className="py-3.5 px-4 text-right">Planned</th>
                <th className="py-3.5 px-4 text-right">Actual</th>
                <th className="py-3.5 px-4 text-right">Deposit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {canEdit && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D7] text-sm">
              {expenses.map((item) => {
                const isEditing = editingItemId === item.id;
                const isOver =
                  item.actualAmount > item.allocatedAmount && item.allocatedAmount > 0;

                return (
                  <tr key={item.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#242321]">{item.category}</div>
                      <div className="text-xs text-[#77736D] mt-0.5">{item.title}</div>
                      {item.vendorName && (
                        <div className="text-[11px] text-[#B84420] font-medium mt-0.5">
                          Vendor: {item.vendorName}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-mono tabular-nums">
                      {isEditing && editValues ? (
                        <input
                          type="number"
                          aria-label={`Allocated amount for ${item.title}`}
                          value={editValues.allocatedAmount}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              allocatedAmount: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded border border-[#B84420] text-right font-mono text-xs"
                        />
                      ) : (
                        formatCurrency(item.allocatedAmount, event.currency)
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-mono tabular-nums text-[#77736D]">
                      {isEditing && editValues ? (
                        <input
                          type="number"
                          aria-label={`Planned amount for ${item.title}`}
                          value={editValues.plannedAmount}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              plannedAmount: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded border border-[#B84420] text-right font-mono text-xs"
                        />
                      ) : (
                        formatCurrency(item.plannedAmount, event.currency)
                      )}
                    </td>

                    <td
                      className={`py-4 px-4 text-right font-mono font-semibold tabular-nums ${
                        isOver ? 'text-[#B42318]' : 'text-[#242321]'
                      }`}
                    >
                      {isEditing && editValues ? (
                        <input
                          type="number"
                          aria-label={`Actual amount for ${item.title}`}
                          value={editValues.actualAmount}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              actualAmount: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded border border-[#B84420] text-right font-mono text-xs"
                        />
                      ) : (
                        formatCurrency(item.actualAmount, event.currency)
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-mono tabular-nums text-[#2E6F40]">
                      {isEditing && editValues ? (
                        <input
                          type="number"
                          aria-label={`Deposit paid for ${item.title}`}
                          value={editValues.depositPaid}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              depositPaid: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded border border-[#B84420] text-right font-mono text-xs"
                        />
                      ) : (
                        formatCurrency(item.depositPaid, event.currency)
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {isEditing && editValues ? (
                        <select
                          aria-label={`Payment status for ${item.title}`}
                          value={editValues.paymentStatus}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              paymentStatus: e.target.value as PaymentStatus,
                            })
                          }
                          className="px-2 py-1 rounded border border-[#B84420] text-xs"
                        >
                          <option value="planned">Planned</option>
                          <option value="deposit_paid">Deposit Paid</option>
                          <option value="partially_paid">Partially Paid</option>
                          <option value="paid">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold uppercase ${
                            item.paymentStatus === 'paid'
                              ? 'bg-[#2E6F40]/10 text-[#2E6F40]'
                              : item.paymentStatus === 'deposit_paid' ||
                                item.paymentStatus === 'partially_paid'
                              ? 'bg-[#B84420]/10 text-[#B84420]'
                              : 'bg-[#F0EDE5] text-[#77736D]'
                          }`}
                        >
                          {item.paymentStatus.replace('_', ' ')}
                        </span>
                      )}
                    </td>

                    {canEdit && (
                      <td className="py-4 px-4 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => saveInlineEdit(item.id)}
                              className="p-1.5 rounded bg-[#2E6F40] text-white cursor-pointer"
                              title="Save"
                              aria-label={`Save changes for ${item.title}`}
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="p-1.5 rounded bg-[#E6E0D7] text-[#242321] cursor-pointer"
                              title="Cancel"
                              aria-label={`Cancel editing ${item.title}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => startInlineEdit(item)}
                              className="p-1.5 rounded-lg hover:bg-[#F0EDE5] text-[#77736D] hover:text-[#242321] cursor-pointer"
                              title="Edit Amounts"
                              aria-label={`Edit amounts for ${item.title}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteExpense(item.id)}
                              className="p-1.5 rounded-lg hover:bg-[#B42318]/10 text-[#77736D] hover:text-[#B42318] cursor-pointer"
                              title="Delete Line"
                              aria-label={`Delete ${item.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
