/**
 * ============================================
 * SauceDemo Automation Test (Selenium + TypeScript)
 * ============================================
 *
 * Description:
 * This script automates a basic end-to-end user flow on the SauceDemo website
 * (https://www.saucedemo.com/) using Selenium WebDriver with TypeScript.
 *
 * The test simulates a real user performing the following actions:
 *
 * 1. Navigate to the SauceDemo login page
 * 2. Log in using valid credentials:
 *    - Username: standard_user
 *    - Password: secret_sauce
 *
 * 3. Verify that login was successful by:
 *    - Waiting for the URL to contain "inventory.html"
 *    - Validating the page title contains "Swag Labs"
 *    - Ensuring the inventory container is visible
 *
 * 4. Select a product and add it to the cart:
 *    - Clicks the first available "Add to Cart" button
 *
 * 5. Validate cart functionality:
 *    - Confirms the shopping cart badge appears
 *    - Verifies the badge value equals "1"
 *
 * 6. Print execution logs for visibility
 *
 * 7. Gracefully close the browser session
 *
 * Key Features:
 * - Uses async/await for clean asynchronous flow
 * - Includes assertions for validation (Node.js assert)
 * - Applies explicit waits to prevent flaky tests
 * - Modular structure using reusable functions
 *
 * This script demonstrates:
 * - Basic UI automation
 * - Element interaction
 * - Assertions and validations
 * - Test structure best practices
 *
 * ============================================
 */
import { Builder, By, until, WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import assert from "assert";

async function login(driver: WebDriver) {
  await driver.get("https://www.saucedemo.com/");

  await driver.findElement(By.id("user-name")).sendKeys("standard_user");
  await driver.findElement(By.id("password")).sendKeys("secret_sauce");
  await driver.findElement(By.id("login-button")).click();
}

async function verifyLoginSuccess(driver: WebDriver) {
  // המתנה לטעינת עמוד המוצרים
  await driver.wait(until.urlContains("inventory.html"), 5000);

  const title = await driver.getTitle();
  assert.ok(title.includes("Swag Labs"), "Login failed - title not correct");

  const inventoryContainer = await driver.findElement(By.id("inventory_container"));
  assert.ok(inventoryContainer, "Inventory page not loaded");

  console.log("PASS: Login successful");
}

async function addProductToCart(driver: WebDriver) {
  // הוספת מוצר ראשון
  const addButton = await driver.findElement(By.css(".inventory_item button"));
  await addButton.click();

  console.log("PASS: Product added to cart");
}

async function verifyCartUpdated(driver: WebDriver) {
  const cartBadge = await driver.findElement(By.className("shopping_cart_badge"));
  const badgeText = await cartBadge.getText();

  assert.strictEqual(badgeText, "1", "Cart badge is not 1");

  console.log("PASS: Cart updated correctly");
}

async function runTest() {
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(new chrome.Options())
    .build();

  try {
    await login(driver);
    await verifyLoginSuccess(driver);
    await addProductToCart(driver);
    await verifyCartUpdated(driver);

    console.log("Test passed successfully");
  } catch (error) {
    console.error("[Exception]: ", error);
  } finally {
    await driver.quit();
  }
}

runTest();