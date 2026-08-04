import { BasePage } from '../base.page';

export class AdminDashboardPage extends BasePage {
  readonly selectors = {
    kpiMembers:   '#kpiMembers',
    kpiInquiries: '#kpiInquiries',
    kpiDebts:     '#kpiDebts',
    kpiOrders:    '#kpiOrders',
    kpiRevenue:   '#kpiShopRevenue',
    updateList:   '#updateList',
    birthdayList: '#birthdayList',
    inquiryList:  '#inquiryList',
    debtList:     '#debtList',
    orderList:    '#orderList',
    dateBanner:   '#dateBanner',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/index.html');
  }

  async waitForDashboard(): Promise<void> {
    await this.page.locator(this.selectors.kpiMembers).waitFor({ state: 'visible', timeout: 15_000 });
    await this.page.waitForFunction(
      (sel) => document.querySelector(sel)?.textContent?.trim() !== '—',
      this.selectors.kpiMembers,
      { timeout: 15_000 },
    );
  }

  async getKpi(kpi: 'members' | 'inquiries' | 'debts' | 'orders' | 'revenue'): Promise<string> {
    const map = { members: this.selectors.kpiMembers, inquiries: this.selectors.kpiInquiries, debts: this.selectors.kpiDebts, orders: this.selectors.kpiOrders, revenue: this.selectors.kpiRevenue };
    return this.getText(map[kpi]);
  }
}
