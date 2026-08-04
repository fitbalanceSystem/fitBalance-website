import { Page } from '@playwright/test';

export async function clickWhenReady(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.click(selector);
}

export async function waitForNavigation(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

export async function takeScreenshot(page: Page, name: string): Promise<Buffer> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return page.screenshot({
    path: `tests/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

export async function waitForToast(page: Page, text?: string): Promise<void> {
  const selector = text
    ? `text=${text}`
    : '[id*="toast"], [class*="toast"], [class*="alert"]';
  await page.waitForSelector(selector, { state: 'visible', timeout: 5_000 });
}

export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

export function formatDateHE(date: Date): string {
  return date.toLocaleDateString('he-IL');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
