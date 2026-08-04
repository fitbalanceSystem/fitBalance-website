import { BasePage } from '../base.page';

export class AdminAutomationsPage extends BasePage {
  readonly selectors = {
    runBtnSalary:   'button[onclick="triggerSalary()"]',
    runBtnAbsence:  '#btnAbsence',
    absenceResult:  '#absenceResult',
    absenceBody:    '#absenceBody',
    logsBody:       '#logsBody',
    filterMonth:    '#filterMonth',
    toast:          '#toast',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/automations.html');
  }

  async waitForLogs(): Promise<void> {
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && !el.textContent?.includes('טוען');
      },
      this.selectors.logsBody,
      { timeout: 15_000 },
    );
  }

  async runAbsenceCheck(): Promise<void> {
    await this.click(this.selectors.runBtnAbsence);
    await this.page.locator(this.selectors.absenceResult).waitFor({ state: 'visible', timeout: 20_000 });
  }

  async isAbsenceResultVisible(): Promise<boolean> {
    return this.isVisible(this.selectors.absenceResult);
  }
}
