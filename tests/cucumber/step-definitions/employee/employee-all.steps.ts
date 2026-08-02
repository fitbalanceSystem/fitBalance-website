import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../../fixtures/world';
import { LoginPage } from '../../pages/login.page';
import { EmployeeProfilePage } from '../../pages/employee/profile.page';
import { getUser } from '../../data/users';

let empProfile: EmployeeProfilePage;

Given('I am logged in as employee', async function (this: FitBalanceWorld) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  const user = getUser(this.config.env, 'admin');
  await loginPage.selectRole('employee');
  await loginPage.login(user.email, user.password);
});

Given('I am on the employee profile page', async function (this: FitBalanceWorld) {
  empProfile = new EmployeeProfilePage(this.page);
  await empProfile.goto();
  await empProfile.waitForProfile();
});

Then('the employee name is displayed', async function (this: FitBalanceWorld) {
  const name = await empProfile.getName();
  expect(name.trim().length).toBeGreaterThan(0);
});

Then('the employee profile details are not empty', async function (this: FitBalanceWorld) {
  expect(await empProfile.isProfileLoaded()).toBe(true);
});
