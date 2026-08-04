import { BasePage } from '../base.page';

export type ReportTab = 'status' | 'debt' | 'programs' | 'payments' | 'trials' | 'salary' | 'attendance' | 'management' | 'inventory' | 'gifts';

export class AdminReportsPage extends BasePage {
  readonly selectors = {
    statusBody:    '#statusBody',
    debtBody:      '#debtBody',
    programsBody:  '#programsBody',
    inventoryBody: '#inventoryBody',
    giftsBody:     '#giftsBody',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/reports.html');
  }

  async switchTab(tab: ReportTab): Promise<void> {
    await this.page.locator(`button[onclick="showReport('${tab}',this)"]`).click();
    await this.page.locator(`#report-${tab}`).waitFor({ state: 'visible' });
  }

  async waitForSection(tab: ReportTab): Promise<void> {
    const bodyMap: Partial<Record<ReportTab, string>> = {
      status: this.selectors.statusBody,
      debt:   this.selectors.debtBody,
      inventory: this.selectors.inventoryBody,
    };
    const sel = bodyMap[tab];
    if (sel) {
      await this.page.waitForFunction(
        (s) => {
          const el = document.querySelector(s);
          return el && !el.textContent?.includes('טוען');
        },
        sel,
        { timeout: 15_000 },
      );
    }
  }

  async isTabActive(tab: ReportTab): Promise<boolean> {
    return this.isVisible(`#report-${tab}.active`);
  }
}
