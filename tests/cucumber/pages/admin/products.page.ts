import { BasePage } from '../base.page';

export class AdminProductsPage extends BasePage {
  readonly selectors = {
    addBtn:       '#addBtn',
    searchInput:  '#searchInput',
    catFilter:    '#catFilter',
    statusFilter: '#statusFilter',
    countBadge:   '#countBadge',
    productsBody: '#productsBody',
    modal:        '#productModal',
    modalTitle:   '#modalTitle',
    saveBtn:      '#saveBtn',
    nameInput:    '#f-name',
    descInput:    '#f-desc',
    priceInput:   '#f-price',
    stockInput:   '#f-stock',
    skuInput:     '#f-sku',
    activeCheck:  '#f-active',
    categorySelect: '#f-category',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/products.html');
  }

  async waitForProducts(): Promise<void> {
    await this.page.locator(`${this.selectors.productsBody} tr`).first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async openAddModal(): Promise<void> {
    await this.click(this.selectors.addBtn);
    await this.page.locator(this.selectors.modal).waitFor({ state: 'visible' });
  }

  async fillProductForm(data: {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    sku?: string;
  }): Promise<void> {
    await this.fill(this.selectors.nameInput, data.name);
    if (data.description) await this.fill(this.selectors.descInput, data.description);
    // Switch to pricing tab
    await this.page.locator('._ptab[data-tab="pricing"]').click();
    await this.fill(this.selectors.priceInput, String(data.price));
    // Switch to inventory tab
    await this.page.locator('._ptab[data-tab="inventory"]').click();
    if (data.stock !== undefined) await this.fill(this.selectors.stockInput, String(data.stock));
    // Back to basic
    await this.page.locator('._ptab[data-tab="basic"]').click();
    if (data.sku) await this.fill(this.selectors.skuInput, data.sku);
  }

  async saveProduct(): Promise<void> {
    await this.click(this.selectors.saveBtn);
    await this.page.locator(this.selectors.modal).waitFor({ state: 'hidden' });
  }

  async searchProduct(term: string): Promise<void> {
    await this.fill(this.selectors.searchInput, term);
    await this.page.waitForTimeout(300);
  }

  async filterByStatus(status: 'true' | 'false' | ''): Promise<void> {
    await this.page.locator(this.selectors.statusFilter).selectOption(status);
  }

  async getProductCount(): Promise<number> {
    const text = await this.getText(this.selectors.countBadge);
    return parseInt(text, 10);
  }

  async clickEditOnRow(productName: string): Promise<void> {
    const row = this.page.locator(`${this.selectors.productsBody} tr`, { hasText: productName });
    await row.locator('button', { hasText: 'עריכה' }).click();
    await this.page.locator(this.selectors.modal).waitFor({ state: 'visible' });
  }

  async clickDeleteOnRow(productName: string): Promise<void> {
    const row = this.page.locator(`${this.selectors.productsBody} tr`, { hasText: productName });
    await row.locator('button', { hasText: '🗑️' }).click();
  }

  async isModalOpen(): Promise<boolean> {
    return this.isVisible(this.selectors.modal);
  }
}
