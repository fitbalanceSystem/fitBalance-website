import { Before, After, BeforeAll, AfterAll, Status, ITestCaseHookParameter } from '@cucumber/cucumber';
import { FitBalanceWorld } from '../fixtures/world';
import { takeScreenshot } from '../utils/helpers';

BeforeAll(async function () {
  // Global setup: DB seed, env validation, etc.
});

Before(async function (this: FitBalanceWorld) {
  await this.init();
});

After(async function (this: FitBalanceWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED) {
    const screenshot = await takeScreenshot(this.page, scenario.pickle.name.replace(/\s+/g, '_'));
    await this.attach(screenshot, 'image/png');
  }

  const video = this.page?.video();
  if (video) {
    await this.context.close();
    const videoPath = await video.path();
    const { readFileSync } = await import('fs');
    if (videoPath) {
      this.attach(readFileSync(videoPath), 'video/webm');
    }
    return;
  }

  await this.teardown();
});

AfterAll(async function () {
  // Global teardown if needed
});
