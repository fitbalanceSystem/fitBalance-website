import { BasePage } from '../base.page';

export class AdminCustomersPage extends BasePage {
  readonly selectors = {
    searchInput:   '#searchInput',
    statusFilter:  '#statusFilter',
    countBadge:    '#countBadge',
    tableBody:     '#customersTable tbody',
    newCustomerBtn:'#newCustomerBtn',
    exportBtn:     '#exportCustomersBtn',
    viewModal:     '#viewModal',
    vmFullName:    '#vmFullName',
    vmEmail:       '#vmEmail',
    vmMobile:      '#vmMobile',
    vmEditBtn:     '#vmEditBtn',
    prevPage:      '#prevPage',
    nextPage:      '#nextPage',
    pageInfo:      '#pageInfo',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/customers.html');
  }

  async waitForCustomers(): Promise<void> {
    await this.page.locator(`${this.selectors.tableBody} tr`).first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async search(term: string): Promise<void> {
    await this.fill(this.selectors.searchInput, term);
    await this.page.waitForTimeout(400);
  }

  async getCount(): Promise<number> {
    return parseInt(await this.getText(this.selectors.countBadge), 10);
  }

  async clickViewOnRow(index = 0): Promise<void> {
    await this.page.locator(`${this.selectors.tableBody} tr`).nth(index).locator('button').first().click();
    await this.page.locator(this.selectors.viewModal).waitFor({ state: 'visible' });
  }

  async closeViewModal(): Promise<void> {
    await this.page.locator(`${this.selectors.viewModal} button`, { hasText: 'סגור' }).click();
  }

  async isViewModalOpen(): Promise<boolean> {
    return this.isVisible(this.selectors.viewModal);
  }
}
