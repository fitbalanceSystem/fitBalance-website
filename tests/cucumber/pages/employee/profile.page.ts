import { BasePage } from '../base.page';

export class EmployeeProfilePage extends BasePage {
  readonly selectors = {
    empName:    '#emp-name',
    empRole:    '#emp-role',
    empBadge:   '#emp-badge',
    fullname:   '#f-fullname',
    email:      '#f-email',
    phone:      '#f-phone',
    role:       '#f-role',
    myClasses:  '#my-classes',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/employee/profile.html');
  }

  async waitForProfile(): Promise<void> {
    await this.page.locator(this.selectors.empName).waitFor({ state: 'visible', timeout: 10_000 });
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.textContent?.trim().length > 0 && !el.classList.contains('skeleton');
      },
      this.selectors.empName,
      { timeout: 10_000 },
    );
  }

  async getName(): Promise<string> {
    return this.getText(this.selectors.empName);
  }

  async isProfileLoaded(): Promise<boolean> {
    const name = await this.getText(this.selectors.fullname);
    return name.trim().length > 0;
  }
}
