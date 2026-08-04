import { BasePage } from '../base.page';

export class AdminJobsPage extends BasePage {
  readonly selectors = {
    jobsBody:    '#jobsBody',
    refreshBtn:  'button[onclick="init()"]',
    toast:       '#toast',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/jobs.html');
  }

  async waitForJobs(): Promise<void> {
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && !el.textContent?.includes('טוען');
      },
      this.selectors.jobsBody,
      { timeout: 15_000 },
    );
  }

  async getJobCount(): Promise<number> {
    return this.page.locator(`${this.selectors.jobsBody} tr`).count();
  }

  async clickRunOnRow(index = 0): Promise<void> {
    await this.page.locator(`${this.selectors.jobsBody} tr`).nth(index).locator('button', { hasText: /הרץ/ }).click();
  }

  async isToastVisible(): Promise<boolean> {
    return this.isVisible(this.selectors.toast);
  }
}
