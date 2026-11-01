import React, { useState, useMemo } from 'react';
import {
  GuestRecord,
  GuestGroup,
  RsvpStatus,
  DietaryPreference,
} from '../../types/domain';
import { GuestInputSchema } from '../../schemas/validation';
import {
  Users,
  Plus,
  Trash2,
  Search,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Utensils,
  X,
} from 'lucide-react';

interface GuestManagerProps {
  targetGuestCount: number;
  guests: GuestRecord[];
  canEdit: boolean;
  onAddGuest: (guest: Omit<GuestRecord, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateGuest: (id: string, updates: Partial<GuestRecord>) => Promise<void>;
  onDeleteGuest: (id: string) => Promise<void>;
}

const GUEST_GROUPS: GuestGroup[] = [
  'Bride Family',
  'Groom Family',
  'Close Friends',
  'Colleagues',
  'VIP & Elders',
  'Community & Neighbors',
  'General',
];

const DIETARY_OPTIONS: DietaryPreference[] = [
  'Vegetarian',
  'Jain Vegetarian',
  'Vegan',
  'Non-Vegetarian',
  'Gluten-Free',
  'No Preference',
];

function sanitizeCsvCell(value: string): string {
  const escaped = (value || '').replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `'${escaped}`;
  }
  return escaped;
}

export const GuestManager: React.FC<GuestManagerProps> = ({
  targetGuestCount,
  guests,
  canEdit,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'all' | RsvpStatus>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | GuestGroup>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add form state
  const [fullName, setFullName] = useState('');
  const [contactPhoneOrEmail, setContactPhoneOrEmail] = useState('');
  const [groupName, setGroupName] = useState<GuestGroup>('Bride Family');
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('confirmed');
  const [plusOneCount, setPlusOneCount] = useState<number>(1);
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('Vegetarian');
  const [specialNotes, setSpecialNotes] = useState('');

  const stats = useMemo(() => {
    const totalInvitedPax = guests.reduce((s, g) => s + 1 + g.plusOneCount, 0);
    const confirmedPax = guests
      .filter((g) => g.rsvpStatus === 'confirmed')
      .reduce((s, g) => s + 1 + g.plusOneCount, 0);
    const pendingPax = guests
      .filter(
        (g) =>
          g.rsvpStatus === 'invited' ||
          g.rsvpStatus === 'tentative' ||
          g.rsvpStatus === 'not_sent'
      )
      .reduce((s, g) => s + 1 + g.plusOneCount, 0);
    const declinedPax = guests
      .filter((g) => g.rsvpStatus === 'declined')
      .reduce((s, g) => s + 1 + g.plusOneCount, 0);

    const dietaryCounts: Record<string, number> = {};
    guests
      .filter((g) => g.rsvpStatus !== 'declined')
      .forEach((g) => {
        const key = g.dietaryPreference || 'Vegetarian';
        dietaryCounts[key] = (dietaryCounts[key] || 0) + 1 + g.plusOneCount;
      });

    return {
      totalInvitedPax,
      confirmedPax,
      pendingPax,
      declinedPax,
      dietaryCounts,
    };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const matchesSearch =
        g.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.contactPhoneOrEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.dietaryPreference || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRsvp = rsvpFilter === 'all' ? true : g.rsvpStatus === rsvpFilter;
      const matchesGroup = groupFilter === 'all' ? true : g.groupName === groupFilter;
      return matchesSearch && matchesRsvp && matchesGroup;
    });
  }, [guests, searchQuery, rsvpFilter, groupFilter]);

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = GuestInputSchema.safeParse({
      fullName,
      groupName,
      contactPhoneOrEmail,
      rsvpStatus,
      invitationSent: true,
      dietaryPreference,
      plusOneCount: Number(plusOneCount),
      specialNotes,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Please check guest inputs.');
      return;
    }

    await onAddGuest(parsed.data);
    setFullName('');
    setContactPhoneOrEmail('');
    setSpecialNotes('');
    setShowAddForm(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'Full Name',
      'Contact',
      'Group',
      'RSVP Status',
      'Plus Ones',
      'Total Pax',
      'Dietary',
      'Notes',
    ];
    const rows = guests.map((g) => [
      `"${sanitizeCsvCell(g.fullName)}"`,
      `"${sanitizeCsvCell(g.contactPhoneOrEmail)}"`,
      `"${sanitizeCsvCell(g.groupName)}"`,
      `"${sanitizeCsvCell(g.rsvpStatus)}"`,
      String(g.plusOneCount),
      String(1 + g.plusOneCount),
      `"${sanitizeCsvCell(g.dietaryPreference)}"`,
      `"${sanitizeCsvCell(g.specialNotes || '')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gatherly-guest-list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async () => {
    setErrorMsg(null);
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setErrorMsg('Paste at least one CSV line (Name, Contact, PlusOnes, Dietary).');
      return;
    }

    for (const line of lines.slice(0, 50)) {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols[0]?.toLowerCase() === 'full name') continue;
      const name = cols[0] || 'Invited Guest';
      const contact = cols[1] || '';
      const plusOnes = Math.max(0, Math.min(20, Number(cols[2]) || 0));
      const rawDiet = cols[3] || 'Vegetarian';
      const diet: DietaryPreference = DIETARY_OPTIONS.includes(rawDiet as DietaryPreference)
        ? (rawDiet as DietaryPreference)
        : 'Vegetarian';

      await onAddGuest({
        fullName: name,
        groupName: 'General',
        contactPhoneOrEmail: contact,
        rsvpStatus: 'invited',
        invitationSent: true,
        dietaryPreference: diet,
        plusOneCount: plusOnes,
        specialNotes: 'Imported via CSV',
      });
    }
    setCsvText('');
    setShowCsvImport(false);
  };

  const confirmedPct =
    targetGuestCount > 0
      ? Math.min(100, Math.round((stats.confirmedPax / targetGuestCount) * 100))
      : 0;

  return (
    <div className="space-y-8">
      {/* ==================================================
          1. GUEST COMMAND HEADER & RSVP KPI CARDS
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E6E0D7] shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E6E0D7]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#B84420]">
              <Users className="w-3.5 h-3.5" />
              <span>Hospitality, RSVPs & Dietary Matrix</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#242321] mt-1">
              Guest Attendance & Culinary Headcount
            </h2>
            <p className="text-sm text-[#77736D] mt-1">
              Track family and household party sizes, RSVP confirmations, and religious or dietary
              preferences.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-[#F8F6F1] hover:bg-[#F0EDE5] border border-[#E6E0D7] text-xs font-semibold text-[#242321] flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#B84420]" />
              <span>Export CSV</span>
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => setShowCsvImport(!showCsvImport)}
                  className="px-3.5 py-2 rounded-xl bg-[#F8F6F1] hover:bg-[#F0EDE5] border border-[#E6E0D7] text-xs font-semibold text-[#242321] flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#B84420]" />
                  <span>Bulk CSV Import</span>
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2.5 rounded-xl bg-[#B84420] hover:bg-[#9B3616] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Guest Party</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
              Target Event Capacity
            </div>
            <div className="font-mono text-2xl font-bold text-[#242321] mt-1.5 tabular-nums">
              {targetGuestCount} Pax
            </div>
            <div className="text-xs text-[#77736D] mt-1">
              {stats.totalInvitedPax} total invited across {guests.length} parties
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#2E6F40]/5 border border-[#2E6F40]/25">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#2E6F40]">
              <span>Confirmed RSVPs</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#2E6F40] mt-1.5 tabular-nums">
              {stats.confirmedPax} Pax
            </div>
            <div className="text-xs text-[#77736D] mt-1">
              {confirmedPct}% of target capacity locked
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#B84420]/5 border border-[#B84420]/25">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#B84420]">
              <span>Pending / Invited</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#B84420] mt-1.5 tabular-nums">
              {stats.pendingPax} Pax
            </div>
            <div className="text-xs text-[#77736D] mt-1">
              Follow up required before catering lock
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7]">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#77736D]">
              <span>Declined</span>
              <XCircle className="w-4 h-4" />
            </div>
            <div className="font-mono text-2xl font-bold text-[#242321] mt-1.5 tabular-nums">
              {stats.declinedPax} Pax
            </div>
            <div className="text-xs text-[#77736D] mt-1">
              Excluded from catering plate count
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E6E0D7] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#77736D]">
            <Utensils className="w-3.5 h-3.5 text-[#B84420]" />
            <span>Active Catering Dietary Split:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.dietaryCounts).map(([diet, count]) => (
              <span
                key={diet}
                className="px-3 py-1 rounded-lg bg-[#F0EDE5] border border-[#E6E0D7] text-xs font-medium text-[#242321]"
              >
                {diet}: <strong className="font-mono">{count} Pax</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-[#B42318]/10 border border-[#B42318]/30 text-xs font-semibold text-[#B42318] flex items-center justify-between"
        >
          <span>{errorMsg}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showCsvImport && canEdit && (
        <div className="bg-white rounded-2xl p-6 border border-[#B84420]/40 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold text-[#242321]">
              Bulk Import Guests via CSV
            </h3>
            <button
              type="button"
              aria-label="Close CSV import form"
              onClick={() => setShowCsvImport(false)}
            >
              <X className="w-4 h-4 text-[#77736D]" />
            </button>
          </div>
          <p className="text-xs text-[#77736D]">
            Format per line:{' '}
            <code className="font-mono">
              Full Name, Phone/Email, PlusOneCount, DietaryPreference
            </code>
          </p>
          <textarea
            aria-label="CSV guest list lines"
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={
              'Rohan & Meera Kapoor, +91 98201 11223, 2, Vegetarian\nShah Parivar, shah@example.com, 3, Jain Vegetarian'
            }
            className="w-full p-3.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCsvImport(false)}
              className="px-4 py-2 rounded-xl border border-[#E6E0D7] text-xs font-semibold text-[#77736D]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportCsv}
              className="px-5 py-2 rounded-xl bg-[#B84420] text-white text-xs font-semibold cursor-pointer"
            >
              Import Guests
            </button>
          </div>
        </div>
      )}

      {showAddForm && canEdit && (
        <form
          onSubmit={handleCreateGuest}
          className="bg-white rounded-2xl p-6 border border-[#B84420]/40 shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E6E0D7] pb-3">
            <h3 className="font-serif text-xl font-semibold text-[#242321]">
              Add Guest or Family Party
            </h3>
            <button
              type="button"
              aria-label="Close add guest form"
              onClick={() => setShowAddForm(false)}
              className="p-1.5 rounded-lg text-[#77736D] hover:text-[#242321]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="guest-full-name"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Guest / Family Name
              </label>
              <input
                id="guest-full-name"
                type="text"
                required
                placeholder="e.g., Deshmukh Family (Pune)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="guest-contact"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Phone or Email
              </label>
              <input
                id="guest-contact"
                type="text"
                placeholder="+91 98200 12345"
                value={contactPhoneOrEmail}
                onChange={(e) => setContactPhoneOrEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="guest-group"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Group Circle
              </label>
              <select
                id="guest-group"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value as GuestGroup)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                {GUEST_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="guest-plus-ones"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Additional Family / Plus-Ones
              </label>
              <input
                id="guest-plus-ones"
                type="number"
                min={0}
                max={20}
                required
                value={plusOneCount}
                onChange={(e) => setPlusOneCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="guest-rsvp-status"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                RSVP Status
              </label>
              <select
                id="guest-rsvp-status"
                value={rsvpStatus}
                onChange={(e) => setRsvpStatus(e.target.value as RsvpStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                <option value="confirmed">Confirmed</option>
                <option value="invited">Invited</option>
                <option value="tentative">Tentative</option>
                <option value="declined">Declined</option>
                <option value="not_sent">Not Sent</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="guest-dietary"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Dietary Preference
              </label>
              <select
                id="guest-dietary"
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value as DietaryPreference)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                {DIETARY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="guest-notes"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Hospitality / Room / Transfer Notes
              </label>
              <input
                id="guest-notes"
                type="text"
                placeholder="e.g., Requires wheelchair-accessible ground floor seating"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
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
              Save Guest Party
            </button>
          </div>
        </form>
      )}

      {/* ==================================================
          2. SEARCH, GROUP FILTERS & GUEST TABLE
      ================================================== */}
      <div className="bg-white rounded-2xl border border-[#E6E0D7] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-[#F0EDE5] border-b border-[#E6E0D7] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search guests by name, contact, or dietary preference"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest name, contact, or dietary preference..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#E6E0D7] text-xs sm:text-sm text-[#242321] focus:outline-none focus:border-[#B84420]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by guest group"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as 'all' | GuestGroup)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E6E0D7] text-xs font-semibold text-[#242321]"
            >
              <option value="all">All Groups</option>
              {GUEST_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by RSVP status"
              value={rsvpFilter}
              onChange={(e) => setRsvpFilter(e.target.value as 'all' | RsvpStatus)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E6E0D7] text-xs font-semibold text-[#242321]"
            >
              <option value="all">All RSVP Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="invited">Invited</option>
              <option value="tentative">Tentative</option>
              <option value="declined">Declined</option>
              <option value="not_sent">Not Sent</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E0D7] text-[11px] font-semibold uppercase tracking-wider text-[#77736D] bg-[#F8F6F1]">
                <th className="py-3.5 px-4">Guest / Household</th>
                <th className="py-3.5 px-4">Group</th>
                <th className="py-3.5 px-4 text-center">Total Headcount</th>
                <th className="py-3.5 px-4">Dietary Requirement</th>
                <th className="py-3.5 px-4 text-center">RSVP Status</th>
                {canEdit && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D7] text-sm">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-[#242321]">{guest.fullName}</div>
                    {guest.contactPhoneOrEmail && (
                      <div className="text-xs font-mono text-[#77736D] mt-0.5">
                        {guest.contactPhoneOrEmail}
                      </div>
                    )}
                    {guest.specialNotes && (
                      <div className="text-[11px] text-[#77736D]/90 italic mt-0.5">
                        {guest.specialNotes}
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-md bg-[#F0EDE5] text-xs font-medium text-[#242321]">
                      {guest.groupName}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center font-mono font-bold text-[#242321] tabular-nums">
                    {1 + guest.plusOneCount} Pax
                    {guest.plusOneCount > 0 && (
                      <span className="block text-[10px] font-normal text-[#77736D]">
                        (1 + {guest.plusOneCount})
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    <span className="text-xs font-medium text-[#242321]">
                      {guest.dietaryPreference}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center">
                    {canEdit ? (
                      <select
                        aria-label={`RSVP status for ${guest.fullName}`}
                        value={guest.rsvpStatus}
                        onChange={(e) =>
                          onUpdateGuest(guest.id, {
                            rsvpStatus: e.target.value as RsvpStatus,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold uppercase border cursor-pointer ${
                          guest.rsvpStatus === 'confirmed'
                            ? 'bg-[#2E6F40]/10 text-[#2E6F40] border-[#2E6F40]/30'
                            : guest.rsvpStatus === 'invited' || guest.rsvpStatus === 'tentative'
                            ? 'bg-[#B84420]/10 text-[#B84420] border-[#B84420]/30'
                            : 'bg-[#F0EDE5] text-[#77736D] border-[#E6E0D7]'
                        }`}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="invited">Invited</option>
                        <option value="tentative">Tentative</option>
                        <option value="declined">Declined</option>
                        <option value="not_sent">Not Sent</option>
                      </select>
                    ) : (
                      <span className="text-xs font-mono uppercase">{guest.rsvpStatus}</span>
                    )}
                  </td>

                  {canEdit && (
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => onDeleteGuest(guest.id)}
                        className="p-1.5 rounded-lg text-[#77736D] hover:text-[#B42318] hover:bg-[#B42318]/10 transition-colors cursor-pointer"
                        title="Remove Guest"
                        aria-label={`Remove guest ${guest.fullName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
