import { BasePage } from '../base.page';

export class AdminWeeklyCalendarPage extends BasePage {
  readonly selectors = {
    weekRange:        '#week-range',
    daysGrid:         '#days-grid',
    attendanceModal:  '#attendanceModal',
    sessionModal:     '#sessionModal',
    modalTitle:       '#modalTitle',
    attendanceBody:   '#attendanceTableBody',
    attendanceCount:  '#attendanceRowCount',
    saveBtn:          '#saveBtn',
    attendanceBtn:    '#attendanceBtn',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/weekly-calendar.html');
  }

  async waitForCalendar(): Promise<void> {
    await this.page.locator(this.selectors.weekRange).waitFor({ state: 'visible', timeout: 15_000 });
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.children.length > 0;
      },
      this.selectors.daysGrid,
      { timeout: 15_000 },
    );
  }

  async changeWeek(direction: -1 | 1): Promise<void> {
    const label = direction === -1 ? 'שבוע קודם' : 'שבוע הבא';
    await this.page.locator(`button`, { hasText: label }).click();
    await this.page.waitForTimeout(400);
  }

  async getWeekRange(): Promise<string> {
    return this.getText(this.selectors.weekRange);
  }

  async clickFirstSession(): Promise<void> {
    await this.page.locator(`${this.selectors.daysGrid} .session-card, ${this.selectors.daysGrid} [class*="session"]`).first().click();
    await this.page.locator(this.selectors.sessionModal).waitFor({ state: 'visible', timeout: 5_000 });
  }

  async isSessionModalOpen(): Promise<boolean> {
    return this.isVisible(this.selectors.sessionModal);
  }

  async isAttendanceModalOpen(): Promise<boolean> {
    return this.isVisible(this.selectors.attendanceModal);
  }
}
