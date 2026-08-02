import { BasePage } from '../base.page';

export class CustomerSchedulePage extends BasePage {
  readonly selectors = {
    scheduleGrid: '#schedule-grid',
    navLabel:     '#nav-label',
    prevWeek:     '#prev-week',
    nextWeek:     '#next-week',
    todayBtn:     '#today-btn',
    printBtn:     '#print-btn',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/customer/schedule.html');
  }

  async waitForSchedule(): Promise<void> {
    await this.page.locator(this.selectors.navLabel).waitFor({ state: 'visible', timeout: 10_000 });
  }

  async goToNextWeek(): Promise<void> {
    await this.click(this.selectors.nextWeek);
    await this.page.waitForTimeout(300);
  }

  async goToPrevWeek(): Promise<void> {
    await this.click(this.selectors.prevWeek);
    await this.page.waitForTimeout(300);
  }

  async goToToday(): Promise<void> {
    await this.click(this.selectors.todayBtn);
    await this.page.waitForTimeout(300);
  }

  async getNavLabel(): Promise<string> {
    return this.getText(this.selectors.navLabel);
  }
}
