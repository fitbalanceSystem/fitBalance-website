import { BasePage } from './base.page';

export class ShopPage extends BasePage {
  readonly selectors = {
    productsGrid:  '#products-grid',
    searchInput:   '#search-input',
    sortSelect:    '#sort-select',
    catFilters:    '#cat-filters',
    cartBtn:       '#cart-btn',
    cartCount:     '#cart-count',
    cartDrawer:    '#cart-drawer',
    closeCart:     '#close-cart',
    cartItems:     '#cart-items',
    cartTotal:     '#cart-total',
    checkoutBtn:   '#checkout-btn',
    couponInput:   '#coupon-input',
    couponBtn:     '#coupon-btn',
    productModal:  '#product-modal',
    pmName:        '#pm-name',
    pmPrice:       '#pm-price',
    pmAddBtn:      '#pm-add-btn',
    ordersList:    '#orders-list',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/customer/shop.html');
  }

  async waitForProducts(): Promise<void> {
    await this.page.locator('.product-card').first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async searchProduct(term: string): Promise<void> {
    await this.fill(this.selectors.searchInput, term);
    await this.page.waitForTimeout(500);
  }

  async filterByCategory(categoryText: string): Promise<void> {
    await this.page.locator(`${this.selectors.catFilters} .cat-btn`, { hasText: categoryText }).click();
  }

  async sortBy(value: string): Promise<void> {
    await this.page.locator(this.selectors.sortSelect).selectOption(value);
  }

  async clickFirstProduct(): Promise<void> {
    await this.page.locator('.product-card').first().click();
    await this.page.locator(this.selectors.productModal).waitFor({ state: 'visible' });
  }

  async addFirstProductToCart(): Promise<void> {
    await this.clickFirstProduct();
    await this.click(this.selectors.pmAddBtn);
  }

  async openCart(): Promise<void> {
    await this.click(this.selectors.cartBtn);
    await this.page.locator(this.selectors.cartDrawer).waitFor({ state: 'visible' });
  }

  async getCartCount(): Promise<string> {
    return this.getText(this.selectors.cartCount);
  }

  async getCartTotal(): Promise<string> {
    return this.getText(this.selectors.cartTotal);
  }

  async getProductCount(): Promise<number> {
    return this.page.locator('.product-card').count();
  }

  async closeProductModal(): Promise<void> {
    await this.page.locator(this.selectors.productModal).locator('button').first().click();
  }
}
