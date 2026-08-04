import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../fixtures/world';
import { ShopPage } from '../pages/shop.page';

let shopPage: ShopPage;

Given('I am on the shop page', async function (this: FitBalanceWorld) {
  shopPage = new ShopPage(this.page);
  await shopPage.goto();
  await shopPage.waitForProducts();
});

Given('I have added a product to the cart', async function (this: FitBalanceWorld) {
  await shopPage.addFirstProductToCart();
});

Then('products are visible in the grid', async function (this: FitBalanceWorld) {
  expect(await shopPage.getProductCount()).toBeGreaterThan(0);
});

When('I search for {string}', async function (this: FitBalanceWorld, term: string) {
  await shopPage.searchProduct(term);
});

Then('only products containing {string} are shown', async function (
  this: FitBalanceWorld,
  term: string,
) {
  const cards = this.page.locator('.product-card .p-name');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const text = await cards.nth(i).innerText();
    expect(text.toLowerCase()).toContain(term.toLowerCase());
  }
});

When('I click the first product', async function (this: FitBalanceWorld) {
  await shopPage.clickFirstProduct();
});

When('I click the add to cart button', async function (this: FitBalanceWorld) {
  await shopPage.click(shopPage.selectors.pmAddBtn);
});

Then('the cart item count increases', async function (this: FitBalanceWorld) {
  const countEl = this.page.locator(shopPage.selectors.cartCount);
  await expect(countEl).toBeVisible();
  expect(parseInt(await countEl.innerText(), 10)).toBeGreaterThan(0);
});

When('I open the cart', async function (this: FitBalanceWorld) {
  await shopPage.openCart();
});

Then('the cart drawer is visible with items', async function (this: FitBalanceWorld) {
  const count = await this.page.locator(`${shopPage.selectors.cartItems} > *`).count();
  expect(count).toBeGreaterThan(0);
});

When('I sort by {string}', async function (this: FitBalanceWorld, value: string) {
  await shopPage.sortBy(value);
  await this.page.waitForTimeout(500);
});

Then('products are ordered from lowest to highest price', async function (this: FitBalanceWorld) {
  const prices = await this.page.locator('.p-price').allInnerTexts();
  const nums = prices.map(p => parseFloat(p.replace(/[^\d.]/g, '')));
  for (let i = 1; i < nums.length; i++) {
    expect(nums[i]).toBeGreaterThanOrEqual(nums[i - 1]);
  }
});
