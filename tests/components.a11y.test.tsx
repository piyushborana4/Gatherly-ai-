// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { EventCreationWizard } from '../src/features/events/EventCreationWizard';
import { BudgetManager } from '../src/features/budget/BudgetManager';
import { TimelineManager } from '../src/features/timeline/TimelineManager';
import { GuestManager } from '../src/features/guests/GuestManager';
import { CopilotPanel } from '../src/features/copilot/CopilotPanel';
import { calculateBudgetSummary } from '../src/utils/financials';
import type {
  EventPlan,
  ExpenseItem,
  GuestRecord,
  TimelineTask,
  VendorRecord,
} from '../src/types/domain';

const sampleEvent: EventPlan = {
  id: 'evt_a11y_1',
  ownerId: 'user_owner',
  ownerName: 'Kabir Sharma',
  name: 'Kabir & Meera Heritage Wedding',
  category: 'wedding',
  startDate: '2026-11-28',
  endDate: '2026-11-29',
  city: 'Jaipur, Rajasthan',
  venuePreference: 'Heritage Haveli Courtyard',
  guestCount: 200,
  totalBudget: 2000000,
  currency: 'INR',
  styleTheme: 'Royal Terracotta & Marigold',
  dietaryRequirements: 'Pure Vegetarian & Jain',
  culturalPreferences: 'Haldi, Sangeet & Pheras',
  accessibilityRequirements: 'Step-free courtyard ramps',
  additionalInstructions: '',
  status: 'active',
  aiOverview: 'Heritage wedding blueprint',
  aiStrategy: 'Consolidated courtyard venue strategy',
  aiThemeIdeas: 'Terracotta and marigold',
  aiFoodSuggestions: 'Marwari & Jain thali',
  aiEntertainmentIdeas: 'Folk welcome ensemble',
  aiRiskPlan: 'Indoor Durbar hall backup',
  aiGuestRecommendations: 'Hospitality desk',
  aiReminders: 'Permit NOC',
  isDemo: true,
};

const sampleExpenses: ExpenseItem[] = [
  {
    id: 'exp_1',
    eventId: 'evt_a11y_1',
    ownerId: 'user_owner',
    category: 'Venue',
    title: 'Heritage Haveli Courtyard & Banquet',
    allocatedAmount: 800000,
    plannedAmount: 780000,
    actualAmount: 780000,
    depositPaid: 300000,
    paymentStatus: 'deposit_paid',
    vendorName: 'Samode Haveli',
    isAiEstimate: false,
    notes: 'Includes 2-day courtyard booking',
  },
  {
    id: 'exp_2',
    eventId: 'evt_a11y_1',
    ownerId: 'user_owner',
    category: 'Catering',
    title: 'Royal Marwari & Jain Thali Feast',
    allocatedAmount: 600000,
    plannedAmount: 590000,
    actualAmount: 0,
    depositPaid: 100000,
    paymentStatus: 'deposit_paid',
    vendorName: 'Jaipur Royal Rasoi',
    isAiEstimate: false,
    notes: 'Live chaat counters',
  },
];

const sampleTasks: TimelineTask[] = [
  {
    id: 'task_1',
    eventId: 'evt_a11y_1',
    ownerId: 'user_owner',
    title: 'Lock Heritage Haveli Venue Contract',
    description: 'Sign escrow agreement and confirm lawn capacity',
    stage: '6+ Months Out',
    dueDate: '2026-06-15',
    priority: 'critical',
    status: 'completed',
    assigneeName: 'Kabir',
    dependsOnTaskId: '',
    reminderEnabled: true,
  },
  {
    id: 'task_2',
    eventId: 'evt_a11y_1',
    ownerId: 'user_owner',
    title: 'Confirm Mehendi Artisans & Canopy Lighting',
    description: 'Book 8 bridal & guest mehendi artists',
    stage: '3-5 Months Out',
    dueDate: '2026-08-20',
    priority: 'high',
    status: 'todo',
    assigneeName: 'Meera',
    dependsOnTaskId: 'task_1',
    reminderEnabled: true,
  },
];

const sampleGuests: GuestRecord[] = [
  {
    id: 'gst_1',
    eventId: 'evt_a11y_1',
    ownerId: 'user_owner',
    fullName: 'Rohan & Meera Kapoor',
    groupName: 'Bride Family',
    contactPhoneOrEmail: '+91 98201 11223',
    rsvpStatus: 'confirmed',
    invitationSent: true,
    dietaryPreference: 'Vegetarian',
    plusOneCount: 2,
    specialNotes: 'Ground floor suite requested',
  },
];

const sampleVendors: VendorRecord[] = [
  {
    id: 'ven_1',
    eventId: 'evt_a11y_1',
    ownerId: 'user_owner',
    category: 'Venues',
    name: 'Samode Haveli Courtyard',
    city: 'Jaipur, Rajasthan',
    sourceType: 'demo_sample',
    contactInfo: '+91 141 263 1000',
    estimatedCost: 800000,
    quotedAmount: 780000,
    depositPaid: 300000,
    bookingStatus: 'booked',
    paymentStatus: 'deposit_paid',
    userRating: 4.9,
    priorityLevel: 'immediate',
    notes: 'Step-free ramp access',
  },
];

describe('Component Rendering, Behaviour & Automated Accessibility (vitest-axe)', () => {
  it('EventCreationWizard renders accessible dialog, supports Escape key, and passes axe audit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    const { container } = render(
      <EventCreationWizard onSubmit={onSubmit} onCancel={onCancel} isGenerating={false} />
    );

    const dialog = screen.getByRole('dialog', {
      name: /Architect a New Celebration Blueprint/i,
    });
    expect(dialog).toBeDefined();

    // Test preset fill and Escape key
    fireEvent.click(screen.getByText(/Jaipur Royal Courtyard Wedding/i));
    expect((screen.getByLabelText(/Event Name/i) as HTMLInputElement).value).toContain(
      'Kabir & Meera'
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('BudgetManager renders ledger, opens add form with accessible labels, and passes axe audit', async () => {
    const summary = calculateBudgetSummary(
      sampleEvent.totalBudget,
      sampleEvent.guestCount,
      sampleExpenses
    );
    const { container } = render(
      <BudgetManager
        event={sampleEvent}
        budgetSummary={summary}
        expenses={sampleExpenses}
        canEdit={true}
        onAddExpense={vi.fn().mockResolvedValue(undefined)}
        onUpdateExpense={vi.fn().mockResolvedValue(undefined)}
        onDeleteExpense={vi.fn().mockResolvedValue(undefined)}
        onUpdateTotalBudget={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Budget & Escrow Ledger/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Add Budget Line Item/i }));
    expect(screen.getByLabelText(/Line Item Title/i)).toBeDefined();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('TimelineManager renders milestones, Google Calendar deep-links, and passes axe audit', async () => {
    const { container } = render(
      <TimelineManager
        tasks={sampleTasks}
        canEdit={true}
        onAddTask={vi.fn().mockResolvedValue(undefined)}
        onUpdateTask={vi.fn().mockResolvedValue(undefined)}
        onDeleteTask={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Vedic Timings & Run-of-Show Timeline/i)).toBeDefined();
    const gcalLinks = screen.getAllByRole('link', { name: /Add .* to Google Calendar/i });
    expect(gcalLinks.length).toBeGreaterThanOrEqual(2);
    expect(gcalLinks[0]?.getAttribute('href')).toContain(
      'https://calendar.google.com/calendar/render?action=TEMPLATE'
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Milestone/i }));
    expect(screen.getByLabelText(/Milestone Title/i)).toBeDefined();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('GuestManager renders RSVP metrics, filters guests, and passes axe audit', async () => {
    const { container } = render(
      <GuestManager
        targetGuestCount={200}
        guests={sampleGuests}
        canEdit={true}
        onAddGuest={vi.fn().mockResolvedValue(undefined)}
        onUpdateGuest={vi.fn().mockResolvedValue(undefined)}
        onDeleteGuest={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Guest Attendance & Culinary Headcount/i)).toBeDefined();
    expect(screen.getByText('Rohan & Meera Kapoor')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Add Guest Party/i }));
    expect(screen.getByLabelText(/Guest \/ Family Name/i)).toBeDefined();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('CopilotPanel renders 3-panel command center and passes axe audit', async () => {
    const summary = calculateBudgetSummary(
      sampleEvent.totalBudget,
      sampleEvent.guestCount,
      sampleExpenses
    );
    const { container } = render(
      <CopilotPanel
        event={sampleEvent}
        budgetSummary={summary}
        expenses={sampleExpenses}
        tasks={sampleTasks}
        vendors={sampleVendors}
        canEdit={true}
        onExecuteAction={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Gemini Copilot — Ceremonial Command/i)).toBeDefined();
    expect(screen.getByLabelText(/Copilot command prompt/i)).toBeDefined();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
