import React, { useState } from 'react';
import { STITCH_ASSETS } from './EditorialVisuals';

interface LandingPageProps {
  onSignIn: () => void;
  onEnterDemo: (scenarioId?: string) => void;
  isSigningIn: boolean;
}

interface ArchetypePreview {
  id: string;
  demoEventId: string;
  label: string;
  count: string;
  icon: string;
  title: string;
  venue: string;
  dates: string;
  guests: string;
  readiness: string;
  totalBudget: string;
  disbursedNote: string;
  copilotAlert: string;
  allocations: {
    name: string;
    amount: string;
    pct: number;
    colorClass: string;
  }[];
  whatsappPrompt: string;
  whatsappReply: string;
  callSheet: {
    time: string;
    timeBadgeClass: string;
    title: string;
    subtitle: string;
    highlight?: boolean;
  }[];
}

const ARCHETYPES: [ArchetypePreview, ...ArchetypePreview[]] = [
  {
    id: 'wedding',
    demoEventId: 'demo_event_mumbai_wedding_01',
    label: 'Royal Destination Weddings',
    count: '840+',
    icon: 'castle',
    title: 'Kapoor & Singhania Imperial Wedding',
    venue: 'The Oberoi Udaivilās, Udaipur',
    dates: 'Nov 14–17, 2026',
    guests: '350 Guests',
    readiness: '98% Ready',
    totalBudget: '₹12,00,000',
    disbursedNote: '₹7.80L Disbursed (65%)',
    copilotAlert: 'Saved ₹1.40L on floral stem bulk lock',
    allocations: [
      { name: 'Venue & Palatial Suites (40%)', amount: '₹4,80,000', pct: 40, colorClass: 'bg-[#542D38]' },
      { name: 'Bespoke Scenography & Mandap (26%)', amount: '₹3,12,000', pct: 26, colorClass: 'bg-[#B84B32]' },
      { name: 'Royal Catering & Imperial Banquets (18%)', amount: '₹2,16,000', pct: 18, colorClass: 'bg-[#C6A364]' },
      { name: 'Heritage Cinema & Logistics (16%)', amount: '₹1,92,000', pct: 16, colorClass: 'bg-[#899681]' },
    ],
    whatsappPrompt:
      '“Shift Sangeet cocktail bar closer to the Lake Pichola Courtyard & add 40 Jain plates for Day 2.”',
    whatsappReply:
      'Floorplan updated. Vendor ‘Royal Mewar Caterers’ notified. ₹34,000 reallocated from Contingency without exceeding ₹12,00,000 cap.',
    callSheet: [
      {
        time: '16:30',
        timeBadgeClass: 'bg-[#542D38] text-white',
        title: 'Vintage Boat Baraat Procession',
        subtitle: 'Bansi Ghat Jetty • 14 Dhol Artists Synced',
      },
      {
        time: '18:14',
        timeBadgeClass: 'bg-[#B84B32] text-white',
        title: 'Sunset Varmala & Golden Hour Lock',
        subtitle: 'Courtyard Mandap • Drone Crew Armed',
        highlight: true,
      },
      {
        time: '20:45',
        timeBadgeClass: 'bg-[#282522] text-white',
        title: 'Royal Mewar Sit-Down Banquet',
        subtitle: 'Chandra Mahal • 350 Plated Covers',
      },
    ],
  },
  {
    id: 'birthday',
    demoEventId: 'demo_event_pune_birthday_02',
    label: 'Milestone Jubilees & Birthdays',
    count: '420+',
    icon: 'cake',
    title: 'Meera’s 30th Botanical Sundowner',
    venue: 'Koregaon Park Glasshouse, Pune',
    dates: 'Dec 06, 2026',
    guests: '85 Guests',
    readiness: '96% Ready',
    totalBudget: '₹1,50,000',
    disbursedNote: '₹94,500 Disbursed (63%)',
    copilotAlert: 'Saved ₹18,000 on artisanal grazing table & acoustic rider',
    allocations: [
      { name: 'Glasshouse Terrace & Lighting (36%)', amount: '₹54,000', pct: 36, colorClass: 'bg-[#542D38]' },
      { name: 'Artisanal Tapas & Mixology Bar (32%)', amount: '₹48,000', pct: 32, colorClass: 'bg-[#B84B32]' },
      { name: 'Botanical Tablescape & Florals (18%)', amount: '₹27,000', pct: 18, colorClass: 'bg-[#C6A364]' },
      { name: 'Vinyl Acoustic Set & Film Stills (14%)', amount: '₹21,000', pct: 14, colorClass: 'bg-[#899681]' },
    ],
    whatsappPrompt:
      '“Extend the sundowner acoustic trio set by 45 minutes and add 15 vegan dessert platters.”',
    whatsappReply:
      'Timeline extended to 22:45 IST. Patisserie notified for 15 vegan dark-chocolate hazelnut plates within existing buffer.',
    callSheet: [
      {
        time: '17:15',
        timeBadgeClass: 'bg-[#542D38] text-white',
        title: 'Golden Hour Aperitivo & Polaroid Wall',
        subtitle: 'Botanical Conservatory • Welcome Cocktails',
      },
      {
        time: '19:30',
        timeBadgeClass: 'bg-[#B84B32] text-white',
        title: 'Candlelit Long-Table Tasting & Toasts',
        subtitle: 'Terrace Pergola • 85 Seated Guests',
        highlight: true,
      },
      {
        time: '21:00',
        timeBadgeClass: 'bg-[#282522] text-white',
        title: 'Live Acoustic Vinyl Session & Cake Ritual',
        subtitle: 'Indoor Lounge • Sound Limiter Synced',
      },
    ],
  },
  {
    id: 'gala',
    demoEventId: 'demo_event_blr_diwali_03',
    label: 'Heritage Galas & CulturalFests',
    count: '190+',
    icon: 'wine_bar',
    title: 'Koramangala Heritage Diwali Mela',
    venue: 'Jayamahal Palace Lawns, Bengaluru',
    dates: 'Nov 08, 2026',
    guests: '220 Guests',
    readiness: '95% Ready',
    totalBudget: '₹2,80,000',
    disbursedNote: '₹1,76,000 Disbursed (63%)',
    copilotAlert: 'Saved ₹26,500 on eco-brass diya installations & stalls',
    allocations: [
      { name: 'Heritage Pavilion & Eco-Lighting (34%)', amount: '₹95,200', pct: 34, colorClass: 'bg-[#542D38]' },
      { name: 'Regional Chaat & Mithai Artisans (30%)', amount: '₹84,000', pct: 30, colorClass: 'bg-[#B84B32]' },
      { name: 'Classical Folk & Percussion Stage (20%)', amount: '₹56,000', pct: 20, colorClass: 'bg-[#C6A364]' },
      { name: 'Safety, Permits & Valet Marshall (16%)', amount: '₹44,800', pct: 16, colorClass: 'bg-[#899681]' },
    ],
    whatsappPrompt:
      '“Add 2 extra Phulkari craft stalls near the East Lawn and confirm fire NOC for 1,200 brass diyas.”',
    whatsappReply:
      'East Lawn stall grid updated. Fire marshal certificate logged and ₹12,000 allocated from contingency float.',
    callSheet: [
      {
        time: '17:30',
        timeBadgeClass: 'bg-[#542D38] text-white',
        title: '1,200 Terracotta Diya Lighting Ceremony',
        subtitle: 'Main Courtyard • Community Captains Positioned',
      },
      {
        time: '19:00',
        timeBadgeClass: 'bg-[#B84B32] text-white',
        title: 'Maha Aarti & Classical Sitar Recital',
        subtitle: 'Durbar Stage • Acoustic Array Calibrated',
        highlight: true,
      },
      {
        time: '20:30',
        timeBadgeClass: 'bg-[#282522] text-white',
        title: 'Regional Royal Mithai & Feast Promenade',
        subtitle: '6 Live Culinary Counters • Zero-Waste Service',
      },
    ],
  },
  {
    id: 'soiree',
    demoEventId: 'demo_event_pune_birthday_02',
    label: 'Private Soirées & High Teas',
    count: '310+',
    icon: 'local_florist',
    title: 'Singhal Silver Jubilee Champagne Tea',
    venue: 'Taj Falaknuma Terrace, Hyderabad',
    dates: 'Dec 19, 2026',
    guests: '120 Guests',
    readiness: '99% Ready',
    totalBudget: '₹6,40,000',
    disbursedNote: '₹4,48,000 Disbursed (70%)',
    copilotAlert: 'Saved ₹52,000 on imported Dutch hydrangea stems',
    allocations: [
      { name: 'Jade Lawn & Heritage Tea Service (42%)', amount: '₹2,68,800', pct: 42, colorClass: 'bg-[#542D38]' },
      { name: 'Pastel Rose & Brass Scenography (28%)', amount: '₹1,79,200', pct: 28, colorClass: 'bg-[#B84B32]' },
      { name: 'String Quartet & Sound Design (16%)', amount: '₹1,02,400', pct: 16, colorClass: 'bg-[#C6A364]' },
      { name: 'Bespoke Silver Keepsake Hampers (14%)', amount: '₹89,600', pct: 14, colorClass: 'bg-[#899681]' },
    ],
    whatsappPrompt:
      '“Ensure 28 sugar-free artisanal petit fours and horse-drawn carriage arrival at 16:45 IST.”',
    whatsappReply:
      'Pastry Chef confirmed 28 sugar-free rose pistachio mille-feuilles. Main porch carriage cue locked at 16:45 IST.',
    callSheet: [
      {
        time: '16:45',
        timeBadgeClass: 'bg-[#542D38] text-white',
        title: 'Royal Buggy Arrival & Rose Petal Shower',
        subtitle: 'Grand Staircase • String Quartet Live',
      },
      {
        time: '17:30',
        timeBadgeClass: 'bg-[#B84B32] text-white',
        title: 'Nizami High Tea & Silver Jubilee Toast',
        subtitle: 'Jade Terrace • Sunset Horizon Lock',
        highlight: true,
      },
      {
        time: '19:45',
        timeBadgeClass: 'bg-[#282522] text-white',
        title: 'Ghazal Evening under Chandeliers',
        subtitle: 'Durbar Hall • Seated Intimate Gathering',
      },
    ],
  },
  {
    id: 'sangeet',
    demoEventId: 'demo_event_mumbai_wedding_01',
    label: 'Curated Sangeet Showcases',
    count: '640+',
    icon: 'music_note',
    title: 'Aarav & Ananya Royal Sufi Sangeet',
    venue: 'Taj Mahal Palace Ballroom, Mumbai',
    dates: 'Dec 12, 2026',
    guests: '300 Guests',
    readiness: '97% Ready',
    totalBudget: '₹12,00,000',
    disbursedNote: '₹8,10,000 Disbursed (68%)',
    copilotAlert: 'Saved ₹95,000 on L-Acoustics line array & LED wall bundle',
    allocations: [
      { name: 'Ballroom Buyout & Royal Banquets (40%)', amount: '₹4,80,000', pct: 40, colorClass: 'bg-[#542D38]' },
      { name: 'Fairy-Light Canopy & Mirror Stage (26%)', amount: '₹3,12,000', pct: 26, colorClass: 'bg-[#B84B32]' },
      { name: 'Sufi Ensemble, DJ & Timecoded DMX (20%)', amount: '₹2,40,000', pct: 20, colorClass: 'bg-[#C6A364]' },
      { name: 'Choreography Rehearsals & Hospitality (14%)', amount: '₹1,68,000', pct: 14, colorClass: 'bg-[#899681]' },
    ],
    whatsappPrompt:
      '“Sync 14 family performance tracks with the DMX lighting cue sheet before 20:15 IST.”',
    whatsappReply:
      'All 14 WAV stems time-coded with FOH engineer. Family rehearsal call-times dispatched via WhatsApp.',
    callSheet: [
      {
        time: '19:30',
        timeBadgeClass: 'bg-[#542D38] text-white',
        title: 'Red Carpet Cocktails & Mirror Installations',
        subtitle: 'Crystal Foyer • Live Santoor Fusion',
      },
      {
        time: '20:30',
        timeBadgeClass: 'bg-[#B84B32] text-white',
        title: '14 Choreographed Family Showcases',
        subtitle: 'Main Stage • Timecoded Audio & Pyro',
        highlight: true,
      },
      {
        time: '22:15',
        timeBadgeClass: 'bg-[#282522] text-white',
        title: 'Nizami Brothers Sufi Qawwali & Afterparty',
        subtitle: 'Acoustic Ballroom • Curfew Compliant',
      },
    ],
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onEnterDemo,
  isSigningIn,
}) => {
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>('wedding');
  const activeArchetype =
    ARCHETYPES.find((item) => item.id === selectedArchetypeId) || ARCHETYPES[0];

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#282522] font-sans antialiased selection:bg-[#B84B32] selection:text-[#F8F5EF] overflow-x-hidden">
      {/* 1. STICKY FROSTED LUXURY HEADER */}
      <header className="sticky top-0 z-50 w-full bg-[#F8F5EF]/85 backdrop-blur-xl border-b border-[#C6A364]/25 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-[#542D38] flex items-center justify-center text-[#F8F5EF] shadow-md border border-[#C6A364]/60 group-hover:bg-[#B84B32] transition-colors">
              <span className="font-serif-display text-xl tracking-wider italic">G</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif-display text-2xl leading-none text-[#282522] tracking-tight">
                Gatherly <span className="italic font-normal text-[#B84B32]">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#57423D] font-semibold mt-0.5">
                Editorial Event Tech
              </span>
            </div>
          </a>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-9 text-sm font-medium text-[#282522]/85">
            <a
              className="hover:text-[#B84B32] transition-colors py-1 border-b-2 border-transparent hover:border-[#B84B32]"
              href="#command-center"
            >
              Command Center
            </a>
            <a
              className="hover:text-[#B84B32] transition-colors py-1 border-b-2 border-transparent hover:border-[#B84B32]"
              href="#scenography"
            >
              Scenography
            </a>
            <a
              className="hover:text-[#B84B32] transition-colors py-1 border-b-2 border-transparent hover:border-[#B84B32]"
              href="#gemini-copilot"
            >
              Gemini Copilot
            </a>
            <a
              className="hover:text-[#B84B32] transition-colors py-1 border-b-2 border-transparent hover:border-[#B84B32]"
              href="#archive"
            >
              Real Celebrations
            </a>
          </nav>

          {/* Right Utilities & CTAs */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* INR Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDE5D8]/80 border border-[#C6A364]/40 text-xs font-semibold text-[#282522]">
              <span className="text-[#9E7A38] font-bold">₹</span>
              <span>INR</span>
              <span className="material-symbols-outlined text-[14px] text-[#57423D]">
                expand_more
              </span>
            </div>

            <button
              type="button"
              onClick={() => onEnterDemo(activeArchetype.demoEventId)}
              className="hidden md:inline-flex text-sm font-semibold text-[#282522] hover:text-[#B84B32] transition-colors px-3 py-2 cursor-pointer"
            >
              Interactive Demo
            </button>

            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="hidden sm:inline-flex text-sm font-semibold text-[#282522] hover:text-[#B84B32] transition-colors px-3 py-2 cursor-pointer disabled:opacity-60"
            >
              {isSigningIn ? 'Connecting...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B84B32] hover:bg-[#98341D] text-[#F8F5EF] text-xs sm:text-sm font-semibold tracking-wide shadow-md hover:shadow-lg transition-all border border-[#C6A364]/40 cursor-pointer disabled:opacity-60"
            >
              <span>Plan Your Celebration</span>
              <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 2. DRAMATIC IMAGE-LED CINEMATIC HERO */}
        <section className="relative pt-8 pb-20 lg:pt-12 lg:pb-28 px-4 sm:px-6 max-w-7xl mx-auto">
          {/* Top Editorial Kicker & Headline */}
          <div className="max-w-4xl mx-auto text-center mb-10 lg:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EDE5D8] border border-[#C6A364]/50 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#B84B32] animate-pulse"></span>
              <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#542D38]">
                Where Grand Traditions Meet Modern Intelligence
              </span>
            </div>

            <h1 className="font-serif-display text-4xl sm:text-6xl lg:text-[68px] text-[#282522] leading-[1.06] tracking-tight mb-6">
              Big celebrations.{' '}
              <span className="italic font-normal text-[#542D38]">Breathtakingly</span>{' '}
              orchestrated.
            </h1>

            <p className="font-sans text-base sm:text-lg lg:text-xl text-[#57423D] max-w-2xl mx-auto leading-relaxed font-normal">
              From royal palatial courtyards in Udaipur to intimate candlelit milestone galas—command
              every rupee, ritual, and RSVP through India’s premier editorial event intelligence
              suite.
            </p>

            {/* Primary Hero CTA Group */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#542D38] hover:bg-[#3A1A22] text-[#F8F5EF] text-sm font-semibold tracking-wide shadow-luxury transition-all border border-[#C6A364]/50 cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[#E9D8B4] text-[20px]">
                  auto_awesome
                </span>
                <span>{isSigningIn ? 'Signing In...' : 'Design Your Celebration'}</span>
              </button>

              <button
                type="button"
                onClick={() => onEnterDemo(activeArchetype.demoEventId)}
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-[#FAF2ED] hover:bg-[#EDE5D8] text-[#282522] text-sm font-semibold border border-[#C6A364]/60 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#B84B32] text-[20px]">
                  play_circle
                </span>
                <span>Explore Live Workspace (₹12L Demo)</span>
              </button>
            </div>
          </div>

          {/* Central Grand Stage Image + Floating Glassmorphic Intelligence Cards */}
          <div className="relative mx-auto max-w-6xl">
            {/* Main Hero Photograph Container */}
            <div className="relative rounded-3xl overflow-hidden shadow-luxury-deep border-2 border-[#C6A364]/40 aspect-[16/10] sm:aspect-[16/9] bg-[#282522]">
              <img
                src={STITCH_ASSETS.palaceHero}
                alt="Majestic Indian palace courtyard reception under golden chandelier lighting"
                className="w-full h-full object-cover object-center transform hover:scale-102 transition-transform duration-1000"
              />
              {/* Warm Editorial Scrim Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#282522]/90 via-[#282522]/25 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#282522]/50 via-transparent to-[#282522]/40"></div>

              {/* Bottom Left Caption inside Hero Image */}
              <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 z-10 max-w-md text-[#F8F5EF]">
                <div className="flex items-center gap-2 text-[#E9D8B4] text-xs uppercase tracking-[0.18em] font-semibold mb-1.5">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>The Oberoi Udaivilās • Mewar Courtyard</span>
                </div>
                <p className="font-serif-display text-xl sm:text-2xl leading-snug text-[#FAF2ED]">
                  “The Royal Anand Karaj &amp; Candlelit Reception of Aria &amp; Devansh”
                </p>
                <p className="text-xs text-[#EDE5D8]/80 mt-1">
                  350 Royal Guests • 4 Days • Orchestrated with Gatherly AI
                </p>
              </div>
            </div>

            {/* FLOATING CARD 1: Top-Left Live Budget & Escrow Ledger */}
            <div className="hidden md:block absolute -top-6 -left-6 lg:-left-10 z-20 w-80 rounded-2xl bg-[#FAF2ED]/95 backdrop-blur-xl p-5 shadow-luxury border border-[#C6A364]/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#542D38] text-[#E9D8B4] flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">
                      account_balance_wallet
                    </span>
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#57423D] font-bold">
                      Master Ledger • Multi-Day
                    </p>
                    <p className="font-serif-display text-lg text-[#282522] leading-none">
                      ₹12,00,000
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#899681]/20 text-[#4C5946] text-[10px] font-bold uppercase tracking-wider border border-[#899681]/40">
                  On Track
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[#282522] font-medium mb-1">
                    <span>Palace Venue &amp; Hospitality</span>
                    <span className="font-semibold">₹4,80,000</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#EDE5D8] overflow-hidden">
                    <div className="bg-[#542D38] h-full rounded-full w-[78%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[#282522] font-medium mb-1">
                    <span>Sabyasachi-Inspired Floral Mandap</span>
                    <span className="font-semibold">₹3,10,000</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#EDE5D8] overflow-hidden">
                    <div className="bg-[#B84B32] h-full rounded-full w-[64%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* FLOATING CARD 2: Top-Right Gemini Copilot Live Suggestion */}
            <div className="hidden md:block absolute -top-8 -right-4 lg:-right-8 z-20 w-80 rounded-2xl bg-[#282522]/95 backdrop-blur-xl p-5 shadow-luxury text-[#F8F5EF] border border-[#C6A364]/60">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="w-7 h-7 rounded-full gold-shimmer text-[#282522] flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-base font-bold">
                    auto_awesome
                  </span>
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#E9D8B4] font-bold">
                    Google Gemini Copilot
                  </p>
                  <p className="text-xs text-[#EDE5D8]/80">Real-Time Event Intelligence</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[#FAF2ED]/95 italic font-serif-display text-sm">
                “Sunset Muhurat in Udaipur shifts to 5:42 PM. I’ve adjusted the Baraat procession
                by 20 mins and alerted the 14-piece Dhol ensemble.”
              </p>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-[#E9D8B4] font-medium">3 Vendors Auto-Synced</span>
                <button
                  type="button"
                  onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                  className="text-white font-semibold underline decoration-[#C6A364] cursor-pointer"
                >
                  Approve Shift →
                </button>
              </div>
            </div>

            {/* FLOATING CARD 3: Bottom-Right Live RSVP & Hospitality Chip */}
            <div className="hidden sm:flex absolute -bottom-6 right-6 lg:right-12 z-20 items-center gap-4 rounded-2xl bg-[#FAF2ED]/95 backdrop-blur-xl px-5 py-4 shadow-luxury border border-[#C6A364]/60">
              <div className="flex -space-x-2.5">
                <span className="w-9 h-9 rounded-full bg-[#542D38] text-[#FAF2ED] font-serif-display text-sm flex items-center justify-center ring-2 ring-[#FAF2ED]">
                  RK
                </span>
                <span className="w-9 h-9 rounded-full bg-[#B84B32] text-[#FAF2ED] font-serif-display text-sm flex items-center justify-center ring-2 ring-[#FAF2ED]">
                  AS
                </span>
                <span className="w-9 h-9 rounded-full bg-[#4C5946] text-[#FAF2ED] font-serif-display text-sm flex items-center justify-center ring-2 ring-[#FAF2ED]">
                  VM
                </span>
                <span className="w-9 h-9 rounded-full bg-[#C6A364] text-[#282522] font-bold text-xs flex items-center justify-center ring-2 ring-[#FAF2ED]">
                  +347
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4C5946]"></span>
                  <p className="text-xs font-bold text-[#282522]">
                    320 of 350 Royal Guests Confirmed
                  </p>
                </div>
                <p className="text-[11px] text-[#57423D]">
                  WhatsApp Concierge • 48 Maharana Suites Assigned
                </p>
              </div>
            </div>

            {/* FLOATING CARD 4: Bottom-Left Day-2 Sangeet Run-of-Show Pill */}
            <div className="hidden lg:flex absolute bottom-8 -left-8 z-20 items-center gap-3 rounded-2xl bg-[#542D38]/95 backdrop-blur-md px-4 py-3 text-[#FAF2ED] shadow-luxury border border-[#C6A364]/50">
              <span className="material-symbols-outlined text-[#E9D8B4] text-2xl">
                nightlife
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#E9D8B4] font-bold">
                  Day 2 • 8:30 PM IST
                </p>
                <p className="text-xs font-semibold">Royal Sangeet &amp; Sufi Night</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. INTERACTIVE OCCASION ARCHETYPE BAR */}
        <section className="border-y border-[#C6A364]/30 bg-[#EDE5D8]/60 py-5 sticky top-20 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#57423D] font-bold whitespace-nowrap hidden xl:inline-block">
                Curated Archetypes:
              </span>
              <div className="flex items-center gap-2.5 sm:gap-3 mx-auto xl:mx-0">
                {ARCHETYPES.map((arch) => {
                  const isActive = arch.id === activeArchetype.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setSelectedArchetypeId(arch.id)}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#542D38] text-[#FAF2ED] font-semibold shadow-sm border border-[#C6A364]/60'
                          : 'bg-[#FAF2ED] hover:bg-white text-[#282522] font-medium border border-[#C6A364]/30'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          isActive ? 'text-[#E9D8B4]' : 'text-[#B84B32]'
                        }`}
                      >
                        {arch.icon}
                      </span>
                      <span>{arch.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          isActive
                            ? 'bg-white/15 text-[#E9D8B4]'
                            : 'bg-[#EDE5D8] text-[#57423D]'
                        }`}
                      >
                        {arch.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 4. ASYMMETRIC EDITORIAL WORKSPACE PREVIEW (COMMAND CENTER) */}
        <section id="command-center" className="py-20 lg:py-28 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Column: Editorial Narrative & Feature Pillars (5 Cols) */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 text-[#B84B32] text-xs uppercase tracking-[0.2em] font-bold mb-3">
                  <span className="w-6 h-[1px] bg-[#B84B32]"></span>
                  <span>The Master Command Center</span>
                </div>
                <h2 className="font-serif-display text-3xl sm:text-5xl text-[#282522] leading-[1.12]">
                  Architectural precision for emotionally priceless moments.
                </h2>
                <p className="mt-4 text-[#57423D] text-base leading-relaxed">
                  Replace fragmented spreadsheets and chaotic WhatsApp groups with a single,
                  design-forward workspace built for Indian multi-day celebrations and luxury
                  hospitality teams.
                </p>
              </div>

              {/* 3 Feature Pillar Callouts */}
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[#FAF2ED] border border-[#C6A364]/40 shadow-sm hover:border-[#B84B32] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#542D38] text-[#E9D8B4] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-xl">currency_rupee</span>
                    </div>
                    <div>
                      <h3 className="font-serif-display text-xl text-[#282522]">
                        Multi-Event INR Ledger &amp; GST Tracking
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57423D] mt-1 leading-relaxed">
                        Allocate budgets across Mehendi, Haldi, Sangeet, Baraat, and Reception with
                        automated vendor milestone releases and live variance alerts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF2ED] border border-[#C6A364]/40 shadow-sm hover:border-[#B84B32] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#B84B32] text-[#FAF2ED] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-xl">diversity_3</span>
                    </div>
                    <div>
                      <h3 className="font-serif-display text-xl text-[#282522]">
                        Royal Guest &amp; Rooming Matrix
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57423D] mt-1 leading-relaxed">
                        Track family households, dietary preferences (Jain, Sattvic, Vegan), airport
                        chauffeur dispatches, and suite keys in real time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF2ED] border border-[#C6A364]/40 shadow-sm hover:border-[#B84B32] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#4C5946] text-[#FAF2ED] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-xl">schedule</span>
                    </div>
                    <div>
                      <h3 className="font-serif-display text-xl text-[#282522]">
                        Muhurat-Synced Run of Show
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57423D] mt-1 leading-relaxed">
                        Minute-by-minute production timelines linking sound checks, floral load-ins,
                        and auspicious ceremony windows across 15+ vendors.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Rich Interactive SaaS Command Center UI Mockup (7 Cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl bg-[#282522] p-3 sm:p-5 shadow-luxury-deep border-2 border-[#C6A364]/50">
                {/* Browser Top Bar */}
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#B84B32]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#C6A364]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#899681]"></span>
                    <span className="ml-2 text-xs text-[#EDE5D8]/70 font-medium">
                      gatherly.ai/workspace/{activeArchetype.id}-suite
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#542D38] text-[#E9D8B4] text-[10px] font-bold uppercase tracking-wider border border-[#C6A364]/40">
                      Live Gemini 2.5 Sync
                    </span>
                  </div>
                </div>

                {/* Inner Workspace Canvas */}
                <div className="rounded-2xl bg-[#F8F5EF] p-5 sm:p-6 text-[#282522] space-y-6">
                  {/* Workspace Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#C6A364]/30">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#B84B32] font-bold">
                        Active Celebration Workspace
                      </span>
                      <h4 className="font-serif-display text-2xl text-[#282522]">
                        {activeArchetype.title}
                      </h4>
                      <p className="text-xs text-[#57423D]">
                        {activeArchetype.venue} • {activeArchetype.dates} • {activeArchetype.guests}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-[#EDE5D8] text-xs font-bold text-[#542D38]">
                        Readiness: {activeArchetype.readiness}
                      </div>
                      <button
                        type="button"
                        onClick={() => onEnterDemo(activeArchetype.demoEventId)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#B84B32] hover:bg-[#98341D] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Open Live Suite
                      </button>
                    </div>
                  </div>

                  {/* Budget & Category Allocation Bar */}
                  <div className="bg-[#FAF2ED] rounded-2xl p-4 border border-[#C6A364]/40">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#57423D] font-bold">
                          Allocated Capital Matrix
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif-display text-2xl sm:text-3xl text-[#282522]">
                            {activeArchetype.totalBudget}
                          </span>
                          <span className="text-xs text-[#4C5946] font-semibold">
                            • {activeArchetype.disbursedNote}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[#899681]/20 text-[#4C5946] font-semibold">
                        AI Audit: {activeArchetype.copilotAlert}
                      </span>
                    </div>

                    {/* Progress Bars Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {activeArchetype.allocations.map((alloc) => (
                        <div
                          key={alloc.name}
                          className="p-3 rounded-xl bg-white border border-[#EDE5D8]"
                        >
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span>{alloc.name}</span>
                            <span className="text-[#542D38]">{alloc.amount}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#EDE5D8] rounded-full">
                            <div
                              className={`${alloc.colorClass} h-1.5 rounded-full`}
                              style={{ width: `${Math.min(100, alloc.pct * 2)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Split: Gemini Copilot Chat + Day-of Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mini Gemini Copilot Prompt Box */}
                    <div className="rounded-2xl bg-[#542D38] text-[#FAF2ED] p-4 flex flex-col justify-between border border-[#C6A364]/50">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#E9D8B4] font-bold">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            Concierge WhatsApp Chat
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/10 text-xs text-[#EDE5D8] mb-2.5">
                          {activeArchetype.whatsappPrompt}
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#282522]/70 border border-[#C6A364]/40 text-xs text-[#FAF2ED]">
                          <span className="text-[#E9D8B4] font-semibold">Gemini Copilot:</span>{' '}
                          {activeArchetype.whatsappReply}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-[#E9D8B4]">
                        <span>Ready for voice or text command</span>
                        <button
                          type="button"
                          onClick={() => onEnterDemo(activeArchetype.demoEventId)}
                          className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>Launch Copilot</span>
                          <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                      </div>
                    </div>

                    {/* Mini Live Run-of-Show */}
                    <div className="rounded-2xl bg-white p-4 border border-[#C6A364]/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-[#57423D]">
                          Day-of Precision Call Sheet
                        </span>
                        <span className="text-[11px] font-semibold text-[#B84B32]">
                          Udaipur / IST
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {activeArchetype.callSheet.map((cue) => (
                          <div
                            key={cue.time}
                            className={`flex items-center gap-2.5 p-2 rounded-lg ${
                              cue.highlight
                                ? 'bg-[#B84B32]/10 border border-[#B84B32]/30'
                                : 'bg-[#FAF2ED]'
                            }`}
                          >
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${cue.timeBadgeClass}`}
                            >
                              {cue.time}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#282522] truncate">{cue.title}</p>
                              <p className="text-[10px] text-[#57423D] truncate">{cue.subtitle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. VISUAL STORYTELLING & ASYMMETRIC EDITORIAL TILES */}
        <section
          id="scenography"
          className="py-20 lg:py-28 bg-[#EDE5D8]/55 border-y border-[#C6A364]/30"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20">
            {/* Section Title */}
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-[#542D38] text-xs uppercase tracking-[0.2em] font-bold mb-3">
                <span className="w-6 h-[1px] bg-[#542D38]"></span>
                <span>Bespoke Scenography &amp; Rituals</span>
              </div>
              <h2 className="font-serif-display text-3xl sm:text-5xl text-[#282522] leading-[1.12]">
                Designed like a luxury magazine. Engineered like a mission control room.
              </h2>
            </div>

            {/* TILE 1: Royal Mandap & Floral Scenography */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7 relative">
                <div className="rounded-3xl overflow-hidden shadow-luxury border-2 border-[#C6A364]/40 aspect-[16/10] bg-[#282522]">
                  <img
                    src={STITCH_ASSETS.floralMandap}
                    alt="Opulent floral mandap installation with cascading marigolds and brass bells over Lake Pichola"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#282522]/70 via-transparent to-transparent"></div>
                  <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4 text-[#FAF2ED]">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-[#B84B32] text-[10px] uppercase tracking-widest font-bold">
                        Scenography Blueprint #04
                      </span>
                      <p className="font-serif-display text-2xl mt-2">
                        The Saffron Sunset Mandap over Lake Pichola
                      </p>
                    </div>
                    <div className="bg-[#282522]/85 backdrop-blur-md px-4 py-2 rounded-xl border border-[#C6A364]/50 text-xs">
                      <span className="text-[#E9D8B4] font-bold">Vendor Lock:</span> ₹3,12,000 •
                      100% Milestone Insured
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <span className="px-3 py-1 rounded-full bg-[#542D38]/10 text-[#542D38] text-xs font-bold uppercase tracking-widest">
                  01 • Aesthetic &amp; Floral Intelligence
                </span>
                <h3 className="font-serif-display text-3xl sm:text-4xl text-[#282522] leading-tight">
                  Turn moodboards into itemized vendor production sheets.
                </h3>
                <p className="text-[#57423D] text-base leading-relaxed">
                  Upload your inspiration frames and let Gatherly AI translate visual aesthetics
                  into exact stem counts of Calcutta marigold, Dutch hydrangeas, brass urlis, and
                  structural rigging schedules—matched directly with vetted palace decorators.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-[#FAF2ED] border border-[#C6A364]/40">
                    <p className="font-serif-display text-2xl text-[#B84B32]">24,000+</p>
                    <p className="text-xs text-[#57423D] font-medium mt-0.5">
                      Fresh Floral Stems Quantified by AI
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAF2ED] border border-[#C6A364]/40">
                    <p className="font-serif-display text-2xl text-[#542D38]">18:14 IST</p>
                    <p className="text-xs text-[#57423D] font-medium mt-0.5">
                      Exact Golden-Hour Lighting Cue
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* TILE 2: Reversed — Intimate Royal Sangeet Night */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5 order-2 lg:order-1 space-y-6">
                <span className="px-3 py-1 rounded-full bg-[#B84B32]/15 text-[#B84B32] text-xs font-bold uppercase tracking-widest">
                  02 • Multi-Day Sangeet &amp; Soirée Production
                </span>
                <h3 className="font-serif-display text-3xl sm:text-4xl text-[#282522] leading-tight">
                  Every choreographed cue, acoustic check, and midnight toast in harmony.
                </h3>
                <p className="text-[#57423D] text-base leading-relaxed">
                  Whether orchestrating 14 family Sangeet performances, managing acoustic curfew
                  buffers, or coordinating bespoke mixology bars under a canopy of 50,000 fairy
                  lights—your production team operates from one live truth.
                </p>

                <ul className="space-y-3 text-sm text-[#282522]">
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#4C5946] text-white flex items-center justify-center text-xs">
                      ✓
                    </span>
                    <span>
                      Automated rehearsal slot scheduling for 40+ family performers
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#4C5946] text-white flex items-center justify-center text-xs">
                      ✓
                    </span>
                    <span>
                      Direct audiovisual cue sheets synced with DJ &amp; lighting engineers
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#4C5946] text-white flex items-center justify-center text-xs">
                      ✓
                    </span>
                    <span>
                      Real-time bar consumption &amp; vintage pouring alerts
                    </span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7 order-1 lg:order-2 relative">
                <div className="rounded-3xl overflow-hidden shadow-luxury border-2 border-[#C6A364]/40 aspect-[16/10] bg-[#282522]">
                  <img
                    src={STITCH_ASSETS.sangeetCanopy}
                    alt="Intimate royal Sangeet night celebration under a canopy of warm fairy lights"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#282522]/75 via-transparent to-transparent"></div>
                  <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4 text-[#FAF2ED]">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-[#542D38] border border-[#C6A364]/50 text-[10px] uppercase tracking-widest font-bold text-[#E9D8B4]">
                        Sangeet Night • Day 2
                      </span>
                      <p className="font-serif-display text-2xl mt-2">
                        Starlight Courtyard &amp; Sufi Acoustic Showcase
                      </p>
                    </div>
                    <div className="bg-[#FAF2ED]/95 text-[#282522] px-4 py-2 rounded-xl text-xs font-semibold shadow">
                      14 Family Performances • 0 Mins Delay
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. GEMINI EVENT INTELLIGENCE HIGHLIGHT */}
        <section id="gemini-copilot" className="py-20 lg:py-28 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-[#282522] via-[#3A1A22] to-[#282522] text-[#FAF2ED] p-8 sm:p-12 lg:p-16 shadow-luxury-deep border-2 border-[#C6A364]/50 relative overflow-hidden">
            <div className="max-w-3xl mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#C6A364]/50 text-[#E9D8B4] text-xs font-bold uppercase tracking-widest mb-4">
                <span className="material-symbols-outlined text-base">temp_preferences_custom</span>
                <span>Powered by Google Gemini 2.5 Pro</span>
              </div>
              <h2 className="font-serif-display text-3xl sm:text-5xl leading-[1.12] text-[#FAF2ED]">
                An executive producer that never sleeps, forgets, or misses a clause.
              </h2>
              <p className="mt-4 text-[#EDE5D8]/80 text-base sm:text-lg">
                Gatherly’s Gemini Copilot reads 40-page hotel banquet contracts, negotiates force
                majeure clauses, and answers guest queries on WhatsApp in English, Hindi, and
                Marwari.
              </p>
            </div>

            {/* 3 Interactive AI Scenario Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Scenario 1 */}
              <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-[#C6A364]/35 flex flex-col justify-between hover:border-[#E9D8B4] transition-all">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#E9D8B4] mb-4">
                    <span className="uppercase tracking-widest font-bold">Contract Intelligence</span>
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <p className="text-xs text-[#EDE5D8]/70 uppercase font-semibold mb-1">
                    Input Document:
                  </p>
                  <p className="font-serif-display text-lg text-white mb-4">
                    “40-Page Palace Hotel Banquet &amp; Corkage Rider.pdf”
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#282522]/90 border border-[#B84B32]/60 text-xs space-y-1.5">
                    <p className="text-[#E9D8B4] font-bold">Gemini Risk Detection:</p>
                    <p className="text-[#EDE5D8]/90 leading-relaxed">
                      Flagged hidden ₹2,50,000 generator surcharge after 11:00 PM and double GST on
                      external floral rigging. Drafted redline addendum.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#E9D8B4]">
                  <span>Estimated Savings: ₹3,15,000</span>
                  <span className="font-bold">Verified ✓</span>
                </div>
              </div>

              {/* Scenario 2 */}
              <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-[#C6A364]/35 flex flex-col justify-between hover:border-[#E9D8B4] transition-all">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#E9D8B4] mb-4">
                    <span className="uppercase tracking-widest font-bold">
                      Bilingual Guest Concierge
                    </span>
                    <span className="material-symbols-outlined">forum</span>
                  </div>
                  <p className="text-xs text-[#EDE5D8]/70 uppercase font-semibold mb-1">
                    WhatsApp Inbound:
                  </p>
                  <p className="font-serif-display text-lg text-white mb-4">
                    “Bua Ji &amp; 6 family members landing at Maharana Pratap Airport at 2:15 PM—need
                    Jain lunch on arrival.”
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#282522]/90 border border-[#899681]/60 text-xs space-y-1.5">
                    <p className="text-[#E9D8B4] font-bold">Autonomous Dispatch:</p>
                    <p className="text-[#EDE5D8]/90 leading-relaxed">
                      Assigned Toyota Vellfire #04 at DABOK exit, pre-checked Suite 208, and alerted
                      Executive Chef for 6 hot Jain Thaalis at 3:00 PM.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#E9D8B4]">
                  <span>Response Time: 1.8 Seconds</span>
                  <span className="font-bold">Auto-Handled ✓</span>
                </div>
              </div>

              {/* Scenario 3 */}
              <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-[#C6A364]/35 flex flex-col justify-between hover:border-[#E9D8B4] transition-all">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#E9D8B4] mb-4">
                    <span className="uppercase tracking-widest font-bold">
                      Dynamic Weather Contingency
                    </span>
                    <span className="material-symbols-outlined">thunderstorm</span>
                  </div>
                  <p className="text-xs text-[#EDE5D8]/70 uppercase font-semibold mb-1">
                    Live Radar Trigger:
                  </p>
                  <p className="font-serif-display text-lg text-white mb-4">
                    “Unseasonal 40% drizzle forecast during outdoor Haldi carnival at 11:30 AM.”
                  </p>
                  <div className="p-3.5 rounded-xl bg-[#282522]/90 border border-[#C6A364]/60 text-xs space-y-1.5">
                    <p className="text-[#E9D8B4] font-bold">Instant Plan-B Execution:</p>
                    <p className="text-[#EDE5D8]/90 leading-relaxed">
                      Activated transparent waterproof Shamiana dome crew 4 hours prior and shifted
                      organic marigold cannons to covered colonnade.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#E9D8B4]">
                  <span>Zero Ceremony Disruption</span>
                  <span className="font-bold">Protected ✓</span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10">
              <p className="text-xs sm:text-sm text-[#EDE5D8]/80">
                Try the live Gemini 2.5 Copilot with real Indian wedding, birthday, and festival
                budgets right now.
              </p>
              <button
                type="button"
                onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#B84B32] hover:bg-[#98341D] text-white text-xs font-bold uppercase tracking-wider border border-[#C6A364] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                <span>Launch Gemini Copilot Workspace</span>
              </button>
            </div>
          </div>
        </section>

        {/* 7. CURATED EDITORIAL INSPIRATION MOSAIC */}
        <section id="archive" className="w-full py-20 bg-[#F8F5EF] border-t border-[#EDE5D8]">
          <div className="max-w-7xl mx-auto px-6">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#542D38]/10 border border-[#542D38]/20 text-[#542D38] text-xs font-bold uppercase tracking-widest mb-3">
                  <span className="material-symbols-outlined text-xs">photo_library</span>
                  <span>The Editorial Archive</span>
                </div>
                <h2 className="font-serif-display text-3xl sm:text-5xl text-[#282522] tracking-tight">
                  Curated Destination Masterpieces
                </h2>
              </div>
              <p className="font-sans text-sm text-[#57423D] max-w-md">
                Every celebration orchestrated on Gatherly combines architectural grandeur with
                invisible financial and logistical precision.
              </p>
            </div>

            {/* Asymmetric Magazine Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Mosaic Item 1: Large 7-col Feature */}
              <div
                onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                className="md:col-span-7 group relative rounded-3xl overflow-hidden shadow-luxury border border-[#C6A364]/40 aspect-[16/11] bg-[#282522] cursor-pointer"
              >
                <img
                  src={STITCH_ASSETS.palaceHero}
                  alt="Palace Courtyard Reception"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#282522]/90 via-[#282522]/20 to-transparent"></div>
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#282522]/80 backdrop-blur-md text-[#E9D8B4] border border-[#C6A364]/40 text-xs font-bold uppercase tracking-wider">
                    Udaipur, Rajasthan
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#B84B32]/90 text-white text-xs font-bold">
                    ₹12,00,000 Ledger
                  </span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 text-[#F8F5EF]">
                  <p className="text-xs uppercase tracking-widest text-[#E9D8B4] font-semibold">
                    3-Day Royal Wedding • 350 Guests
                  </p>
                  <h3 className="font-serif-display text-2xl sm:text-3xl mt-1">
                    The Oberoi Udaivilās Imperial Union
                  </h3>
                  <p className="text-xs text-[#EDE5D8]/80 mt-2">
                    42 Vendors Synchronized • Zero Budget Overrun • 99.4% Guest Satisfaction
                  </p>
                </div>
              </div>

              {/* Mosaic Item 2: Tall 5-col Feature */}
              <div
                onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                className="md:col-span-5 group relative rounded-3xl overflow-hidden shadow-luxury border border-[#C6A364]/40 aspect-[4/5] md:aspect-auto bg-[#282522] cursor-pointer"
              >
                <img
                  src={STITCH_ASSETS.floralMandap}
                  alt="Golden Floral Mandap"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#282522]/90 via-[#282522]/20 to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-[#282522]/80 backdrop-blur-md text-[#E9D8B4] border border-[#C6A364]/40 text-xs font-bold uppercase tracking-wider">
                    Jaipur, Rambagh
                  </span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 text-[#F8F5EF]">
                  <p className="text-xs uppercase tracking-widest text-[#E9D8B4] font-semibold">
                    Architectural Floral Design
                  </p>
                  <h3 className="font-serif-display text-2xl mt-1">
                    Saffron &amp; Brass Mandap Pavilion
                  </h3>
                  <p className="text-xs text-[#EDE5D8]/80 mt-1">
                    AI-optimized floral stem procurement across 6 local markets.
                  </p>
                </div>
              </div>

              {/* Mosaic Item 3: 6-col Sangeet Feature */}
              <div
                onClick={() => onEnterDemo('demo_event_pune_birthday_02')}
                className="md:col-span-6 group relative rounded-3xl overflow-hidden shadow-luxury border border-[#C6A364]/40 aspect-[16/10] bg-[#282522] cursor-pointer"
              >
                <img
                  src={STITCH_ASSETS.sangeetCanopy}
                  alt="Sangeet Canopy Celebration"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#282522]/90 via-[#282522]/20 to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-[#542D38]/90 text-[#E9D8B4] border border-[#C6A364]/40 text-xs font-bold uppercase tracking-wider">
                    Pune &amp; Goa • Sundowner Soirée
                  </span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 text-[#F8F5EF]">
                  <p className="text-xs uppercase tracking-widest text-[#E9D8B4] font-semibold">
                    Sangeet &amp; Milestone Jubilee
                  </p>
                  <h3 className="font-serif-display text-2xl mt-1">
                    Under 50,000 Warm Fairy Lights
                  </h3>
                  <p className="text-xs text-[#EDE5D8]/80 mt-1">
                    Automated acoustic rider &amp; choreographed lighting cue sheets.
                  </p>
                </div>
              </div>

              {/* Mosaic Item 4: 6-col Editorial Stat & Testimonial Tile */}
              <div className="md:col-span-6 rounded-3xl bg-[#FAF2ED] border-2 border-[#C6A364]/50 p-8 sm:p-10 flex flex-col justify-between shadow-luxury">
                <div>
                  <span className="text-xs uppercase font-bold tracking-[0.2em] text-[#B84B32]">
                    By The Numbers
                  </span>
                  <h3 className="font-serif-display text-3xl text-[#282522] mt-2">
                    Precision at Historic Scale
                  </h3>
                  <p className="text-xs text-[#57423D] mt-2 leading-relaxed">
                    Gatherly AI powers the nation’s most demanding milestone events without a single
                    slipped detail.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#EDE5D8]">
                  <div>
                    <span className="font-serif-display text-3xl sm:text-4xl text-[#542D38]">
                      ₹480 Cr+
                    </span>
                    <p className="text-[11px] text-[#57423D] uppercase font-bold tracking-wider mt-1">
                      INR Capital Orchestrated
                    </p>
                  </div>
                  <div>
                    <span className="font-serif-display text-3xl sm:text-4xl text-[#B84B32]">
                      14,000+
                    </span>
                    <p className="text-[11px] text-[#57423D] uppercase font-bold tracking-wider mt-1">
                      Celebrations Completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#57423D] font-medium">
                    99.8% On-Time Muhurat Execution
                  </span>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="text-xs font-bold text-[#542D38] hover:text-[#B84B32] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Explore Full Dossier</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. BOLD LUXURY FOOTER & FINAL INVITATION */}
        <section className="w-full py-24 bg-gradient-to-b from-[#542D38] to-[#3A1A22] text-[#F8F5EF] relative overflow-hidden">
          {/* Ambient Gold & Terracotta Glows */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#B84B32]/30 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#C6A364]/20 blur-3xl pointer-events-none"></div>

          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#C6A364]/50 text-[#E9D8B4] text-xs font-semibold uppercase tracking-[0.2em] mb-6 shadow-sm">
              <span className="material-symbols-outlined text-sm text-[#E9D8B4]">diamond</span>
              <span>Bespoke Private Access</span>
            </div>

            <h2 className="font-serif-display text-4xl sm:text-6xl font-normal text-[#FAF2ED] tracking-tight leading-[1.1]">
              Your milestone celebration deserves an extraordinary mind.
            </h2>

            <p className="font-sans text-base sm:text-lg text-[#EDE5D8]/90 max-w-xl mx-auto mt-6 font-light leading-relaxed">
              Step into a world where historic grandeur harmonizes with Google Gemini intelligence.
              Begin architecting your multi-day celebration today.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#B84B32] text-white border border-[#C6A364] text-xs font-bold uppercase tracking-wider shadow-luxury-deep hover:bg-[#98341D] hover:scale-105 transition-all cursor-pointer disabled:opacity-60"
              >
                <span>{isSigningIn ? 'Signing In...' : 'Start Planning with Gatherly'}</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/10 backdrop-blur-md text-[#FAF2ED] border border-white/20 text-xs font-semibold uppercase tracking-wider hover:bg-white/20 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-[#E9D8B4]">chat</span>
                <span>Consult Private Concierge (Demo)</span>
              </button>
            </div>

            {/* Trust Badges Strip */}
            <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-8 text-xs text-[#EDE5D8]/70">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E9D8B4] text-base">
                  verified
                </span>
                Full INR (₹) Escrow Protection
              </span>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E9D8B4] text-base">lock</span>
                Encrypted Family RSVP Portals
              </span>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E9D8B4] text-base">
                  support_agent
                </span>
                Dedicated Day-of Dispatch Team
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* LUXURY FOOTER (Deep Burgundy & Warm Ivory) */}
      <footer className="w-full bg-[#3A1A22] border-t border-[#C6A364]/30 text-[#EDE5D8] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
            {/* Col 1: Brand Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#542D38] border border-[#C6A364] flex items-center justify-center text-[#F8F5EF]">
                  <span className="font-serif-display text-lg italic">G</span>
                </div>
                <span className="font-serif-display text-2xl text-[#FAF2ED] tracking-tight">
                  Gatherly AI
                </span>
              </div>
              <p className="font-sans text-xs text-[#EDE5D8]/70 max-w-sm leading-relaxed">
                The world’s first luxury editorial event intelligence platform. Melding classical
                Indian hospitality with Gemini artificial intelligence.
              </p>
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-[#C6A364]/40 text-xs text-[#E9D8B4]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Regional Hubs: Udaipur · Mumbai · New Delhi · Goa</span>
                </div>
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <span className="text-xs uppercase font-bold tracking-widest text-[#E9D8B4]">
                Platform
              </span>
              <ul className="space-y-2 text-xs text-[#EDE5D8]/80 font-medium">
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Gemini Copilot 2.5
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Escrow Master Ledger
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Multi-Day Timeline Engine
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    WhatsApp Concierge Bot
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Vendor RFP Scanner
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Occasions */}
            <div className="space-y-3">
              <span className="text-xs uppercase font-bold tracking-widest text-[#E9D8B4]">
                Archetypes
              </span>
              <ul className="space-y-2 text-xs text-[#EDE5D8]/80 font-medium">
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Royal Destination Weddings
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_blr_diwali_03')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Palace &amp; Fort Galas
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_pune_birthday_02')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Milestone Anniversaries
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_mumbai_wedding_01')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Curated Sufi Sangeets
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onEnterDemo('demo_event_pune_birthday_02')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Private Island Soirées
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Concierge & Legal */}
            <div className="space-y-3">
              <span className="text-xs uppercase font-bold tracking-widest text-[#E9D8B4]">
                Concierge &amp; Legal
              </span>
              <ul className="space-y-2 text-xs text-[#EDE5D8]/80 font-medium">
                <li>
                  <a className="hover:text-white transition-colors" href="#command-center">
                    Private Client Services
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#command-center">
                    Security &amp; Escrow Standards
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#command-center">
                    Privacy Policy (India DPDPA)
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#command-center">
                    Terms of Master License
                  </a>
                </li>
                <li>
                  <a className="hover:text-white transition-colors" href="#command-center">
                    Hospitality Partner Portal
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Credits */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#EDE5D8]/60">
            <span>© 2026 Gatherly AI Technologies Private Limited. All rights reserved.</span>
            <div className="flex items-center gap-4 text-[#E9D8B4]">
              <span className="italic font-serif-display">Elegance in Execution.</span>
              <span>•</span>
              <span>INR (₹) Base System</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
