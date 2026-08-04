import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';
import { getEnvConfig, EnvConfig } from '../utils/env';

export class FitBalanceWorld extends World {
  browser!:  Browser;
  context!:  BrowserContext;
  page!:     Page;
  config:    EnvConfig;

  constructor(options: IWorldOptions) {
    super(options);
    this.config = getEnvConfig();
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: process.env.HEADED !== 'true',
    });
    this.context = await this.browser.newContext({
      baseURL:     this.config.baseUrl,
      locale:      'he-IL',
      timezoneId:  'Asia/Jerusalem',
      recordVideo: { dir: 'tests/reports/videos/' },
    });
    this.page = await this.context.newPage();
  }

  async teardown(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(FitBalanceWorld);
