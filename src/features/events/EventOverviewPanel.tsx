import React, { useState } from 'react';
import {
  EventPlan,
  ExpenseItem,
  TimelineTask,
  VendorRecord,
  GuestRecord,
  EventStatus,
  BudgetSummary,
  SmartInsight,
} from '../../types/domain';
import { formatCurrency } from '../../utils/financials';
import {
  formatIndianDate,
  evaluateTasksAndDependencies,
  parseIsoDateStrict,
} from '../../utils/timeline';
import {
  EditorialScene,
  mapCategoryToScene,
  STITCH_ASSETS,
} from '../../components/EditorialVisuals';

interface EventOverviewPanelProps {
  event: EventPlan;
  budgetSummary: BudgetSummary;
  expenses: ExpenseItem[];
  tasks: TimelineTask[];
  vendors: VendorRecord[];
  guests: GuestRecord[];
  insights: SmartInsight[];
  canEdit: boolean;
  onUpdateStatus: (status: EventStatus) => void;
  onNavigateTab: (
    tab: 'overview' | 'budget' | 'timeline' | 'vendors' | 'guests' | 'copilot' | 'collaborate'
  ) => void;
}

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft Blueprint' },
  { value: 'active', label: 'Active Production' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export const EventOverviewPanel: React.FC<EventOverviewPanelProps> = ({
  event,
  budgetSummary,
  tasks,
  vendors,
  guests,
  insights,
  canEdit,
  onUpdateStatus,
  onNavigateTab,
}) => {
  const [blueprintChapter, setBlueprintChapter] = useState<
    'all' | 'strategy' | 'experience' | 'operations'
  >('all');

  const taskEval = evaluateTasksAndDependencies(tasks);
  let daysUntil = 0;
  try {
    const startDt = parseIsoDateStrict(event.startDate);
    daysUntil = Math.ceil((startDt.getTime() - Date.now()) / 86400000);
  } catch {
    daysUntil = 30;
  }

  const bookedVendors = vendors.filter((v) => v.bookingStatus === 'booked').length;
  const shortlistedVendors = vendors.filter((v) => v.bookingStatus === 'shortlisted').length;
  const confirmedGuests = guests
    .filter((g) => g.rsvpStatus === 'confirmed')
    .reduce((sum, g) => sum + 1 + g.plusOneCount, 0);
  const pendingGuests = guests
    .filter(
      (g) =>
        g.rsvpStatus === 'invited' || g.rsvpStatus === 'tentative' || g.rsvpStatus === 'not_sent'
    )
    .reduce((sum, g) => sum + 1 + g.plusOneCount, 0);
  const specialDietaryGuests = guests.filter(
    (g) => g.dietaryPreference && g.dietaryPreference !== 'No Preference'
  ).length;

  const upcomingTasks = taskEval.evaluatedTasks
    .filter((t) => t.status !== 'completed')
    .slice(0, 4);

  const effectiveCommitted = Math.max(budgetSummary.totalPlanned, budgetSummary.totalActual);
  const committedPct = Math.min(100, Math.round(budgetSummary.committedPercent));
  const readinessScore = Math.min(
    99,
    Math.max(72, Math.round(55 + taskEval.completionPercent * 0.44))
  );

  return (
    <div className="space-y-8">
      {/* ==================================================
          SECTION 1: EXECUTIVE WELCOME & STATUS RIBBON
      ================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[#98341D] text-[11px] font-bold uppercase tracking-widest mb-1">
            <span className="w-2 h-2 rounded-full bg-[#98341D]"></span>
            <span>Executive Command Center</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1E1B18] tracking-tight">
            Namaste. Your celebration is in serene order.
          </h1>
        </div>

        {/* Status & Quick Module Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="event-status-select" className="sr-only">
            Event Status
          </label>
          <select
            id="event-status-select"
            value={event.status}
            disabled={!canEdit}
            onChange={(e) => onUpdateStatus(e.target.value as EventStatus)}
            className="px-4 py-2 rounded-full bg-[#7F525D] text-white text-xs font-semibold shadow-xs focus:outline-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#282522] text-white">
                Status: {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => onNavigateTab('budget')}
            className="px-4 py-2 rounded-full bg-[#FAF2ED] hover:bg-[#EEE7E2] text-[#57423D] text-xs font-semibold transition-colors cursor-pointer"
          >
            Escrow Ledger
          </button>
          <button
            onClick={() => onNavigateTab('timeline')}
            className="px-4 py-2 rounded-full bg-[#FAF2ED] hover:bg-[#EEE7E2] text-[#57423D] text-xs font-semibold transition-colors cursor-pointer"
          >
            Muhurat Run-of-Show
          </button>
          <button
            onClick={() => onNavigateTab('copilot')}
            className="px-4 py-2 rounded-full bg-[#FFDAD2] hover:bg-[#FFB4A3] text-[#3D0600] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
            <span>Gemini Copilot</span>
          </button>
        </div>
      </div>

      {/* ==================================================
          SECTION 2: 4-CARD EXECUTIVE METRIC BENTO
      ================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Committed Capital */}
        <div
          onClick={() => onNavigateTab('budget')}
          className="p-5 rounded-xl bg-[#FFFFFF] shadow-[0_4px_20px_rgba(40,37,34,0.04)] flex flex-col justify-between cursor-pointer hover:shadow-luxury transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A716C]">
              Total Committed Capital
            </span>
            <div className="w-9 h-9 rounded-full bg-[#FAF2ED] flex items-center justify-center text-[#98341D]">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
          </div>
          <div className="my-3">
            <div className="font-serif text-3xl text-[#1E1B18] tracking-tight tabular-nums">
              {formatCurrency(event.totalBudget, event.currency)}
            </div>
            <p className="text-xs text-[#57423D] mt-1">
              Committed: {formatCurrency(effectiveCommitted, event.currency)} ({committedPct}%)
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#FAF2ED]">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                budgetSummary.isOverCommitted ? 'text-[#BA1A1A]' : 'text-[#4C5946]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {budgetSummary.isOverCommitted ? 'warning' : 'verified_user'}
              </span>
              {budgetSummary.isOverCommitted ? 'Variance Flagged' : 'Escrow Protected'}
            </span>
            <span className="text-xs font-semibold text-[#98341D]">View Ledger →</span>
          </div>
        </div>

        {/* Card 2: Confirmed Royal Guests */}
        <div
          onClick={() => onNavigateTab('guests')}
          className="p-5 rounded-xl bg-[#FFFFFF] shadow-[0_4px_20px_rgba(40,37,34,0.04)] flex flex-col justify-between cursor-pointer hover:shadow-luxury transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A716C]">
              Confirmed Royal Guests
            </span>
            <div className="w-9 h-9 rounded-full bg-[#FAF2ED] flex items-center justify-center text-[#7F525D]">
              <span className="material-symbols-outlined text-[20px]">diversity_3</span>
            </div>
          </div>
          <div className="my-3">
            <div className="font-serif text-3xl text-[#1E1B18] tracking-tight tabular-nums">
              {confirmedGuests}{' '}
              <span className="text-lg text-[#8A716C] font-normal">/ {event.guestCount}</span>
            </div>
            <p className="text-xs text-[#57423D] mt-1">
              {specialDietaryGuests} Dietary Protocols • {pendingGuests} Awaiting RSVP
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#FAF2ED]">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C5946]">
              <span className="material-symbols-outlined text-[15px]">chat</span>
              WhatsApp Bot Active
            </span>
            <span className="text-xs font-semibold text-[#7F525D]">RSVP Matrix →</span>
          </div>
        </div>

        {/* Card 3: Vendor Contracts & Riders */}
        <div
          onClick={() => onNavigateTab('vendors')}
          className="p-5 rounded-xl bg-[#FFFFFF] shadow-[0_4px_20px_rgba(40,37,34,0.04)] flex flex-col justify-between cursor-pointer hover:shadow-luxury transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A716C]">
              Vendor Contracts &amp; Riders
            </span>
            <div className="w-9 h-9 rounded-full bg-[#FAF2ED] flex items-center justify-center text-[#4C5946]">
              <span className="material-symbols-outlined text-[20px]">fact_check</span>
            </div>
          </div>
          <div className="my-3">
            <div className="font-serif text-3xl text-[#1E1B18] tracking-tight tabular-nums">
              {bookedVendors}{' '}
              <span className="text-lg text-[#8A716C] font-normal">
                / {vendors.length} Locked
              </span>
            </div>
            <p className="text-xs text-[#57423D] mt-1">
              {shortlistedVendors} Shortlisted • SLA &amp; Rider Audited
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#FAF2ED]">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#98341D]">
              <span className="material-symbols-outlined text-[15px]">priority_high</span>
              {shortlistedVendors} Pending Lock
            </span>
            <span className="text-xs font-semibold text-[#98341D]">Review Riders →</span>
          </div>
        </div>

        {/* Card 4: Gemini Copilot Efficiency */}
        <div
          onClick={() => onNavigateTab('copilot')}
          className="p-5 rounded-xl bg-[#FAF2ED] border border-[#DEC0B9]/40 shadow-[0_4px_20px_rgba(40,37,34,0.04)] flex flex-col justify-between cursor-pointer hover:shadow-luxury transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#98341D]">
              Gemini Copilot Readiness
            </span>
            <div className="w-9 h-9 rounded-full bg-[#FFDAD2] flex items-center justify-center text-[#3D0600]">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </div>
          </div>
          <div className="my-3">
            <div className="font-serif text-3xl text-[#98341D] tracking-tight tabular-nums">
              {taskEval.completionPercent}%
            </div>
            <p className="text-xs text-[#57423D] mt-1">
              {taskEval.completedCount} of {tasks.length} Run-of-Show Cues Complete
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#DEC0B9]/30">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3D0600]">
              <span className="material-symbols-outlined text-[15px]">bolt</span>
              {insights.length} Smart Alerts
            </span>
            <span className="text-xs font-bold text-[#98341D]">Open Copilot →</span>
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 3: FLAGSHIP CELEBRATION HERO SHOWCASE
      ================================================== */}
      <div className="rounded-xl bg-[#FFFFFF] shadow-[0_12px_32px_rgba(40,37,34,0.06)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left 5 Cols: Editorial Photography with Live Status Overlay */}
          <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-[340px]">
            <EditorialScene
              scene={mapCategoryToScene(event.category)}
              className="w-full h-full min-h-[280px] lg:min-h-[340px]"
              alt={event.name}
            />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[#1E1B18] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4C5946] animate-pulse"></span>
                Muhurat Synced • Live
              </span>
              <span className="px-3 py-1 rounded-full bg-[#98341D]/90 text-white text-[11px] font-bold uppercase">
                {daysUntil > 0
                  ? `T - ${daysUntil} Days`
                  : daysUntil === 0
                  ? 'Event Today'
                  : `${Math.abs(daysUntil)}d Ago`}
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-[11px] uppercase tracking-widest text-[#FFEDE8] font-bold">
                Flagship Celebration • {event.city}
              </p>
              <h2 className="font-serif text-2xl leading-tight mt-0.5">{event.name}</h2>
              <p className="text-xs text-white/85 mt-1">
                {event.venuePreference || `${event.city} Heritage Venue`} •{' '}
                {formatIndianDate(event.startDate)}
                {event.endDate && event.endDate !== event.startDate
                  ? ` – ${formatIndianDate(event.endDate)}`
                  : ''}
              </p>
            </div>
          </div>

          {/* Right 7 Cols: Celebration Operational Breakdown */}
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-6">
            {/* Top Bar */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFD9E1] text-[#32101B] text-[11px] font-bold uppercase">
                    {event.styleTheme || 'Royal Editorial'}
                  </span>
                  <span className="text-xs text-[#8A716C]">•</span>
                  <span className="text-xs text-[#57423D] font-medium">
                    Per-Guest Allocation: {formatCurrency(budgetSummary.perGuestBudget, event.currency)}
                  </span>
                </div>
                <h3 className="font-serif text-2xl text-[#1E1B18] mt-1.5">
                  Multi-Day Production Readiness:{' '}
                  <span className="text-[#98341D] font-medium">{readinessScore}%</span>
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => onNavigateTab('copilot')}
                  className="px-4 py-2 rounded-full bg-[#FAF2ED] hover:bg-[#EEE7E2] text-[#1E1B18] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#98341D]">
                    auto_awesome
                  </span>
                  <span>Launch Copilot</span>
                </button>
                <button
                  onClick={() => onNavigateTab('budget')}
                  className="px-4 py-2 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Inspect Ledger</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {event.aiOverview && (
              <p className="text-xs sm:text-sm text-[#57423D] leading-relaxed bg-[#FAF2ED] p-3.5 rounded-xl border-l-3 border-[#98341D]">
                {event.aiOverview}
              </p>
            )}

            {/* Sub-Event Readiness Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FAF2ED] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#7F525D]">
                    Stage 1 • Foundation
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#4C5946]"></span>
                </div>
                <p className="text-sm text-[#1E1B18] font-semibold">Venue &amp; Scenography</p>
                <p className="text-xs text-[#57423D]">Escrow Tranche Active</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF2ED] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#7F525D]">
                    Stage 2 • Culinary
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#4C5946]"></span>
                </div>
                <p className="text-sm text-[#1E1B18] font-semibold">
                  {event.dietaryRequirements || 'Royal Banquet'}
                </p>
                <p className="text-xs text-[#57423D]">{event.guestCount} Covers Planned</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF2ED] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#98341D]">
                    Stage 3 • Ceremony
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#98341D] animate-ping"></span>
                </div>
                <p className="text-sm text-[#1E1B18] font-semibold">Auspicious Muhurat</p>
                <p className="text-xs text-[#57423D]">18:14 IST Golden Hour</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF2ED] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#7F525D]">
                    Stage 4 • Hospitality
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#4C5946]"></span>
                </div>
                <p className="text-sm text-[#1E1B18] font-semibold">VIP Guest Concierge</p>
                <p className="text-xs text-[#57423D]">{confirmedGuests} Confirmed Pax</p>
              </div>
            </div>

            {/* Bottom Financial & Guest Mini-Bar */}
            <div className="pt-4 border-t border-[#FAF2ED] grid grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] uppercase text-[#8A716C] block font-bold">
                  Allocated Budget
                </span>
                <span className="font-currency-numeral text-lg text-[#1E1B18] font-bold">
                  {formatCurrency(event.totalBudget, event.currency)}
                </span>
                <span className="text-xs text-[#4C5946] ml-1 font-medium">
                  ({committedPct}% Committed)
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase text-[#8A716C] block font-bold">
                  Confirmed RSVPs
                </span>
                <span className="font-currency-numeral text-lg text-[#1E1B18] font-bold">
                  {confirmedGuests} / {event.guestCount}
                </span>
                <span className="text-xs text-[#57423D] ml-1">Guests</span>
              </div>
              <div>
                <span className="text-[11px] uppercase text-[#8A716C] block font-bold">
                  Deposits Disbursed
                </span>
                <span className="font-currency-numeral text-lg text-[#4C5946] font-bold">
                  {formatCurrency(budgetSummary.totalDepositsPaid, event.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 4: 2-COLUMN DEEP-DIVE MODULES
      ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7 COLS: FINANCIAL ESCROW LEDGER + MUHURAT TIMELINE + SCENOGRAPHY */}
        <div className="lg:col-span-7 space-y-6">
          {/* Module A: Multi-Day Budget & Escrow Ledger */}
          <div className="rounded-xl bg-[#FFFFFF] p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#98341D]">
                  Financial Governance
                </span>
                <h3 className="font-serif text-xl text-[#1E1B18] mt-0.5">
                  Capital Allocation &amp; Escrow Security
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('budget')}
                className="px-3.5 py-1.5 rounded-full bg-[#FAF2ED] hover:bg-[#EEE7E2] text-xs font-semibold text-[#98341D] transition-colors cursor-pointer"
              >
                Manage Full Ledger →
              </button>
            </div>

            {/* Category Allocation Progress Bars */}
            <div className="space-y-4">
              {budgetSummary.categoryBreakdowns.slice(0, 5).map((bucket, idx) => {
                const committed = bucket.actual > 0 ? bucket.actual : bucket.planned;
                const pctOfTotal =
                  event.totalBudget > 0
                    ? Math.round((bucket.allocated / event.totalBudget) * 100)
                    : 0;
                const barWidth = Math.min(100, Math.round(bucket.utilizationPercent));
                const icons = [
                  'apartment',
                  'filter_vintage',
                  'dinner_dining',
                  'photo_camera',
                  'music_note',
                ];
                return (
                  <div key={bucket.category} className="p-3.5 rounded-xl bg-[#FAF2ED] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#98341D] text-[18px]">
                          {icons[idx % icons.length]}
                        </span>
                        <span className="text-sm text-[#1E1B18] font-semibold">
                          {bucket.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#D9E7CF] text-[#141E10] text-[10px] font-bold">
                          {pctOfTotal}% Share
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-currency-numeral text-sm text-[#1E1B18] font-bold">
                          {formatCurrency(committed, event.currency)}
                        </span>
                        <span className="text-xs text-[#8A716C] block">
                          Cap: {formatCurrency(bucket.allocated, event.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-[#E8E1DC] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          bucket.isOverrun ? 'bg-[#BA1A1A]' : 'bg-[#B84B32]'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Module B: Live Muhurat & Run-of-Show Timeline */}
          <div className="rounded-xl bg-[#FFFFFF] p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#7F525D]">
                  Vedic &amp; Production Precision
                </span>
                <h3 className="font-serif text-xl text-[#1E1B18] mt-0.5">
                  Critical Day-of-Call Muhurat Engine
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('timeline')}
                className="px-3.5 py-1.5 rounded-full bg-[#FFD9E1] text-[#32101B] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">wb_twilight</span>
                <span>Open Run-of-Show ({tasks.length})</span>
              </button>
            </div>

            <div className="space-y-3">
              {upcomingTasks.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#FAF2ED] text-center text-sm text-[#57423D]">
                  All scheduled milestones are complete!
                </div>
              ) : (
                upcomingTasks.map((t, idx) => (
                  <div
                    key={t.id}
                    className={`flex items-start gap-4 p-3.5 rounded-xl ${
                      idx === 0
                        ? 'bg-[#FFDAD2]/35 border border-[#98341D]/20'
                        : 'bg-[#FAF2ED]'
                    }`}
                  >
                    <div
                      className={`px-2.5 py-1.5 rounded-lg text-center shrink-0 min-w-[76px] ${
                        idx === 0
                          ? 'bg-[#98341D] text-white'
                          : 'bg-[#7F525D] text-white'
                      }`}
                    >
                      <span className="font-currency-numeral text-xs font-bold block">
                        {formatIndianDate(t.dueDate)}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider opacity-85">
                        {t.priority}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm text-[#1E1B18] font-semibold truncate">
                          {t.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-[#D9E7CF] text-[#141E10] text-[10px] font-bold shrink-0">
                          {t.stage}
                        </span>
                      </div>
                      <p className="text-xs text-[#57423D] mt-1 line-clamp-2">
                        {t.description || `Assigned to ${t.assigneeName || 'Production Lead'}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Module C: Visual Scenography Blueprint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#FFFFFF] overflow-hidden shadow-[0_4px_20px_rgba(40,37,34,0.04)] group">
              <div className="h-44 overflow-hidden relative">
                <img
                  src={STITCH_ASSETS.floralMandap}
                  alt="Sunset Mandap Scenography"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[10px] font-bold uppercase text-[#1E1B18]">
                  Mandap Blueprint #04
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-serif text-base text-[#1E1B18]">
                  24,000+ Saffron Marigold &amp; Brass Dome Rig
                </h4>
                <p className="text-xs text-[#57423D] mt-1">
                  AI-quantified floral procurement • Golden-hour lighting cue synced
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FFFFFF] overflow-hidden shadow-[0_4px_20px_rgba(40,37,34,0.04)] group">
              <div className="h-44 overflow-hidden relative">
                <img
                  src={STITCH_ASSETS.sangeetCanopy}
                  alt="Royal Sangeet Canopy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[10px] font-bold uppercase text-[#1E1B18]">
                  Sangeet Acoustic Canopy
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-serif text-base text-[#1E1B18]">
                  50,000 Micro-LED Canopy &amp; Sufi Stage
                </h4>
                <p className="text-xs text-[#57423D] mt-1">
                  Sound ceiling monitored at 75dB • 14 family showcases cued
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: GEMINI COPILOT COMMAND DESK + CURATED VENDOR DIRECTORY */}
        <div className="lg:col-span-5 space-y-6">
          {/* Module D: Gemini 2.5 Pro Interactive Copilot Desk */}
          <div className="rounded-xl bg-gradient-to-br from-[#33302D] via-[#282522] to-[#3D0600] text-[#F7EFEA] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#B84B32] flex items-center justify-center text-white shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg text-white">Gemini Copilot</h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#FFDAD2]/20 text-[#FFB4A3] text-[10px] font-bold uppercase">
                      2.5 Pro
                    </span>
                  </div>
                  <p className="text-xs text-[#F7EFEA]/70">Ceremonial Intelligence Desk</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#D9E7CF]">
                <span className="w-2 h-2 rounded-full bg-[#D9E7CF] animate-pulse"></span>
                Active
              </span>
            </div>

            {/* Live AI Insights / Contract Alerts */}
            <div className="space-y-3 text-xs">
              {insights.slice(0, 2).map((ins) => (
                <div
                  key={ins.id}
                  onClick={() => onNavigateTab(ins.targetTab)}
                  className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs space-y-1.5 cursor-pointer hover:bg-white/15 transition-colors"
                >
                  <div className="flex items-center justify-between text-[#FFB4A3] font-bold uppercase text-[10px] tracking-wider">
                    <span>{ins.category} Intelligence</span>
                    <span>{ins.metricLabel}</span>
                  </div>
                  <p className="text-white font-semibold">{ins.title}</p>
                  <p className="text-[#F7EFEA]/85 leading-relaxed">{ins.description}</p>
                </div>
              ))}

              <div className="p-3.5 rounded-xl bg-[#B84B32]/25 border border-[#FFB4A3]/30 space-y-2">
                <div className="flex items-center justify-between text-[#FFEDE8] font-bold uppercase text-[10px] tracking-wider">
                  <span>Gemini Live Audit</span>
                  <span>Action Ready</span>
                </div>
                <p className="text-white leading-relaxed">
                  Ask Gemini Copilot to rebalance your{' '}
                  <strong>{formatCurrency(event.totalBudget, event.currency)}</strong> budget, add
                  missing wedding/event milestones, or suggest vetted {event.city} vendors.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onNavigateTab('copilot')}
                    className="px-3 py-1.5 rounded-lg bg-[#98341D] hover:bg-[#B84B32] text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Open Ceremonial Copilot Workspace →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Module E: Curated Vendors & Riders */}
          <div className="rounded-xl bg-[#FFFFFF] p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A716C]">
                  Vetted Partner Network
                </span>
                <h3 className="font-serif text-xl text-[#1E1B18] mt-0.5">
                  Curated Vendors &amp; Riders
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('vendors')}
                className="text-xs font-semibold text-[#98341D] hover:underline cursor-pointer"
              >
                All {vendors.length} Vendors →
              </button>
            </div>

            <div className="space-y-3">
              {vendors.slice(0, 4).map((v) => (
                <div
                  key={v.id}
                  onClick={() => onNavigateTab('vendors')}
                  className="p-3.5 rounded-xl bg-[#FAF2ED] flex items-center justify-between gap-3 cursor-pointer hover:bg-[#EEE7E2] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#FFD9E1] text-[#32101B] flex items-center justify-center font-serif text-base shrink-0">
                      {v.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm text-[#1E1B18] font-semibold truncate">{v.name}</h4>
                      <p className="text-xs text-[#57423D] truncate">
                        {v.category} • Est. {formatCurrency(v.estimatedCost, event.currency)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 uppercase ${
                      v.bookingStatus === 'booked'
                        ? 'bg-[#D9E7CF] text-[#141E10]'
                        : 'bg-[#FFDAD2] text-[#3D0600]'
                    }`}
                  >
                    {v.bookingStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          SECTION 5: AI ARCHITECTURAL BLUEPRINT DOSSIER
      ================================================== */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DEC0B9]/30 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#98341D]">
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>Comprehensive Event Strategy Dossier</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#1E1B18] mt-1">
              AI Architectural Blueprint
            </h3>
          </div>

          <div className="inline-flex p-1 rounded-full bg-[#FAF2ED] border border-[#DEC0B9]/40 self-start">
            {[
              { id: 'all' as const, label: 'All Chapters' },
              { id: 'strategy' as const, label: 'Strategy & Theme' },
              { id: 'experience' as const, label: 'Culinary & Flow' },
              { id: 'operations' as const, label: 'Risk & Hospitality' },
            ].map((ch) => (
              <button
                key={ch.id}
                onClick={() => setBlueprintChapter(ch.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  blueprintChapter === ch.id
                    ? 'bg-[#7F525D] text-white shadow-2xs'
                    : 'text-[#57423D] hover:text-[#1E1B18]'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {(blueprintChapter === 'all' || blueprintChapter === 'strategy') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#FFFFFF] rounded-xl p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#98341D]">
                <span className="material-symbols-outlined text-[18px]">explore</span>
                <span>Strategic Execution Roadmap</span>
              </div>
              <div className="text-sm text-[#1E1B18] whitespace-pre-line leading-relaxed">
                {event.aiStrategy}
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#FFFFFF] rounded-xl p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7F525D]">
                <span className="material-symbols-outlined text-[18px]">filter_vintage</span>
                <span>Theme, Decor &amp; Spatial Ambience</span>
              </div>
              <div className="text-sm text-[#1E1B18] whitespace-pre-line leading-relaxed">
                {event.aiThemeIdeas}
              </div>
            </div>
          </div>
        )}

        {(blueprintChapter === 'all' || blueprintChapter === 'experience') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#FFFFFF] rounded-xl p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#98341D]">
                <span className="material-symbols-outlined text-[18px]">dinner_dining</span>
                <span>Culinary &amp; Dietary Curation ({event.dietaryRequirements})</span>
              </div>
              <div className="text-sm text-[#1E1B18] whitespace-pre-line leading-relaxed">
                {event.aiFoodSuggestions}
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#FFFFFF] rounded-xl p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7F525D]">
                <span className="material-symbols-outlined text-[18px]">music_note</span>
                <span>Entertainment, Music &amp; Guest Flow</span>
              </div>
              <div className="text-sm text-[#1E1B18] whitespace-pre-line leading-relaxed">
                {event.aiEntertainmentIdeas}
              </div>
            </div>
          </div>
        )}

        {(blueprintChapter === 'all' || blueprintChapter === 'operations') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-[#FFFFFF] rounded-xl p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#BA1A1A]">
                <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
                <span>Risk &amp; Contingency Plan</span>
              </div>
              <div className="text-xs text-[#1E1B18] whitespace-pre-line leading-relaxed">
                {event.aiRiskPlan}
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#FFFFFF] rounded-xl p-6 shadow-[0_4px_20px_rgba(40,37,34,0.04)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4C5946]">
                <span className="material-symbols-outlined text-[18px]">concierge</span>
                <span>Guest Hospitality &amp; Logistics</span>
              </div>
              <div className="text-xs text-[#1E1B18] whitespace-pre-line leading-relaxed">
                {event.aiGuestRecommendations}
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#33302D] text-[#F7EFEA] rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFB4A3]">
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                <span>Critical Organizer Reminders</span>
              </div>
              <div className="text-xs text-[#F7EFEA]/85 whitespace-pre-line leading-relaxed">
                {event.aiReminders}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
