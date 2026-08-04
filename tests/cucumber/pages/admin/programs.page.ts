import { BasePage } from '../base.page';

export class AdminProgramsPage extends BasePage {
  readonly selectors = {
    searchInput:    '#searchInput',
    showActiveOnly: '#showActiveOnly',
    programsBody:   '#programsBody',
    newProgramBtn:  '#newProgramBtn',
    modal:          '#lessonModal',
    modalTitle:     '#modalTitle',
    saveBtn:        '#save-program-btn',
    lessonName:     '#lessonName',
    lessonDay:      '#lessonDay',
    lessonTime:     '#lessonTime',
    lessonStartDate:'#lessonStartDate',
    lessonEndDate:  '#lessonEndDate',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/programs.html');
  }

  async waitForPrograms(): Promise<void> {
    await this.page.locator(`${this.selectors.programsBody} tr`).first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async search(term: string): Promise<void> {
    await this.fill(this.selectors.searchInput, term);
    await this.page.waitForTimeout(400);
  }

  async openAddModal(): Promise<void> {
    await this.click(this.selectors.newProgramBtn);
    await this.page.locator(this.selectors.modal).waitFor({ state: 'visible' });
  }

  async getRowCount(): Promise<number> {
    return this.page.locator(`${this.selectors.programsBody} tr`).count();
  }
}
