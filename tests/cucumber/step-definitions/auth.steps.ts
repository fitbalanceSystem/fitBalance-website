import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../fixtures/world';
import { LoginPage } from '../pages/login.page';

let loginPage: LoginPage;

Given('I am on the login page', async function (this: FitBalanceWorld) {
  loginPage = new LoginPage(this.page);
  await loginPage.goto();
});

When('I select role {string}', async function (this: FitBalanceWorld, role: string) {
  await loginPage.selectRole(role as 'customer' | 'employee');
});

When('I enter email {string} and password {string}', async function (
  this: FitBalanceWorld,
  email: string,
  password: string,
) {
  await loginPage.fill(loginPage.selectors.emailInput, email);
  await loginPage.fill(loginPage.selectors.passwordInput, password);
});

When('I click the login button', async function (this: FitBalanceWorld) {
  await loginPage.click(loginPage.selectors.submitBtn);
  await this.page.waitForLoadState('networkidle');
});

Then('I am redirected to the customer dashboard', async function (this: FitBalanceWorld) {
  await expect(this.page).toHaveURL(/customer/);
});

Then('an error message is displayed', async function (this: FitBalanceWorld) {
  expect(await loginPage.isErrorVisible()).toBe(true);
});

When('I click the forgot password link', async function (this: FitBalanceWorld) {
  await loginPage.openForgotPassword();
});

When('I enter recovery email {string}', async function (this: FitBalanceWorld, email: string) {
  await loginPage.fill(loginPage.selectors.forgotEmail, email);
});

When('I submit the forgot password form', async function (this: FitBalanceWorld) {
  await loginPage.click(loginPage.selectors.forgotSubmit);
});

Then('a confirmation message is displayed', async function (this: FitBalanceWorld) {
  expect(await loginPage.isVisible(loginPage.selectors.forgotSuccess)).toBe(true);
});
