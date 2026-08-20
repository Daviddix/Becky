import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function fillFormAndScreenshot(url, answers) {
  // Create a unique temporary filename for the screenshot
  const screenshotPath = `./ghost_view_${Date.now()}.png`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Loop through the Gemini answers and inject them into the DOM
    for (const [fieldName, fieldValue] of Object.entries(answers)) {
      try {
        // Playwright looks for the exact name attribute to fill
        await page.fill(`[name="${fieldName}"]`, fieldValue, { timeout: 2000 });
      } catch (e) {
        console.log(`Could not fill field: ${fieldName} - it might be hidden or read-only.`);
      }
    }

    // Capture the Ghost View (we'll only capture the viewport, not the full page, to save data)
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    await browser.close();
    return screenshotPath; // Return the path so Telegram can send it
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export {fillFormAndScreenshot}