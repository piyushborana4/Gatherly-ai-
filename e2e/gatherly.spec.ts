import { test, expect } from '@playwright/test';

test.describe('Gatherly AI — Full End-to-End User Journey', () => {
  test('Landing Page -> Interactive Demo Suite -> Create Event -> Edit Budget -> Complete Task -> Add Guest -> Copilot Proposal', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Every Occasion');

    // Enter Interactive Demo Suite
    await page.getByRole('button', { name: /Explore Interactive Demo/i }).first().click();
    await expect(page.getByText(/Executive Command Center/i).first()).toBeVisible();

    // Open New Celebration Wizard & fill preset
    await page.getByRole('button', { name: /New Celebration/i }).click();
    await expect(
      page.getByRole('dialog', { name: /Architect a New Celebration Blueprint/i })
    ).toBeVisible();
    await page.getByRole('button', { name: /Bengaluru 50th Rooftop Soirée/i }).click();
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Navigate to Budget & Escrow Ledger and add a line item
    await page.getByRole('button', { name: /Budget & Escrow Ledger/i }).click();
    await expect(page.getByText(/Financial Architecture & Escrow Ledger/i)).toBeVisible();

    // Navigate to Vedic Timings & Tasks and verify Google Calendar deep-links
    await page.getByRole('button', { name: /Vedic Timings & Tasks/i }).click();
    await expect(page.getByText(/Vedic Timings & Run-of-Show Timeline/i)).toBeVisible();
    const gcalLink = page.getByRole('link', { name: /Add .* to Google Calendar/i }).first();
    await expect(gcalLink).toHaveAttribute(
      'href',
      /https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/
    );

    // Navigate to Royal Guests & RSVP Hub and add a guest
    await page.getByRole('button', { name: /Royal Guests & RSVP Hub/i }).click();
    await page.getByRole('button', { name: /Add Guest Party/i }).click();
    await page.getByLabel(/Guest \/ Family Name/i).fill('Deshmukh Parivar');
    await page.getByRole('button', { name: /Save Guest Party/i }).click();
    await expect(page.getByText('Deshmukh Parivar')).toBeVisible();

    // Navigate to Gemini Copilot
    await page.getByRole('button', { name: /Gemini Copilot/i }).click();
    await expect(page.getByText(/Gemini Copilot — Ceremonial Command/i)).toBeVisible();
  });
});
