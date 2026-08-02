import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FitBalanceWorld } from '../../fixtures/world';
import { AttendanceDashboardPage } from '../../pages/attendance/dashboard.page';

let attendance: AttendanceDashboardPage;

Given('I am on the attendance dashboard', async function (this: FitBalanceWorld) {
  attendance = new AttendanceDashboardPage(this.page);
  await attendance.goto();
  await attendance.waitForDashboard();
});

Then('the attendance submit button is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(attendance.selectors.btnSubmit)).toBeVisible();
});

Then('the lesson name header is displayed', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(attendance.selectors.lessonName)).toBeVisible();
});

When('I click the change lesson button', async function (this: FitBalanceWorld) {
  await attendance.openChangeLesson();
});

Then('the change lesson modal is open', async function (this: FitBalanceWorld) {
  expect(await attendance.isChangeLessonModalOpen()).toBe(true);
});

Then('the attendance count widget is visible', async function (this: FitBalanceWorld) {
  await expect(this.page.locator(attendance.selectors.attendanceCount)).toBeVisible();
});
