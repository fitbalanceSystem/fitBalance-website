import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly selectors = {
    emailInput:      '#email',
    passwordInput:   '#password',
    submitBtn:       '#submit-btn',
    errorMsg:        '#error-msg',
    roleCustomer:    '#role-customer',
    roleEmployee:    '#role-employee',
    forgotBtn:       '#forgot-btn',
    forgotPanel:     '#forgot-panel',
    forgotEmail:     '#forgot-email',
    forgotSubmit:    '#forgot-submit',
    forgotSuccess:   '#forgot-success',
    forgotError:     '#forgot-error',
  };

  async goto(): Promise<void> {
    await this.navigate('/login.html');
  }

  async selectRole(role: 'customer' | 'employee'): Promise<void> {
    const selector = role === 'customer'
      ? this.selectors.roleCustomer
      : this.selectors.roleEmployee;
    await this.click(selector);
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.selectors.emailInput, email);
    await this.fill(this.selectors.passwordInput, password);
    await this.click(this.selectors.submitBtn);
    await this.page.waitForLoadState('networkidle');
  }

  async getErrorMessage(): Promise<string> {
    await this.page.locator(this.selectors.errorMsg).waitFor({ state: 'visible' });
    return this.getText(`${this.selectors.errorMsg} span`);
  }

  async openForgotPassword(): Promise<void> {
    await this.click(this.selectors.forgotBtn);
    await this.page.locator(this.selectors.forgotPanel).waitFor({ state: 'visible' });
  }

  async submitForgotPassword(email: string): Promise<void> {
    await this.fill(this.selectors.forgotEmail, email);
    await this.click(this.selectors.forgotSubmit);
  }

  async isErrorVisible(): Promise<boolean> {
    return this.isVisible(this.selectors.errorMsg);
  }
}
