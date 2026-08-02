import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../../fixtures/world';
import { LoginPage } from '../../pages/login.page';
import { AdminDashboardPage } from '../../pages/admin/dashboard.page';
import { AdminCustomersPage } from '../../pages/admin/customers.page';
import { AdminOrdersPage } from '../../pages/admin/orders.page';
import { AdminPromotionsPage } from '../../pages/admin/promotions.page';
import { AdminInquiriesPage } from '../../pages/admin/inquiries.page';
import { AdminInstructorsPage } from '../../pages/admin/instructors.page';
import { AdminProgramsPage } from '../../pages/admin/programs.page';
import { AdminReportsPage, ReportTab } from '../../pages/admin/reports.page';
import { AdminJobsPage } from '../../pages/admin/jobs.page';
import { getUser } from '../../data/users';

let dashboard: AdminDashboardPage;
let customers: AdminCustomersPage;
let orders: AdminOrdersPage;
let promotions: AdminPromotionsPage;
let inquiries: AdminInquiriesPage;
let instructors: AdminInstructorsPage;
let programs: AdminProgramsPage;
let reports: AdminReportsPage;
let jobs: AdminJobsPage;

// ── Auth ──────────────────────────────────────────────────────────────────────

Given('I am logged in as admin', async function (this: FitBalanceWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  const user = getUser(this.config.env, 'admin');
  await loginPage.selectRole('employee');
  await loginPage.login(user.email, user.password);
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

Given('I am on the admin dashboard', async function (this: FitBalanceWorld) {
  dashboard = new AdminDashboardPage(this.page);
  await dashboard.goto();
  await dashboard.waitForDashboard();
});

Then('all KPI cards display a numeric value', async function (this: FitBalanceWorld) {
  for (const kpi of ['members', 'inquiries', 'debts', 'orders'] as const) {
    const val = await dashboard.getKpi(kpi);
    expect(val.trim()).not.toBe('—');
  }
});

Then('the birthday list widget is displayed', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(dashboard.selectors.birthdayList)).toBeVisible();
});

Then('the date banner contains the current year', async function (this: FitBalanceWorld) {
  const text = await dashboard.getText(dashboard.selectors.dateBanner);
  expect(text).toContain(String(new Date().getFullYear()));
});

// ── Customers ─────────────────────────────────────────────────────────────────

Given('I am on the admin customers page', async function (this: FitBalanceWorld) {
  customers = new AdminCustomersPage(this.page);
  await customers.goto();
  await customers.waitForCustomers();
});

Then('the customers table contains at least one row', async function (this: FitBalanceWorld) {
  expect(await customers.getCount()).toBeGreaterThan(0);
});

When('I search for a customer by name {string}', async function (this: FitBalanceWorld, name: string) {
  await customers.search(name);
});

Then('the displayed count is greater than zero', async function (this: FitBalanceWorld) {
  expect(await customers.getCount()).toBeGreaterThan(0);
});

When('I click view on the first customer row', async function (this: FitBalanceWorld) {
  await customers.clickViewOnRow(0);
});

Then('the customer view modal is open', async function (this: FitBalanceWorld) {
  expect(await customers.isViewModalOpen()).toBe(true);
});

When('I close the customer view modal', async function (this: FitBalanceWorld) {
  await customers.closeViewModal();
});

Then('the customer view modal is closed', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(customers.selectors.viewModal)).toBeHidden();
});

// ── Orders ────────────────────────────────────────────────────────────────────

Given('I am on the admin orders page', async function (this: FitBalanceWorld) {
  orders = new AdminOrdersPage(this.page);
  await orders.goto();
  await orders.waitForOrders();
});

Then('the orders KPI values are displayed', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(orders.selectors.kpiTotal)).toBeVisible();
});

When('I filter orders by status {string}', async function (this: FitBalanceWorld, status: string) {
  await orders.filterByStatus(status);
});

Then('the orders count badge is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(orders.selectors.countBadge)).toBeVisible();
});

When('I open the first order', async function (this: FitBalanceWorld) {
  await orders.openFirstOrder();
});

Then('the order modal is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(orders.selectors.orderModal)).toBeVisible();
});

// ── Promotions ────────────────────────────────────────────────────────────────

Given('I am on the admin promotions page', async function (this: FitBalanceWorld) {
  promotions = new AdminPromotionsPage(this.page);
  await promotions.goto();
  await promotions.waitForPromos();
});

Then('the promotions count badge is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(promotions.selectors.countBadge)).toBeVisible();
});

When('I open the add promotion modal', async function (this: FitBalanceWorld) {
  await promotions.openAddModal();
});

When('I fill in promotion name {string} type {string} value {int}', async function (
  this: FitBalanceWorld, name: string, type: string, value: number,
) {
  await promotions.fillPromoForm({ name, type, value });
});

When('I save the promotion', async function (this: FitBalanceWorld) {
  await promotions.savePromo();
});

When('I toggle the first promotion', async function (this: FitBalanceWorld) {
  await promotions.toggleFirstPromo();
});

// ── Inquiries ─────────────────────────────────────────────────────────────────

Given('I am on the admin inquiries page', async function (this: FitBalanceWorld) {
  inquiries = new AdminInquiriesPage(this.page);
  await inquiries.goto();
  await inquiries.waitForInquiries();
});

Then('the inquiries KPI values are displayed', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(inquiries.selectors.kpiTotal)).toBeVisible();
});

When('I search inquiries for {string}', async function (this: FitBalanceWorld, term: string) {
  await inquiries.search(term);
});

Then('the inquiries count badge is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(inquiries.selectors.countBadge)).toBeVisible();
});

When('I open the first inquiry', async function (this: FitBalanceWorld) {
  await inquiries.openFirstInquiry();
});

Then('the inquiry view modal is open', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(inquiries.selectors.viewModal)).toBeVisible();
});

// ── Instructors ───────────────────────────────────────────────────────────────

Given('I am on the admin instructors page', async function (this: FitBalanceWorld) {
  instructors = new AdminInstructorsPage(this.page);
  await instructors.goto();
  await instructors.waitForInstructors();
});

Then('the instructors count is greater than zero', async function (this: FitBalanceWorld) {
  expect(await instructors.getCount()).toBeGreaterThan(0);
});

When('I search instructors for {string}', async function (this: FitBalanceWorld, term: string) {
  await instructors.search(term);
});

When('I click view on the first instructor row', async function (this: FitBalanceWorld) {
  await instructors.clickViewOnRow(0);
});

Then('the instructor view modal is open', async function (this: FitBalanceWorld) {
  expect(await instructors.isViewModalOpen()).toBe(true);
});

// ── Programs ──────────────────────────────────────────────────────────────────

Given('I am on the admin programs page', async function (this: FitBalanceWorld) {
  programs = new AdminProgramsPage(this.page);
  await programs.goto();
  await programs.waitForPrograms();
});

Then('the programs table contains at least one row', async function (this: FitBalanceWorld) {
  expect(await programs.getRowCount()).toBeGreaterThan(0);
});

When('I search programs for {string}', async function (this: FitBalanceWorld, term: string) {
  await programs.search(term);
});

When('I click the new program button', async function (this: FitBalanceWorld) {
  await programs.openAddModal();
});

Then('the program modal is open', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(programs.selectors.modal)).toBeVisible();
});

// ── Reports ───────────────────────────────────────────────────────────────────

Given('I am on the admin reports page', async function (this: FitBalanceWorld) {
  reports = new AdminReportsPage(this.page);
  await reports.goto();
});

Then('the status report section is active', async function (this: FitBalanceWorld) {
  await expect(this.page.locator('#report-status')).toHaveClass(/active/);
});

When('I switch to the {string} report tab', async function (this: FitBalanceWorld, tab: string) {
  await reports.switchTab(tab as ReportTab);
});

Then('the debt report section is active', async function (this: FitBalanceWorld) {
  await expect(this.page.locator('#report-debt')).toHaveClass(/active/);
});

Then('the inventory report section is active', async function (this: FitBalanceWorld) {
  await expect(this.page.locator('#report-inventory')).toHaveClass(/active/);
});

// ── Jobs ──────────────────────────────────────────────────────────────────────

Given('I am on the admin jobs page', async function (this: FitBalanceWorld) {
  jobs = new AdminJobsPage(this.page);
  await jobs.goto();
  await jobs.waitForJobs();
});

Then('the jobs table contains at least one row', async function (this: FitBalanceWorld) {
  expect(await jobs.getJobCount()).toBeGreaterThan(0);
});

When('I click the refresh jobs button', async function (this: FitBalanceWorld) {
  await jobs.click(jobs.selectors.refreshBtn);
  await jobs.waitForJobs();
});
