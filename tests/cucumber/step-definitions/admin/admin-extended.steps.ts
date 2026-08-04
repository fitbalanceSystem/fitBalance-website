import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../../fixtures/world';
import { AdminAutomationsPage } from '../../pages/admin/automations.page';
import { AdminWeeklyCalendarPage } from '../../pages/admin/weekly-calendar.page';
import { AdminStoreSettingsPage, StoreSettingsTab } from '../../pages/admin/store-settings.page';

let automations: AdminAutomationsPage;
let calendar: AdminWeeklyCalendarPage;
let storeSettings: AdminStoreSettingsPage;

// ── Automations ───────────────────────────────────────────────────────────────

Given('I am on the automations page', async function (this: FitBalanceWorld) {
  automations = new AdminAutomationsPage(this.page);
  await automations.goto();
  await automations.waitForLogs();
});

Then('the salary logs table is displayed', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(automations.selectors.logsBody)).toBeVisible();
});

When('I run the absence check automation', async function (this: FitBalanceWorld) {
  await automations.runAbsenceCheck();
});

Then('the absence results section is visible', async function (this: FitBalanceWorld) {
  expect(await automations.isAbsenceResultVisible()).toBe(true);
});

// ── Weekly Calendar ───────────────────────────────────────────────────────────

Given('I am on the weekly calendar page', async function (this: FitBalanceWorld) {
  calendar = new AdminWeeklyCalendarPage(this.page);
  await calendar.goto();
  await calendar.waitForCalendar();
});

Then('the week range label is displayed', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(calendar.selectors.weekRange)).toBeVisible();
  const text = await calendar.getWeekRange();
  expect(text.trim().length).toBeGreaterThan(0);
});

When('I navigate the calendar to the next week', async function (this: FitBalanceWorld) {
  await calendar.changeWeek(1);
});

When('I navigate the calendar to the previous week', async function (this: FitBalanceWorld) {
  await calendar.changeWeek(-1);
});

// ── Store Settings ────────────────────────────────────────────────────────────

Given('I am on the store settings page', async function (this: FitBalanceWorld) {
  storeSettings = new AdminStoreSettingsPage(this.page);
  await storeSettings.goto();
  await storeSettings.waitForSettings();
});

Then('the store name field is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(storeSettings.selectors.storeName)).toBeVisible();
});

When('I switch the store settings tab to {string}', async function (this: FitBalanceWorld, tab: string) {
  await storeSettings.switchTab(tab as StoreSettingsTab);
});

Then('the contact phone field is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(storeSettings.selectors.contactPhone)).toBeVisible();
});

Then('the shipping price field is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(storeSettings.selectors.shippingPrice)).toBeVisible();
});
