import { BasePage } from '../base.page';

export class AdminInquiriesPage extends BasePage {
  readonly selectors = {
    searchInput:   '#searchInput',
    statusFilter:  '#statusFilter',
    programFilter: '#programFilter',
    countBadge:    '#countBadge',
    tableBody:     '#tableBody',
    viewModal:     '#viewModal',
    vmName:        '#vmName',
    vmStatusSelect:'#vmStatusSelect',
    vmSaveBtn:     '#vmSaveBtn',
    kpiTotal:      '#kpiTotal',
    kpiNew:        '#kpiNew',
    kpiJoined:     '#kpiJoined',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/inquiries.html');
  }

  async waitForInquiries(): Promise<void> {
    await this.page.locator(this.selectors.kpiTotal).waitFor({ state: 'visible', timeout: 10_000 });
  }

  async search(term: string): Promise<void> {
    await this.fill(this.selectors.searchInput, term);
    await this.page.waitForTimeout(400);
  }

  async filterByStatus(status: string): Promise<void> {
    await this.page.locator(this.selectors.statusFilter).selectOption(status);
  }

  async getCount(): Promise<number> {
    return parseInt(await this.getText(this.selectors.countBadge), 10);
  }

  async openFirstInquiry(): Promise<void> {
    await this.page.locator(`${this.selectors.tableBody} tr button`).first().click();
    await this.page.locator(this.selectors.viewModal).waitFor({ state: 'visible' });
  }

  async updateStatus(status: string): Promise<void> {
    await this.page.locator(this.selectors.vmStatusSelect).selectOption(status);
    await this.click(this.selectors.vmSaveBtn);
  }
}
