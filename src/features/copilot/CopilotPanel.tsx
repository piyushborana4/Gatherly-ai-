import React, { useState } from 'react';
import {
  EventPlan,
  BudgetSummary,
  ExpenseItem,
  TimelineTask,
  VendorRecord,
  CopilotMessage,
  CopilotProposedAction,
} from '../../types/domain';
import { formatCurrency } from '../../utils/financials';
import { formatIndianDate } from '../../utils/timeline';
import { sendCopilotMessage } from '../../services/aiService';

interface CopilotPanelProps {
  event: EventPlan;
  budgetSummary: BudgetSummary;
  expenses: ExpenseItem[];
  tasks: TimelineTask[];
  vendors: VendorRecord[];
  canEdit: boolean;
  onExecuteAction: (action: CopilotProposedAction) => Promise<void>;
}

const INTELLIGENCE_THREADS = [
  {
    id: 'escrow-rebalance',
    badge: 'Action Required',
    badgeClass: 'bg-[#FFDAD2] text-[#3D0600]',
    time: '2m ago',
    title: 'Escrow Rebalance & Catering Optimization',
    subtitle: 'Optimize total budget by 10% while protecting culinary & floral quality',
    prompt:
      'Reduce our total budget by 10% and propose a proportional category rebalance without compromising food quality.',
  },
  {
    id: 'muhurat-lock',
    badge: 'Resolved',
    badgeClass: 'bg-[#D9E7CF] text-[#141E10]',
    time: '18m ago',
    title: 'Outstation VIP Transport & Muhurat Lock',
    subtitle: 'Schedule high-priority transport & Golden Hour ceremony lock',
    prompt:
      'Add a high-priority timeline milestone 3 weeks before the event to lock final outstation guest transport and logistics.',
  },
  {
    id: 'vendor-strategy',
    badge: 'RFP Audit',
    badgeClass: 'bg-[#FFD9E1] text-[#32101B]',
    time: '42m ago',
    title: 'Master Scenography & Floral Vendor Audit',
    subtitle: 'Shortlist vetted decorator or florist in our city with INR pricing',
    prompt:
      'Suggest a high-priority decorator or florist vendor archetype for our city and budget with realistic INR pricing.',
  },
  {
    id: 'hospitality-protocol',
    badge: 'Concierge',
    badgeClass: 'bg-[#E8E1DC] text-[#57423D]',
    time: '1h ago',
    title: 'Regional Hospitality & Dietary Segregation',
    subtitle: 'Curate welcome stations & dietary protocols for our guest list',
    prompt:
      'Suggest 3 thoughtful regional hospitality touches and welcome station ideas tailored to our cultural context and guest count.',
  },
];

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  event,
  budgetSummary,
  expenses,
  tasks,
  vendors,
  canEdit,
  onExecuteAction,
}) => {
  const effectiveCommitted = Math.max(budgetSummary.totalPlanned, budgetSummary.totalActual);
  const committedPct = Math.min(100, Math.round(budgetSummary.committedPercent));

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Namaste! I have full live context for **${event.name}** in **${event.city}** (${event.guestCount} guests · Master Cap ${formatCurrency(event.totalBudget, event.currency)} · Committed ${formatCurrency(effectiveCommitted, event.currency)}).\n\nAsk me to rebalance your escrow ledger, schedule new critical-path Muhurat milestones, or audit vendor proposals. Any plan modification I propose will appear as a **Before & After Sub-Escrow Reallocation Card** for your confirmation.`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState('');
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<string>('all');
  const [broadcastDispatched, setBroadcastDispatched] = useState(false);

  const handleSend = async (promptText?: string) => {
    const textToSend = (promptText ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput('');
    setIsLoading(true);

    try {
      const response = await sendCopilotMessage({
        message: textToSend,
        enableSearchGrounding,
        event,
        budget: budgetSummary,
        tasks,
        expenses,
      });

      const assistantMsg: CopilotMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        proposedActions:
          response.proposedActions && response.proposedActions.length > 0
            ? response.proposedActions
            : undefined,
        groundingSources: response.groundingSources,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `I encountered an issue reaching the Gemini planning service: ${
            err instanceof Error ? err.message : 'Please try again.'
          }`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, action: CopilotProposedAction) => {
    if (!canEdit) return;
    setApplyingActionId(action.id);
    try {
      await onExecuteAction(action);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId || !m.proposedActions) return m;
          return {
            ...m,
            proposedActions: m.proposedActions.map((a) =>
              a.id === action.id ? { ...a, status: 'executed' } : a
            ),
          };
        })
      );
    } finally {
      setApplyingActionId(null);
    }
  };

  const handleDismissAction = (msgId: string, actionId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.proposedActions) return m;
        return {
          ...m,
          proposedActions: m.proposedActions.map((a) =>
            a.id === actionId ? { ...a, status: 'cancelled' } : a
          ),
        };
      })
    );
  };

  const renderBeforeAfterCard = (msgId: string, action: CopilotProposedAction) => {
    const isApplying = applyingActionId === action.id;
    const args = action.arguments || {};

    let beforeLabel = 'BEFORE (Current Plan State)';
    let beforeValue = `${formatCurrency(event.totalBudget, event.currency)} Cap`;
    let afterLabel = 'AFTER (Proposed Update)';
    let afterValue = action.summary;

    if (
      action.functionName === 'update_event_budget' ||
      action.functionName === 'rebalance_category_allocations'
    ) {
      const nextCap = Number(args.newTotalBudget ?? args.targetBudget ?? event.totalBudget);
      const delta = nextCap - event.totalBudget;
      beforeLabel = 'BEFORE (Current Budget Cap)';
      beforeValue = formatCurrency(event.totalBudget, event.currency);
      afterLabel = 'AFTER (Proposed Budget Cap)';
      afterValue = `${formatCurrency(nextCap, event.currency)} (${
        delta >= 0
          ? `+${formatCurrency(delta, event.currency)}`
          : formatCurrency(delta, event.currency)
      })`;
    } else if (action.functionName === 'update_guest_count') {
      const nextGuests = Number(args.newGuestCount ?? event.guestCount);
      beforeLabel = 'BEFORE (Guest Count)';
      beforeValue = `${event.guestCount} Guests`;
      afterLabel = 'AFTER (Proposed Guest Count)';
      afterValue = `${nextGuests} Guests`;
    } else if (action.functionName === 'add_timeline_task') {
      beforeLabel = 'BEFORE (Timeline Milestones)';
      beforeValue = `${tasks.length} Scheduled Tasks`;
      afterLabel = `AFTER (+1 ${String(args.priority || 'high').toUpperCase()} Task)`;
      afterValue = `${String(args.title || action.summary)} · Due ${formatIndianDate(
        String(args.dueDate || event.startDate)
      )}`;
    } else if (action.functionName === 'add_expense_item') {
      beforeLabel = `BEFORE (${String(args.category || 'Budget')} Ledger)`;
      beforeValue = `${expenses.length} Line Items`;
      afterLabel = 'AFTER (+1 Expense Line)';
      afterValue = `${String(args.title)} (${formatCurrency(
        Number(args.allocatedAmount || 0),
        event.currency
      )})`;
    } else if (action.functionName === 'add_vendor_suggestion') {
      beforeLabel = 'BEFORE (Vendor Directory)';
      beforeValue = `${vendors.length} Shortlisted Vendors`;
      afterLabel = `AFTER (+1 ${String(args.category || 'Vendor')})`;
      afterValue = `${String(args.name)} · Est. ${formatCurrency(
        Number(args.estimatedCost || 0),
        event.currency
      )}`;
    }

    return (
      <div
        key={action.id}
        className="mt-4 rounded-xl bg-[#FAF2ED] border border-[#98341D]/30 p-4 space-y-3.5 shadow-2xs"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#98341D] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
            <span>Before-and-After Sub-Escrow Reallocation</span>
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
              action.status === 'executed'
                ? 'bg-[#D9E7CF] text-[#141E10]'
                : action.status === 'cancelled'
                ? 'bg-[#E8E1DC] text-[#57423D]'
                : 'bg-[#FFDAD2] text-[#3D0600]'
            }`}
          >
            {action.status}
          </span>
        </div>

        <div className="text-xs font-semibold text-[#1E1B18]">{action.summary}</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DEC0B9]/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A716C]">
              {beforeLabel}
            </div>
            <div className="font-currency-numeral text-sm font-bold text-[#1E1B18] mt-1">
              {beforeValue}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#D9E7CF]/45 border border-[#4C5946]/30">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#141E10]">
              {afterLabel}
            </div>
            <div className="font-currency-numeral text-sm font-bold text-[#141E10] mt-1">
              {afterValue}
            </div>
          </div>
        </div>

        {action.status === 'pending' && canEdit && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => handleConfirmAction(msgId, action)}
              disabled={isApplying}
              className="px-4 py-2 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>{isApplying ? 'Applying...' : 'Confirm & Apply Change'}</span>
            </button>
            <button
              onClick={() => handleDismissAction(msgId, action.id)}
              className="px-3.5 py-2 rounded-full bg-[#FFFFFF] border border-[#DEC0B9]/50 text-xs font-semibold text-[#57423D] hover:text-[#1E1B18] transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  };

  // Pending actions across all messages for the Right Execution Queue
  const pendingActionsList = messages.flatMap((m) =>
    (m.proposedActions || [])
      .filter((a) => a.status === 'pending')
      .map((action) => ({ msgId: m.id, action }))
  );

  // SVG Ring calculation
  const circumference = 238.76;
  const strokeDash = Math.round((committedPct / 100) * circumference);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ==================================================
          LEFT PANEL (3 COLS): EVENT CONTEXT & INTELLIGENCE THREADS
      ================================================== */}
      <aside
        aria-label="Event context and intelligence threads"
        className="lg:col-span-3 bg-[#FAF2ED] rounded-2xl p-4 space-y-5 border border-[#DEC0B9]/30"
      >
        {/* Active Celebration Capsule */}
        <div className="p-4 rounded-xl bg-[#FFFFFF] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#98341D]">
              Active Celebration
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFD9E1] text-[#32101B] text-[10px] font-bold">
              {event.guestCount} Pax
            </span>
          </div>
          <h2 className="font-serif text-lg text-[#1E1B18] leading-snug">{event.name}</h2>
          <p className="text-xs text-[#57423D] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#7F525D]">castle</span>
            <span>
              {event.city} • {formatIndianDate(event.startDate)}
            </span>
          </p>
          <div className="pt-2 border-t border-[#FAF2ED] grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-[#8A716C] block uppercase font-bold">
                Master Cap
              </span>
              <span className="font-currency-numeral text-sm text-[#1E1B18] font-bold">
                {formatCurrency(event.totalBudget, event.currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#8A716C] block uppercase font-bold">
                Committed
              </span>
              <span className="font-currency-numeral text-sm text-[#4C5946] font-bold">
                {formatCurrency(effectiveCommitted, event.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Context Filter Lenses */}
        <div className="space-y-2">
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-[#8A716C] block">
            Audit Lenses
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Intelligence' },
              { id: 'riders', label: 'Contract Riders' },
              { id: 'escrow', label: 'Escrow Rebalance' },
              { id: 'muhurat', label: 'Muhurat & Flow' },
            ].map((lens) => (
              <button
                key={lens.id}
                onClick={() => setActiveLens(lens.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  activeLens === lens.id
                    ? 'bg-[#7F525D] text-white'
                    : 'bg-[#E8E1DC] text-[#57423D] hover:bg-[#DEC0B9]/50'
                }`}
              >
                {lens.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Intelligence Threads */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A716C]">
              Active Intelligence Threads
            </span>
            <span className="text-xs text-[#98341D] font-bold">4 Live</span>
          </div>

          {INTELLIGENCE_THREADS.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => handleSend(thread.prompt)}
              disabled={isLoading}
              className="w-full text-left p-3.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FFF8F4] shadow-2xs border-l-3 border-[#98341D] space-y-1.5 transition-all cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${thread.badgeClass}`}>
                  {thread.badge}
                </span>
                <span className="text-[11px] text-[#8A716C]">{thread.time}</span>
              </div>
              <h3 className="text-xs font-bold text-[#1E1B18] leading-snug">{thread.title}</h3>
              <p className="text-[11px] text-[#57423D] line-clamp-2">{thread.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Weather & Muhurat Telemetry */}
        <div className="p-3.5 rounded-xl bg-[#F4ECE7] space-y-2 border border-[#DEC0B9]/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F525D]">
              Ground Telemetry • {event.city}
            </span>
            <span className="material-symbols-outlined text-[16px] text-[#98341D]">
              wb_twilight
            </span>
          </div>
          <div className="text-xs text-[#1E1B18] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#57423D]">Sunset Muhurat:</span>
              <span className="font-semibold">18:14 IST</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#57423D]">Ambient Breeze:</span>
              <span className="font-semibold text-[#4C5946]">8 kts NW (Calm)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#57423D]">Acoustic Curfew:</span>
              <span className="font-semibold">22:30 IST Outdoor</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ==================================================
          CENTER PANEL (6 COLS): CONVERSATIONAL INTELLIGENCE STREAM
      ================================================== */}
      <section className="lg:col-span-6 bg-[#FFFFFF] rounded-2xl border border-[#DEC0B9]/35 shadow-xs flex flex-col min-h-[680px] max-h-[820px] overflow-hidden">
        {/* Top Copilot Header */}
        <div className="px-5 py-3.5 bg-[#FAF2ED] border-b border-[#DEC0B9]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#98341D] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </div>
            <div>
              <h3 className="font-serif text-base text-[#1E1B18] leading-none">
                Gemini Copilot — Ceremonial Command
              </h3>
              <span className="text-[11px] text-[#57423D]">
                Forensic Ledger Rebalancing &amp; Multi-Day Run-of-Show Sync
              </span>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1E1B18] bg-[#FFFFFF] px-3 py-1.5 rounded-full border border-[#DEC0B9]/50 cursor-pointer">
            <input
              type="checkbox"
              checked={enableSearchGrounding}
              onChange={(e) => setEnableSearchGrounding(e.target.checked)}
              className="accent-[#98341D]"
            />
            <span className="material-symbols-outlined text-[15px] text-[#98341D]">public</span>
            <span>Search Grounding</span>
          </label>
        </div>

        {/* Rapid Scenario Bar */}
        <div className="px-5 py-2.5 bg-[#FFF8F4] border-b border-[#DEC0B9]/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A716C] shrink-0">
            Quick Directives:
          </span>
          {INTELLIGENCE_THREADS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSend(item.prompt)}
              disabled={isLoading}
              className="px-3 py-1 rounded-full bg-[#FAF2ED] hover:bg-[#FFDAD2] text-[#1E1B18] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
            >
              {(item.title.split('&')[0] ?? item.title).trim()}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-[#FFF8F4]/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-4 sm:p-5 ${
                  m.role === 'user'
                    ? 'bg-[#7F525D] text-white rounded-tr-xs shadow-xs'
                    : 'bg-[#FFFFFF] border border-[#DEC0B9]/35 text-[#1E1B18] shadow-[0_8px_28px_rgba(40,37,34,0.05)]'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2 text-[10px] font-bold uppercase tracking-wider opacity-75">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">
                      {m.role === 'user' ? 'person' : 'auto_awesome'}
                    </span>
                    {m.role === 'user' ? 'Principal Organizer' : 'Gemini 2.5 Pro • Live Audit'}
                  </span>
                  <span>
                    {new Date(m.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-sm leading-relaxed whitespace-pre-line">{m.content}</div>

                {m.proposedActions &&
                  m.proposedActions.map((act) => renderBeforeAfterCard(m.id, act))}

                {m.groundingSources && m.groundingSources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#DEC0B9]/30 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A716C]">
                      Google Search Grounded Citations
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.groundingSources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF2ED] border border-[#DEC0B9]/40 text-xs text-[#98341D] font-medium hover:underline"
                        >
                          <span className="truncate max-w-[180px]">{src.title}</span>
                          <span className="material-symbols-outlined text-[13px]">
                            open_in_new
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#DEC0B9]/40 max-w-md flex items-center gap-3 text-xs text-[#57423D] shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-[#98341D] animate-spin">
                progress_activity
              </span>
              <span>
                Auditing {event.name} ledger, Muhurat timeline stages, and vendor riders...
              </span>
            </div>
          )}
        </div>

        {/* Sticky Bottom Prompt Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 bg-[#FFFFFF] border-t border-[#DEC0B9]/30 flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-[#98341D] pl-2">auto_awesome</span>
          <input
            type="text"
            aria-label="Copilot command prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Command Gemini Copilot: e.g. 'Reduce budget by 10%' or 'Add floral vendor'..."
            className="flex-1 bg-transparent text-sm text-[#1E1B18] placeholder:text-[#8A716C] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span>Execute</span>
            <span className="material-symbols-outlined text-[15px]">send</span>
          </button>
        </form>
      </section>

      {/* ==================================================
          RIGHT PANEL (3 COLS): ESCROW LIQUIDITY & EXECUTION QUEUE
      ================================================== */}
      <aside
        aria-label="Escrow liquidity and execution queue"
        className="lg:col-span-3 bg-[#FAF2ED] rounded-2xl p-4 space-y-5 border border-[#DEC0B9]/30"
      >
        {/* Live Escrow Liquidity Gauge */}
        <div className="p-4 rounded-xl bg-[#FFFFFF] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A716C]">
              Escrow Liquidity
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#D9E7CF] text-[#141E10] text-[10px] font-bold">
              Multi-Sig Active
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-[#EEE7E2] fill-none"
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="currentColor"
                  strokeWidth="9"
                />
                <circle
                  className="text-[#98341D] fill-none"
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="currentColor"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  strokeLinecap="round"
                  strokeWidth="9"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-serif text-lg text-[#1E1B18] leading-none">
                  {committedPct}%
                </span>
                <span className="text-[9px] uppercase text-[#8A716C] mt-0.5 font-bold">
                  Committed
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="text-[#57423D]">Treasury:</span>
                <span className="font-currency-numeral font-bold text-[#1E1B18]">
                  {formatCurrency(event.totalBudget, event.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#57423D]">Committed:</span>
                <span className="font-currency-numeral font-bold text-[#98341D]">
                  {formatCurrency(effectiveCommitted, event.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#57423D]">Reserve:</span>
                <span className="font-currency-numeral font-bold text-[#4C5946]">
                  {formatCurrency(
                    Math.max(0, budgetSummary.remainingFromCommitted),
                    event.currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Execution Queue */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A716C]">
              Pending Execution Queue
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFDAD2] text-[#3D0600] text-[10px] font-bold">
              {pendingActionsList.length} Queued
            </span>
          </div>

          {pendingActionsList.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-[#4C5946]">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span className="text-[11px] font-bold uppercase">All Actions Synchronized</span>
              </div>
              <p className="text-xs text-[#57423D]">
                Ask Copilot to propose a budget rebalance, new milestone, or vendor shortlist to
                stage actions here.
              </p>
            </div>
          ) : (
            pendingActionsList.map(({ msgId, action }) => (
              <div
                key={action.id}
                className="p-3.5 rounded-xl bg-[#FFFFFF] shadow-2xs space-y-2 border-l-3 border-[#98341D]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#98341D]">
                    {action.functionName.replace(/_/g, ' ')}
                  </span>
                  <span className="material-symbols-outlined text-[15px] text-[#98341D]">
                    bolt
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#1E1B18]">{action.summary}</p>
                {canEdit && (
                  <button
                    onClick={() => handleConfirmAction(msgId, action)}
                    className="w-full py-1.5 rounded-lg bg-[#98341D] hover:bg-[#B84B32] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Approve &amp; Execute
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* WhatsApp Concierge Broadcast Simulator */}
        <div className="p-4 rounded-xl bg-[#33302D] text-[#F7EFEA] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFB4A3]">
              Family Captains Broadcast
            </span>
            <span className="material-symbols-outlined text-[16px] text-[#D9E7CF]">chat</span>
          </div>
          <p className="text-xs text-[#F7EFEA]/90 leading-relaxed italic font-serif">
            “Namaste Captains — {event.name} ledger &amp; Muhurat cues are synchronized. Current
            committed spend is {formatCurrency(effectiveCommitted, event.currency)}.”
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
            <span className="text-[#F7EFEA]/70">En/Hi/Marwari Ready</span>
            <button
              type="button"
              onClick={() => {
                setBroadcastDispatched(true);
                setTimeout(() => setBroadcastDispatched(false), 3000);
              }}
              className="text-[#FFB4A3] font-bold hover:underline cursor-pointer"
            >
              {broadcastDispatched ? 'Dispatched ✓' : 'Send Preview →'}
            </button>
          </div>
        </div>

        {/* Statutory & Security Stamp */}
        <div className="p-3.5 rounded-xl bg-[#F4ECE7] space-y-2 border border-[#DEC0B9]/30">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A716C] block">
            Governance &amp; Safety
          </span>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#1E1B18] font-medium">Human-in-the-Loop Lock</span>
            <span className="px-2 py-0.5 rounded-full bg-[#D9E7CF] text-[#141E10] text-[10px] font-bold">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#1E1B18] font-medium">Deterministic INR Math</span>
            <span className="px-2 py-0.5 rounded-full bg-[#D9E7CF] text-[#141E10] text-[10px] font-bold">
              Verified
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
};
