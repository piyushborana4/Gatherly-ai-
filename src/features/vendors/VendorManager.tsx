import React, { useState } from 'react';
import {
  EventPlan,
  VendorRecord,
  VendorCategory,
  VendorBookingStatus,
  VendorPaymentStatus,
  VendorPriorityLevel,
} from '../../types/domain';
import { formatCurrency } from '../../utils/financials';
import { VendorInputSchema } from '../../schemas/validation';
import { fetchGroundedMarketResearch, GroundedResearchResponse } from '../../services/aiService';
import {
  Store,
  Trash2,
  Phone,
  Globe,
  ExternalLink,
  Search,
  Scale,
  X,
  Star,
} from 'lucide-react';
import { EditorialScene, mapVendorCategoryToScene } from '../../components/EditorialVisuals';

interface VendorManagerProps {
  event: EventPlan;
  vendors: VendorRecord[];
  canEdit: boolean;
  onAddVendor: (vendor: Omit<VendorRecord, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateVendor: (id: string, updates: Partial<VendorRecord>) => Promise<void>;
  onDeleteVendor: (id: string) => Promise<void>;
}

const VENDOR_CATEGORIES: VendorCategory[] = [
  'Venues',
  'Caterers',
  'Photographers',
  'Decorators',
  'Makeup Artists',
  'DJs & Entertainers',
  'Transportation',
  'Florists',
  'Invitation Designers',
];

const STATUS_BADGE: Record<VendorBookingStatus, { label: string; classes: string }> = {
  discovered: {
    label: 'Discovered',
    classes: 'bg-[#F8F6F1] text-[#77736D] border-[#E6E0D7]',
  },
  shortlisted: {
    label: 'Shortlisted',
    classes: 'bg-[#F0EDE5] text-[#242321] border-[#E6E0D7]',
  },
  contacted: {
    label: 'Contacted',
    classes: 'bg-[#D99B91]/20 text-[#9B3616] border-[#D99B91]/40',
  },
  quoted: {
    label: 'Quote Received',
    classes: 'bg-[#B84420]/10 text-[#B84420] border-[#B84420]/30',
  },
  booked: {
    label: 'Booked & Locked',
    classes: 'bg-[#2E6F40]/15 text-[#2E6F40] border-[#2E6F40]/30',
  },
  declined: {
    label: 'Declined',
    classes: 'bg-[#F8F6F1] text-[#77736D] border-[#E6E0D7]',
  },
};

export const VendorManager: React.FC<VendorManagerProps> = ({
  event,
  vendors,
  canEdit,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add vendor state
  const [category, setCategory] = useState<VendorCategory>('Venues');
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(100000);
  const [quotedAmount, setQuotedAmount] = useState<number>(95000);
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [bookingStatus, setBookingStatus] = useState<VendorBookingStatus>('shortlisted');
  const [paymentStatus] = useState<VendorPaymentStatus>('unpaid');
  const [priorityLevel, setPriorityLevel] = useState<VendorPriorityLevel>('high');
  const [notes, setNotes] = useState('');

  // Grounded Search state
  const [searchCategory, setSearchCategory] = useState<VendorCategory>('Venues');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [groundedResult, setGroundedResult] = useState<GroundedResearchResponse | null>(null);

  const filteredVendors = vendors.filter((v) =>
    selectedCategoryFilter === 'all' ? true : v.category === selectedCategoryFilter
  );

  const comparedVendors = vendors.filter((v) => compareIds.includes(v.id));

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = VendorInputSchema.safeParse({
      name,
      category,
      city: event.city,
      sourceType: 'user_entered',
      contactInfo,
      estimatedCost: Number(estimatedCost),
      quotedAmount: Number(quotedAmount),
      depositPaid: Number(depositPaid),
      bookingStatus,
      paymentStatus,
      userRating: 4.5,
      priorityLevel,
      notes,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Please check vendor details.');
      return;
    }

    await onAddVendor(parsed.data);
    setName('');
    setContactInfo('');
    setNotes('');
    setShowAddForm(false);
  };

  const handleRunGroundedSearch = async () => {
    setIsSearchingWeb(true);
    setErrorMsg(null);
    try {
      const res = await fetchGroundedMarketResearch({
        city: event.city,
        category: searchCategory,
        queryTopic: `${searchCategory} for ${event.name} (${event.guestCount} guests)`,
        currency: event.currency,
      });
      setGroundedResult(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to run live vendor search.');
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const uniqueCategories = Array.from(new Set(vendors.map((v) => v.category)));
  const bookedCount = vendors.filter((v) => v.bookingStatus === 'booked').length;
  const totalQuotedSpend = vendors
    .filter((v) => v.bookingStatus !== 'declined')
    .reduce((sum, v) => sum + (v.quotedAmount > 0 ? v.quotedAmount : v.estimatedCost), 0);

  return (
    <div className="space-y-8">
      {/* ==================================================
          STITCH CONTRACT INTEGRITY STATUS STRIP
      ================================================== */}
      <div className="rounded-2xl bg-[#FAF2ED] border border-[#DEC0B9]/40 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#4C5946]"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B18]">
              Contract &amp; Rider Integrity Status
            </span>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#D9E7CF] text-[#141E10]">
            Gemini SLA Audited • {event.city} Leg
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 divide-x divide-[#DEC0B9]/40 text-center">
          <div className="flex flex-col">
            <span className="font-serif text-2xl text-[#1E1B18]">{vendors.length}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A716C]">
              Curated Partners
            </span>
          </div>
          <div className="flex flex-col pl-4">
            <span className="font-serif text-2xl text-[#4C5946]">
              {bookedCount} Locked
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A716C]">
              Contracts Signed
            </span>
          </div>
          <div className="flex flex-col pl-4">
            <span className="font-currency-numeral text-lg sm:text-2xl font-bold text-[#98341D]">
              {formatCurrency(totalQuotedSpend, event.currency)}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A716C]">
              Quoted Pipeline
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================
          1. VENDOR PROCUREMENT HEADER & METRICS
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E6E0D7] shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E6E0D7]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#98341D]">
              <Store className="w-3.5 h-3.5" />
              <span>Curated Vendor Studio &amp; Rider Procurement</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1E1B18] mt-1">
              Curated Directory &amp; Quote Matrix
            </h2>
            <p className="text-sm text-[#57423D] mt-1">
              Compare quotes side-by-side, track advance deposits, and research local {event.city}{' '}
              specialists with Google Search grounding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canEdit && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-5 py-2.5 rounded-full bg-[#98341D] hover:bg-[#B84B32] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                <span>Add Vendor / Log Rider</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-[#242321] text-[#F8F6F1] border-[#242321]'
                  : 'bg-[#F8F6F1] text-[#77736D] border-[#E6E0D7] hover:text-[#242321]'
              }`}
            >
              All Categories ({vendors.length})
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? 'bg-[#B84420] text-white border-[#B84420]'
                    : 'bg-[#F8F6F1] text-[#77736D] border-[#E6E0D7] hover:text-[#242321]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-[#77736D]">
              BOOKED: <strong className="text-[#2E6F40]">{bookedCount}/{vendors.length}</strong>
            </span>
            <span className="text-[#77736D]">
              QUOTED TOTAL:{' '}
              <strong className="text-[#242321]">
                {formatCurrency(totalQuotedSpend, event.currency)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#B42318]/10 border border-[#B42318]/30 text-xs font-semibold text-[#B42318] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================
          2. SIDE-BY-SIDE VENDOR QUOTE COMPARISON MATRIX
      ================================================== */}
      {comparedVendors.length > 0 && (
        <div className="bg-[#242321] text-[#F8F6F1] rounded-2xl p-6 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#D99B91]" />
              <h3 className="font-serif text-xl font-semibold text-white">
                Side-by-Side Vendor Quote Matrix ({comparedVendors.length}/4)
              </h3>
            </div>
            <button
              onClick={() => setCompareIds([])}
              className="text-xs text-[#D99B91] hover:underline cursor-pointer"
            >
              Clear Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparedVendors.map((v) => {
              const variance = v.quotedAmount - v.estimatedCost;
              return (
                <div
                  key={v.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#D99B91]">
                      {v.category}
                    </div>
                    <div className="font-serif text-lg font-semibold text-white mt-0.5">
                      {v.name}
                    </div>
                    <p className="text-xs text-white/70 mt-1 line-clamp-2">{v.notes}</p>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-white/60">Estimated:</span>
                      <span>{formatCurrency(v.estimatedCost, event.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Quoted:</span>
                      <span className="font-bold text-white">
                        {formatCurrency(v.quotedAmount, event.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Variance:</span>
                      <span className={variance > 0 ? 'text-[#D99B91]' : 'text-[#87977E]'}>
                        {variance > 0
                          ? `+${formatCurrency(variance, event.currency)}`
                          : formatCurrency(variance, event.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================
          3. ADD VENDOR MODAL FORM
      ================================================== */}
      {showAddForm && canEdit && (
        <form
          onSubmit={handleCreateVendor}
          className="bg-white rounded-2xl p-6 border border-[#B84420]/40 shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E6E0D7] pb-3">
            <h3 className="font-serif text-xl font-semibold text-[#242321]">
              Add Vendor to Shortlist
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1.5 rounded-lg text-[#77736D] hover:text-[#242321]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VendorCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Vendor Name / Studio
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Royal Konkan Feasts & Live Counters"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Estimated Cost (₹)
              </label>
              <input
                type="number"
                min={0}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Quoted Price (₹)
              </label>
              <input
                type="number"
                min={0}
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Advance Paid (₹)
              </label>
              <input
                type="number"
                min={0}
                value={depositPaid}
                onChange={(e) => setDepositPaid(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Phone / Email Contact
              </label>
              <input
                type="text"
                placeholder="+91 98200 00000 / bookings@vendor.in"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Booking Status
              </label>
              <select
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value as VendorBookingStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                <option value="discovered">Discovered</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="contacted">Contacted</option>
                <option value="quoted">Quoted</option>
                <option value="booked">Booked</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Priority Level
              </label>
              <select
                value={priorityLevel}
                onChange={(e) => setPriorityLevel(e.target.value as VendorPriorityLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                <option value="immediate">Immediate</option>
                <option value="high">High</option>
                <option value="standard">Standard</option>
                <option value="optional">Optional</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-[#242321] mb-1">
                Service Description & Deliverables
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 250-pax multi-regional buffet with dedicated Jain kitchen"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
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
              Save Vendor
            </button>
          </div>
        </form>
      )}

      {/* ==================================================
          4. IMAGE-LED VENDOR CARDS GRID
      ================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => {
          const badge = STATUS_BADGE[vendor.bookingStatus];
          const isCompared = compareIds.includes(vendor.id);
          const effectivePrice =
            vendor.quotedAmount > 0 ? vendor.quotedAmount : vendor.estimatedCost;
          const depositPct =
            effectivePrice > 0
              ? Math.min(100, Math.round((vendor.depositPaid / effectivePrice) * 100))
              : 0;

          return (
            <div
              key={vendor.id}
              className="group bg-white rounded-2xl border border-[#E6E0D7] overflow-hidden shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 overflow-hidden border-b border-[#E6E0D7]">
                  <EditorialScene
                    scene={mapVendorCategoryToScene(vendor.category)}
                    className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500"
                    alt={`${vendor.name} visual`}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#242321]/85 backdrop-blur-md text-[#F8F6F1] text-[10px] font-semibold uppercase tracking-wider">
                    {vendor.category}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border backdrop-blur-md ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/90 text-[#242321] text-[10px] font-mono font-medium">
                      {vendor.sourceType === 'ai_suggestion'
                        ? 'AI Blueprint Recommendation'
                        : vendor.sourceType === 'search_grounded'
                        ? 'Google Search Grounded'
                        : vendor.sourceType === 'demo_sample'
                        ? 'Illustrative Demo Sample'
                        : 'Organizer Added'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[#242321] leading-snug">
                        {vendor.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#77736D]">
                        <span>{vendor.city}</span>
                        {vendor.userRating > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#B84420] font-mono font-semibold">
                            <Star className="w-3 h-3 fill-[#B84420]" />
                            {vendor.userRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => onDeleteVendor(vendor.id)}
                        className="p-1.5 rounded-lg text-[#77736D] hover:text-[#B42318] hover:bg-[#B42318]/10 transition-colors shrink-0 cursor-pointer"
                        title="Remove Vendor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {vendor.notes && (
                    <p className="text-xs text-[#77736D] leading-relaxed">{vendor.notes}</p>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#77736D] block">
                          Estimated
                        </span>
                        <span className="font-mono font-semibold text-[#242321] tabular-nums">
                          {formatCurrency(vendor.estimatedCost, event.currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-[#77736D] block">
                          Quoted Price
                        </span>
                        <span className="font-mono font-bold text-[#B84420] tabular-nums">
                          {vendor.quotedAmount > 0
                            ? formatCurrency(vendor.quotedAmount, event.currency)
                            : 'Awaiting Quote'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E6E0D7] space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-[#77736D]">
                          Advance Paid: {formatCurrency(vendor.depositPaid, event.currency)}
                        </span>
                        <span className="text-[#2E6F40] font-semibold">{depositPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E6E0D7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2E6F40] rounded-full"
                          style={{ width: `${depositPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {vendor.contactInfo && (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#77736D]">
                      <Phone className="w-3.5 h-3.5 text-[#B84420] shrink-0" />
                      <span className="truncate">{vendor.contactInfo}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3.5 bg-[#F8F6F1] border-t border-[#E6E0D7] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleCompare(vendor.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    isCompared
                      ? 'bg-[#242321] text-white border-[#242321]'
                      : 'bg-white text-[#242321] border-[#E6E0D7] hover:bg-[#F0EDE5]'
                  }`}
                >
                  {isCompared ? 'Comparing' : 'Compare Quote'}
                </button>

                {canEdit && (
                  <select
                    value={vendor.bookingStatus}
                    onChange={(e) =>
                      onUpdateVendor(vendor.id, {
                        bookingStatus: e.target.value as VendorBookingStatus,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E6E0D7] text-xs font-semibold text-[#242321] cursor-pointer"
                  >
                    <option value="discovered">Discovered</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="contacted">Contacted</option>
                    <option value="quoted">Quoted</option>
                    <option value="booked">Booked</option>
                    <option value="declined">Declined</option>
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================================================
          5. LIVE GOOGLE SEARCH GROUNDED VENDOR DISCOVERY
      ================================================== */}
      <div className="bg-[#F0EDE5] rounded-2xl p-6 sm:p-8 border border-[#E6E0D7] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#B84420]">
              <Globe className="w-3.5 h-3.5" />
              <span>Live Google Search Grounding</span>
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#242321]">
              Discover Real Local Vendors in {event.city}
            </h3>
            <p className="text-sm text-[#77736D]">
              Query live web listings and market rate benchmarks for {event.city} using Gemini
              Search Grounding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value as VendorCategory)}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-xs sm:text-sm font-semibold text-[#242321]"
            >
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              onClick={handleRunGroundedSearch}
              disabled={isSearchingWeb}
              className="px-5 py-2.5 rounded-xl bg-[#242321] hover:bg-[#B84420] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>
                {isSearchingWeb ? `Searching ${event.city}...` : `Search ${event.city} Vendors`}
              </span>
            </button>
          </div>
        </div>

        {groundedResult && (
          <div className="bg-white rounded-2xl p-6 border border-[#E6E0D7] space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#B84420]">
              Grounded Market Brief — {searchCategory} in {event.city}
            </div>
            <div className="text-sm text-[#242321] whitespace-pre-line leading-relaxed">
              {groundedResult.researchSummary}
            </div>

            {groundedResult.groundingSources.length > 0 && (
              <div className="pt-4 border-t border-[#E6E0D7] space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#77736D]">
                  Verified Web Sources
                </div>
                <div className="flex flex-wrap gap-2">
                  {groundedResult.groundingSources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F6F1] hover:bg-[#F0EDE5] border border-[#E6E0D7] text-xs font-medium text-[#B84420]"
                    >
                      <span className="truncate max-w-[220px]">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
