import { BasePage } from '../base.page';

export class CustomerPlansPage extends BasePage {
  readonly selectors = {
    enrollmentsGrid: '#enrollments-grid',
    yearSelector:    '#year-selector',
    summarySection:  '#summary-section',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/customer/plans.html');
  }

  async waitForPlans(): Promise<void> {
    await this.page.locator(this.selectors.enrollmentsGrid).waitFor({ state: 'visible', timeout: 10_000 });
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && !el.querySelector('.skeleton');
      },
      this.selectors.enrollmentsGrid,
      { timeout: 10_000 }
    );
  }

  async getEnrollmentCount(): Promise<number> {
    return this.page.locator(`${this.selectors.enrollmentsGrid} > div:not(.skeleton)`).count();
  }
}
