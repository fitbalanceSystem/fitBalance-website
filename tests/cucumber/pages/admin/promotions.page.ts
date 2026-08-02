import { BasePage } from '../base.page';

export class AdminPromotionsPage extends BasePage {
  readonly selectors = {
    addBtn:       '#addBtn',
    searchInput:  '#searchInput',
    typeFilter:   '#typeFilter',
    statusFilter: '#statusFilter',
    countBadge:   '#countBadge',
    promosBody:   '#promosBody',
    modal:        '#promoModal',
    modalTitle:   '#modalTitle',
    saveBtn:      '#saveBtn',
    nameInput:    '#f-name',
    typeSelect:   '#f-type',
    valueInput:   '#f-value',
    couponInput:  '#f-coupon',
    activeCheck:  '#f-active',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/promotions.html');
  }

  async waitForPromos(): Promise<void> {
    await this.page.locator(this.selectors.countBadge).waitFor({ state: 'visible', timeout: 10_000 });
  }

  async openAddModal(): Promise<void> {
    await this.click(this.selectors.addBtn);
    await this.page.locator(this.selectors.modal).waitFor({ state: 'visible' });
  }

  async fillPromoForm(data: { name: string; type: string; value: number; coupon?: string }): Promise<void> {
    await this.fill(this.selectors.nameInput, data.name);
    await this.page.locator(this.selectors.typeSelect).selectOption(data.type);
    await this.fill(this.selectors.valueInput, String(data.value));
    if (data.coupon) await this.fill(this.selectors.couponInput, data.coupon);
  }

  async savePromo(): Promise<void> {
    await this.click(this.selectors.saveBtn);
    await this.page.locator(this.selectors.modal).waitFor({ state: 'hidden' });
  }

  async getCount(): Promise<number> {
    return parseInt(await this.getText(this.selectors.countBadge), 10);
  }

  async toggleFirstPromo(): Promise<void> {
    await this.page.locator(`${this.selectors.promosBody} tr button`, { hasText: /השבת|הפעל/ }).first().click();
  }
}
