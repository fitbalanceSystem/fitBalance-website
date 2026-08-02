import { BasePage } from '../base.page';

export class CustomerProfilePage extends BasePage {
  readonly selectors = {
    profileName: '#profile-name',
    profileEmail:'#profile-email',
    planBadge:   '#plan-badge',
    memberSince: '#member-since',
    firstName:   '#f-firstName',
    lastName:    '#f-lastName',
    mobile:      '#f-mobile',
    email:       '#f-email',
    birthDate:   '#f-birthDate',
    statLeft:    '#stat-left',
    statNext:    '#stat-next',
    recentList:  '#recent-list',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/customer/profile.html');
  }

  async waitForProfile(): Promise<void> {
    await this.page.locator(this.selectors.profileName).waitFor({ state: 'visible', timeout: 10_000 });
  }

  async getProfileName(): Promise<string> {
    return this.getText(this.selectors.profileName);
  }

  async isProfileLoaded(): Promise<boolean> {
    const name = await this.getText(this.selectors.firstName);
    return name !== '—' && name.trim().length > 0;
  }
}
