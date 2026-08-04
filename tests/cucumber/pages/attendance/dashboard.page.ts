import { BasePage } from '../base.page';

export class AttendanceDashboardPage extends BasePage {
  readonly selectors = {
    numberInput:        '#numberInput',
    btnSubmit:          '#btnSubmit',
    btnRefresh:         '#btnRefresh',
    btnChangeLesson:    '#btnchangeLesson',
    attendanceCount:    '#attendanceCount',
    lessonName:         '#lessonName',
    lessonDay:          '#lessonDay',
    successModal:       '#successModal',
    successTextTitle:   '#successTextTitle',
    changeLessonModal:  '#changeLessonModal',
    sessionsList:       '#sessionsList',
    passwordModal:      '#passwordModal',
    passwordInput:      '#instructorPasswordInput',
    btnConfirmPassword: '#btnConfirmPassword',
    closeSessionModal:  '#closeSessionModal',
    btnConfirmClose:    '#btnConfirmCloseSession',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/attendance/dashboard1.html');
  }

  async waitForDashboard(): Promise<void> {
    await this.page.locator(this.selectors.btnSubmit).waitFor({ state: 'visible', timeout: 10_000 });
  }

  async enterNumber(value: string): Promise<void> {
    await this.page.locator(this.selectors.numberInput).fill(value);
  }

  async submit(): Promise<void> {
    await this.click(this.selectors.btnSubmit);
  }

  async isSuccessVisible(): Promise<boolean> {
    return this.isVisible(this.selectors.successModal);
  }

  async openChangeLesson(): Promise<void> {
    await this.click(this.selectors.btnChangeLesson);
    await this.page.locator(this.selectors.changeLessonModal).waitFor({ state: 'visible' });
  }

  async isChangeLessonModalOpen(): Promise<boolean> {
    return this.isVisible(this.selectors.changeLessonModal);
  }

  async getLessonName(): Promise<string> {
    return this.getText(this.selectors.lessonName);
  }

  async getAttendanceCount(): Promise<string> {
    return this.getText(this.selectors.attendanceCount);
  }
}
