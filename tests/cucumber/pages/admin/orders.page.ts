import { BasePage } from '../base.page';

export class AdminOrdersPage extends BasePage {
  readonly selectors = {
    searchInput:  '#searchInput',
    statusFilter: '#statusFilter',
    typeFilter:   '#typeFilter',
    countBadge:   '#countBadge',
    ordersBody:   '#ordersBody',
    orderModal:   '#orderModal',
    statusSelect: '#statusSelect',
    adminNotes:   '#adminNotes',
    kpiTotal:     '#kpi-total',
    kpiNew:       '#kpi-new',
    kpiRevenue:   '#kpi-revenue',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/orders.html');
  }

  async waitForOrders(): Promise<void> {
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

  async openFirstOrder(): Promise<void> {
    await this.page.locator(`${this.selectors.ordersBody} tr button`, { hasText: 'פרטים' }).first().click();
    await this.page.locator(this.selectors.orderModal).waitFor({ state: 'visible' });
  }

  async updateOrderStatus(status: string): Promise<void> {
    await this.page.locator(this.selectors.statusSelect).selectOption(status);
    await this.page.locator(`${this.selectors.orderModal} button`, { hasText: 'עדכן' }).click();
    await this.page.locator(this.selectors.orderModal).waitFor({ state: 'hidden' });
  }

  async getKpiValue(kpi: 'total' | 'new' | 'revenue'): Promise<string> {
    return this.getText(`#kpi-${kpi}`);
  }
}
