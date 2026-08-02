import { BasePage } from '../base.page';

export class CustomerDashboardPage extends BasePage {
  async goto(): Promise<void> {
    await this.navigate('/pages/customer/index.html');
  }

  async waitForRedirect(): Promise<void> {
    await this.page.waitForURL(/profile\.html/, { timeout: 5_000 });
  }
}
