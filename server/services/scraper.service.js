import { chromium } from 'playwright';

export async function inspectScholarshipPage(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate with a realistic timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Extract basic page text and find form elements
    const pageData = await page.evaluate(() => {
      const pageTitle = document.title || '';
      const bodyText = document.body.innerText.slice(0, 3000); // Top text for context

      // Discover form inputs and textareas
      const elements = Array.from(document.querySelectorAll('input, textarea, select'));
      const fields = elements.map(el => {
        const id = el.id;
        let labelText = '';
        if (id) {
          const labelEl = document.querySelector(`label[for="${id}"]`);
          if (labelEl) labelText = labelEl.innerText.trim();
        }
        if (!labelText && el.closest('label')) {
          labelText = el.closest('label').innerText.trim();
        }

        return {
          name: el.name || el.id || 'unnamed_field',
          type: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : (el.type || 'text'),
          placeholder: el.placeholder || '',
          label: labelText || el.placeholder || el.name || 'Input field',
          required: el.required || false
        };
      });

      return { pageTitle, bodyText, fields };
    });

    await browser.close();
    return pageData;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export async function injectAndSubmit(url, formFields) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const screenshotPath = `./uploads/success_${timestamp}.png`;

  try {
    // 1. Navigate to the scholarship portal
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 2. Inject the approved text into the corresponding DOM elements
    for (const field of formFields) {
      if (!field.name || !field.value) continue;

      try {
        // We use the exact name attribute Playwright scraped initially
        const selector = `[name="${field.name}"]`;
        await page.waitForSelector(selector, { state: 'visible', timeout: 2000 });
        
        if (field.type === 'radio' || field.type === 'checkbox') {
          await page.check(selector);
        } else {
          await page.fill(selector, field.value);
        }
      } catch (err) {
        console.log(`⚠️ Could not fill field: ${field.name}`);
      }
    }

    // 3. Find and click the Submit button
    // This uses a combined selector to find common submit buttons
    const submitSelector = 'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")';
    
    await page.waitForSelector(submitSelector, { state: 'visible', timeout: 5000 });
    
    // Click it and wait for the page to navigate to the "Thank You" screen
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      page.click(submitSelector)
    ]);

    // 4. Take a screenshot of the confirmation page as proof
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await browser.close();
    return { success: true, proofImage: screenshotPath };

  } catch (error) {
    await browser.close();
    console.error('Injection failed:', error);
    throw new Error('Failed to submit the form.');
  }
}