import { BasePage } from '../base.page';

export type StoreSettingsTab = 'brand' | 'contact' | 'social' | 'shipping' | 'payment';

export class AdminStoreSettingsPage extends BasePage {
  readonly selectors = {
    storeName:     '#store-name',
    contactPhone:  '#contact-phone',
    contactEmail:  '#contact-email',
    shippingPrice: '#shipping-price',
    savedBrand:    '#saved-brand',
    savedContact:  '#saved-contact',
    savedShipping: '#saved-shipping',
    savedSocial:   '#saved-social',
    savedPayment:  '#saved-payment',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/store-settings.html');
  }

  async waitForSettings(): Promise<void> {
    await this.page.locator(this.selectors.storeName).waitFor({ state: 'visible', timeout: 10_000 });
  }

  async switchTab(tab: StoreSettingsTab): Promise<void> {
    await this.page.locator(`button[onclick="switchTab('${tab}',this)"]`).click();
    await this.page.locator(`#tab-${tab}`).waitFor({ state: 'visible' });
  }

  async saveAndWait(section: StoreSettingsTab): Promise<void> {
    const saveFnMap: Record<StoreSettingsTab, string> = {
      brand: 'saveBrand()', contact: 'saveContact()', social: 'saveSocial()',
      shipping: 'saveShipping()', payment: 'savePayment()',
    };
    await this.page.locator(`button[onclick="${saveFnMap[section]}"]`).click();
    await this.page.locator(this.selectors[`saved${section.charAt(0).toUpperCase() + section.slice(1)}` as keyof typeof this.selectors]).waitFor({ state: 'visible', timeout: 5_000 });
  }

  async isSavedVisible(section: StoreSettingsTab): Promise<boolean> {
    return this.isVisible(`#saved-${section}`);
  }
}
