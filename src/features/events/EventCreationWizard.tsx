import React, { useEffect, useRef, useState } from 'react';
import { EventCategory, CurrencyCode } from '../../types/domain';
import { EventWizardInputSchema } from '../../schemas/validation';
import { formatCurrency } from '../../utils/financials';
import { Sparkles, X } from 'lucide-react';
import { EditorialScene, mapCategoryToScene } from '../../components/EditorialVisuals';
import { z } from 'zod';

export type EventWizardInput = z.infer<typeof EventWizardInputSchema>;

interface EventCreationWizardProps {
  onSubmit: (data: EventWizardInput) => Promise<void>;
  onCancel: () => void;
  isGenerating: boolean;
}

const GENERATION_STAGES = [
  'Synthesizing celebration blueprint with Gemini 2.5 Flash...',
  'Calibrating INR budget allocations across vendor tiers...',
  'Sequencing Muhurat & ceremonial milestone timeline...',
] as const;

const CATEGORIES: { value: EventCategory; label: string; desc: string }[] = [
  {
    value: 'wedding',
    label: 'Wedding / Sangeet / Reception',
    desc: 'Multi-function shaadi, Haldi, Mehendi, Pheras & hospitality',
  },
  {
    value: 'birthday',
    label: 'Milestone Birthday / Anniversary',
    desc: '1st, 25th, 50th celebration, silver jubilee, intimate soirée',
  },
  {
    value: 'festival',
    label: 'Festival / Puja / Cultural Utsav',
    desc: 'Diwali night, Navratri Garba, Ganeshotsav, Onam Sadhya',
  },
  {
    value: 'college',
    label: 'College Fest / Cultural Summit',
    desc: 'Pro-show, hackathon, alumni meet, inter-college stage',
  },
  {
    value: 'community',
    label: 'Community / Housing Society Event',
    desc: 'Society utsav, fundraiser, cultural gathering',
  },
  {
    value: 'custom',
    label: 'Private Celebration / Bespoke',
    desc: 'Griha Pravesh, engagement dinner, baby shower, retreat',
  },
];

const INDIAN_CITIES = [
  'Mumbai, Maharashtra',
  'Bengaluru, Karnataka',
  'Delhi NCR',
  'Jaipur, Rajasthan',
  'Pune, Maharashtra',
  'Hyderabad, Telangana',
  'Chennai, Tamil Nadu',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Udaipur, Rajasthan',
  'Goa',
  'Kochi, Kerala',
];

const QUICK_PRESETS: { label: string; data: EventWizardInput }[] = [
  {
    label: 'Jaipur Royal Courtyard Wedding (₹25L)',
    data: {
      name: 'Kabir & Meera — Heritage Haveli Wedding & Sangeet',
      category: 'wedding',
      startDate: '2026-11-28',
      endDate: '2026-11-29',
      city: 'Jaipur, Rajasthan',
      venuePreference: 'Heritage Haveli Courtyard & Banquet Lawn',
      guestCount: 220,
      totalBudget: 2500000,
      currency: 'INR',
      styleTheme: 'Royal Terracotta, Marigold & Brass Minimalism',
      dietaryRequirements: 'Pure Vegetarian with Jain & Marwari counters',
      culturalPreferences: 'Haldi, Sunset Sangeet, Pheras & Folk Manganiyar Welcome',
      accessibilityRequirements: 'Wheelchair-friendly courtyard ramps and elder seating',
      additionalInstructions:
        'Prioritize local seasonal florals and consolidated 2-day venue package.',
    },
  },
  {
    label: 'Bengaluru 50th Rooftop Soirée (₹3.5L)',
    data: {
      name: 'Vikram’s 50th Golden Milestone Terrace Soirée',
      category: 'birthday',
      startDate: '2026-10-24',
      endDate: '2026-10-24',
      city: 'Bengaluru, Karnataka',
      venuePreference: 'Botanical Glasshouse & Rooftop Terrace, Indiranagar',
      guestCount: 80,
      totalBudget: 350000,
      currency: 'INR',
      styleTheme: 'Emerald Sage, Warm Brass & Edison Canopy',
      dietaryRequirements: 'Gourmet Vegetarian & Jain Grazing Table',
      culturalPreferences: 'Acoustic Jazz Quartet, Family Toast & Coorg Coffee Finale',
      accessibilityRequirements: 'Direct elevator access to rooftop conservatory',
      additionalInstructions: 'Keep weather-proof retractable pergola ready for October drizzle.',
    },
  },
  {
    label: 'Pune Society Diwali Pahat & Feast (₹4.5L)',
    data: {
      name: 'Koregaon Park Cultural Diwali Pahat & Sangeet',
      category: 'festival',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
      city: 'Pune, Maharashtra',
      venuePreference: 'Open-Air Society Amphitheatre & Community Lawn',
      guestCount: 250,
      totalBudget: 450000,
      currency: 'INR',
      styleTheme: 'Handcrafted Clay Diyas, Brass Urli & Marigold',
      dietaryRequirements: 'Traditional Maharashtrian Faral & Pure Veg Feast',
      culturalPreferences: 'Classical Vocal Concert & Eco-Conscious Celebration',
      accessibilityRequirements: 'Step-free ground floor seating for senior citizens',
      additionalInstructions: 'Use fire-safe LED + clay diya perimeter zoning.',
    },
  },
];

function getDefaultEventDate(): string {
  return new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
}

export const EventCreationWizard: React.FC<EventCreationWizardProps> = ({
  onSubmit,
  onCancel,
  isGenerating,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EventCategory>('wedding');
  const [startDate, setStartDate] = useState<string>(getDefaultEventDate);
  const [endDate, setEndDate] = useState<string>(getDefaultEventDate);
  const [city, setCity] = useState<string>(INDIAN_CITIES[0] ?? 'Mumbai, Maharashtra');
  const [venuePreference, setVenuePreference] = useState(
    'Boutique Banquet Hall & Outdoor Courtyard Lawn'
  );
  const [guestCount, setGuestCount] = useState<number>(180);
  const [totalBudget, setTotalBudget] = useState<number>(1200000);
  const [currency] = useState<CurrencyCode>('INR');
  const [styleTheme, setStyleTheme] = useState('Warm Ivory, Terracotta & Marigold');
  const [dietaryRequirements, setDietaryRequirements] = useState(
    'Vegetarian with dedicated Jain counter'
  );
  const [culturalPreferences, setCulturalPreferences] = useState(
    'Haldi, Mehendi, Sunset Pheras & Reception'
  );
  const [accessibilityRequirements, setAccessibilityRequirements] = useState(
    'Step-free ramp access and reserved elder seating'
  );
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % GENERATION_STAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first && last) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last && first) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, onCancel]);

  const applyPreset = (preset: EventWizardInput) => {
    setName(preset.name);
    setCategory(preset.category);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setCity(preset.city);
    setVenuePreference(preset.venuePreference);
    setGuestCount(preset.guestCount);
    setTotalBudget(preset.totalBudget);
    setStyleTheme(preset.styleTheme);
    setDietaryRequirements(preset.dietaryRequirements);
    setCulturalPreferences(preset.culturalPreferences);
    setAccessibilityRequirements(preset.accessibilityRequirements);
    setAdditionalInstructions(preset.additionalInstructions);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = EventWizardInputSchema.safeParse({
      name,
      category,
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      city,
      venuePreference,
      guestCount: Number(guestCount),
      totalBudget: Number(totalBudget),
      currency,
      styleTheme,
      dietaryRequirements,
      culturalPreferences,
      accessibilityRequirements,
      additionalInstructions,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Please check your event inputs.');
      return;
    }

    await onSubmit(parsed.data);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-dialog-title"
      className="fixed inset-0 z-50 bg-[#242321]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#F8F6F1] border border-[#E6E0D7] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-8">
        <div className="relative h-40 border-b border-[#E6E0D7]">
          <EditorialScene
            scene={mapCategoryToScene(category)}
            className="w-full h-full"
            alt="Event Creation Header"
            overlayTitle="Architect a New Celebration Blueprint"
            overlaySubtitle="Gemini 2.5 Flash synthesizes a structured INR plan tailored to your occasion"
          />
          <h2 id="wizard-dialog-title" className="sr-only">
            Architect a New Celebration Blueprint
          </h2>
          <button
            type="button"
            aria-label="Close event creation wizard"
            onClick={onCancel}
            disabled={isGenerating}
            className="absolute top-4 right-4 p-2 rounded-xl bg-[#242321]/80 text-white hover:bg-[#B84420] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#B84420]">
              Quick Inspiration Templates (1-Click Fill)
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.data)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0EDE5] border border-[#E6E0D7] text-xs font-semibold text-[#242321] transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 rounded-xl bg-[#B42318]/10 border border-[#B42318]/30 text-xs font-semibold text-[#B42318]"
            >
              {errorMsg}
            </div>
          )}

          {isGenerating && (
            <div
              role="status"
              aria-live="polite"
              className="p-3.5 rounded-xl bg-[#FAF2ED] border border-[#C6A364]/50 text-xs font-semibold text-[#98341D] flex items-center gap-2.5"
            >
              <Sparkles className="w-4 h-4 animate-spin shrink-0" />
              <span>{GENERATION_STAGES[stageIndex]}</span>
            </div>
          )}

          <fieldset>
            <legend className="block text-xs font-semibold uppercase tracking-wider text-[#77736D] mb-2.5">
              1. Select Occasion Architecture
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  aria-pressed={category === cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    category === cat.value
                      ? 'bg-white border-[#B84420] shadow-xs ring-1 ring-[#B84420]'
                      : 'bg-white/60 border-[#E6E0D7] hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-[#242321]">{cat.label}</div>
                  <div className="text-[11px] text-[#77736D] mt-1 leading-snug">{cat.desc}</div>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="wizard-event-name"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Event Name
              </label>
              <input
                id="wizard-event-name"
                type="text"
                required
                placeholder="e.g., Aarav & Ananya’s Coastal Courtyard Wedding"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="wizard-city"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                City / Region
              </label>
              <select
                id="wizard-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-sm text-[#242321]"
              >
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="wizard-start-date"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Start Date
              </label>
              <input
                id="wizard-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="wizard-end-date"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                End Date
              </label>
              <input
                id="wizard-end-date"
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="wizard-guest-count"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Expected Guest Count
              </label>
              <input
                id="wizard-guest-count"
                type="number"
                min={1}
                max={50000}
                required
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="wizard-total-budget"
                  className="text-xs font-semibold text-[#242321]"
                >
                  Total Budget Cap (INR ₹)
                </label>
                <span className="font-mono text-xs font-bold text-[#B84420]">
                  {formatCurrency(totalBudget, currency)}
                </span>
              </div>
              <input
                id="wizard-total-budget"
                type="number"
                min={1000}
                step={5000}
                required
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] font-mono text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="wizard-style-theme"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Style & Decor Theme
              </label>
              <input
                id="wizard-style-theme"
                type="text"
                value={styleTheme}
                onChange={(e) => setStyleTheme(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="wizard-venue-pref"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Venue Preference
              </label>
              <input
                id="wizard-venue-pref"
                type="text"
                value={venuePreference}
                onChange={(e) => setVenuePreference(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="wizard-dietary"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Dietary Requirements
              </label>
              <input
                id="wizard-dietary"
                type="text"
                value={dietaryRequirements}
                onChange={(e) => setDietaryRequirements(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>

            <div>
              <label
                htmlFor="wizard-cultural"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Cultural Traditions
              </label>
              <input
                id="wizard-cultural"
                type="text"
                value={culturalPreferences}
                onChange={(e) => setCulturalPreferences(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="wizard-additional-instructions"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Additional Instructions for Gemini AI
              </label>
              <textarea
                id="wizard-additional-instructions"
                rows={2}
                placeholder="e.g., Keep Haldi & Sangeet at the same venue to save transport costs; include rain backup lawn."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D7] text-sm text-[#242321]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E0D7] flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl border border-[#E6E0D7] bg-white text-xs sm:text-sm font-semibold text-[#77736D] hover:text-[#242321]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-6 py-3 rounded-xl bg-[#B84420] hover:bg-[#9B3616] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'Synthesizing Structured AI Blueprint...'
                  : 'Generate Complete AI Event Plan'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
