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