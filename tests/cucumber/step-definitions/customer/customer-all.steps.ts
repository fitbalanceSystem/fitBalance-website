import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../../fixtures/world';
import { LoginPage } from '../../pages/login.page';
import { CustomerProfilePage } from '../../pages/customer/profile.page';
import { CustomerSchedulePage } from '../../pages/customer/schedule.page';
import { CustomerPlansPage } from '../../pages/customer/plans.page';
import { getUser } from '../../data/users';

let profile: CustomerProfilePage;
let schedule: CustomerSchedulePage;
let plans: CustomerPlansPage;

// ── Auth ──────────────────────────────────────────────────────────────────────

Given('I am logged in as customer', async function (this: FitBalanceWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  const user = getUser(this.config.env, 'customer');
  await loginPage.selectRole('customer');
  await loginPage.login(user.email, user.password);
});

// ── Profile ───────────────────────────────────────────────────────────────────

Given('I am on the customer profile page', async function (this: FitBalanceWorld) {
  profile = new CustomerProfilePage(this.page);
  await profile.goto();
  await profile.waitForProfile();
});

Then('the profile name is displayed', async function (this: FitBalanceWorld) {
  const name = await profile.getProfileName();
  expect(name.trim().length).toBeGreaterThan(0);
});

Then('the profile form fields are not empty', async function (this: FitBalanceWorld) {
  expect(await profile.isProfileLoaded()).toBe(true);
});

// ── Schedule ──────────────────────────────────────────────────────────────────

Given('I am on the customer schedule page', async function (this: FitBalanceWorld) {
  schedule = new CustomerSchedulePage(this.page);
  await schedule.goto();
  await schedule.waitForSchedule();
});

Then('the schedule navigation label is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(schedule.selectors.navLabel)).toBeVisible();
});

When('I navigate to the next week', async function (this: FitBalanceWorld) {
  await schedule.goToNextWeek();
});

When('I click the today button', async function (this: FitBalanceWorld) {
  await schedule.goToToday();
});

// ── Plans ─────────────────────────────────────────────────────────────────────

Given('I am on the customer plans page', async function (this: FitBalanceWorld) {
  plans = new CustomerPlansPage(this.page);
  await plans.goto();
  await plans.waitForPlans();
});

Then('the enrollments grid is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(plans.selectors.enrollmentsGrid)).toBeVisible();
});

Then('the enrollment count is greater than zero', async function (this: FitBalanceWorld) {
  expect(await plans.getEnrollmentCount()).toBeGreaterThan(0);
});
