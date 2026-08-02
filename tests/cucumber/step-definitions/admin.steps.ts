import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../fixtures/world';
import { LoginPage } from '../pages/login.page';
import { AdminProductsPage } from '../pages/admin/products.page';
import { getUser } from '../data/users';

let adminPage: AdminProductsPage;

Given('I am logged in as admin', async function (this: FitBalanceWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  const user = getUser(this.config.env, 'admin');
  await loginPage.selectRole('employee');
  await loginPage.login(user.email, user.password);
});

Given('I am on the admin products page', async function (this: FitBalanceWorld) {
  adminPage = new AdminProductsPage(this.page);
  await adminPage.goto();
  await adminPage.waitForProducts();
});

Then('the products table contains at least one product', async function (this: FitBalanceWorld) {
  expect(await adminPage.getProductCount()).toBeGreaterThan(0);
});

When('I click the add product button', async function (this: FitBalanceWorld) {
  await adminPage.openAddModal();
});

When('I fill in name {string} and price {float}', async function (
  this: FitBalanceWorld,
  name: string,
  price: number,
) {
  await adminPage.fillProductForm({ name, price });
});

When('I save the product', async function (this: FitBalanceWorld) {
  await adminPage.saveProduct();
});

Then('{string} appears in the product list', async function (this: FitBalanceWorld, name: string) {
  const row = this.page.locator(`${adminPage.selectors.productsBody} tr`, { hasText: name });
  await expect(row).toBeVisible();
});

When('I filter by status {string}', async function (this: FitBalanceWorld, status: string) {
  await adminPage.filterByStatus(status === 'active' ? 'true' : 'false');
});

Then('all displayed products are active', async function (this: FitBalanceWorld) {
  await expect(this.page.locator('.badge-inactive')).toHaveCount(0);
});

Given('a product named {string} exists', async function (this: FitBalanceWorld, name: string) {
  await adminPage.searchProduct(name);
  expect(await adminPage.getProductCount()).toBeGreaterThan(0);
});

When('I click edit on that product', async function (this: FitBalanceWorld) {
  const firstRow = this.page.locator(`${adminPage.selectors.productsBody} tr`).first();
  const name = await firstRow.locator('td:nth-child(2) strong').innerText();
  await adminPage.clickEditOnRow(name);
});

When('I change the price to {float}', async function (this: FitBalanceWorld, price: number) {
  await this.page.locator('._ptab[data-tab="pricing"]').click();
  await adminPage.fill(adminPage.selectors.priceInput, String(price));
});

Then('the updated price is shown in the list', async function (this: FitBalanceWorld) {
  const prices = await this.page
    .locator(`${adminPage.selectors.productsBody} td:nth-child(4)`)
    .allInnerTexts();
  expect(prices.some(p => p.includes('149.90'))).toBe(true);
});
