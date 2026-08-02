import { BasePage } from '../base.page';

export class AdminHomePage extends BasePage {
  readonly selectors = {
    heroTitle:      '#hero-title',
    heroSubtitle:   '#hero-subtitle',
    heroCtaText:    '#hero-cta-text',
    heroCtaLink:    '#hero-cta-link',
    heroImgUrl:     '#hero-img-url',
    saveHeroBtn:    'button[onclick="saveHero()"]',
    savedHero:      '#saved-hero',
    featuredSelect: '#featured-add-select',
    addFeaturedBtn: 'button[onclick="addFeatured()"]',
    saveFeaturedBtn:'button[onclick="saveFeatured()"]',
    savedFeatured:  '#saved-featured',
    catsList:       '#cats-list',
    saveCatsBtn:    'button[onclick="saveCats()"]',
    savedCats:      '#saved-cats',
    tabNav:         '.tab-nav',
  };

  async goto(): Promise<void> {
    await this.navigate('/pages/admin/homepage.html');
  }

  async switchTab(name: 'hero' | 'featured' | 'recommended' | 'categories'): Promise<void> {
    await this.page.locator(`.tab-nav button[onclick="switchTab('${name}',this)"]`).click();
    await this.page.locator(`#tab-${name}`).waitFor({ state: 'visible' });
  }

  async fillHero(data: { title: string; subtitle: string; ctaText: string; ctaLink: string }): Promise<void> {
    await this.fill(this.selectors.heroTitle,   data.title);
    await this.fill(this.selectors.heroSubtitle, data.subtitle);
    await this.fill(this.selectors.heroCtaText,  data.ctaText);
    await this.fill(this.selectors.heroCtaLink,  data.ctaLink);
  }

  async saveHero(): Promise<void> {
    await this.click(this.selectors.saveHeroBtn);
    await this.page.locator(this.selectors.savedHero).waitFor({ state: 'visible' });
  }

  async isSavedVisible(section: 'hero' | 'featured' | 'cats'): Promise<boolean> {
    return this.isVisible(`#saved-${section}`);
  }
}
