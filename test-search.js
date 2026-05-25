import { chromium } from 'playwright';

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Log console messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    console.log('Navigating to http://localhost:4323/');
    await page.goto('http://localhost:4323/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('Checking if search input is visible...');
    const input = page.locator('#desktop-search-input');
    const isVisible = await input.isVisible();
    console.log('Is input visible:', isVisible);
    
    console.log('Clicking search input...');
    await input.click();
    
    console.log('Evaluating DOM properties of search input...');
    const props = await page.evaluate(() => {
      const el = document.getElementById('desktop-search-input');
      if (!el) return { error: 'Not found' };
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const topEl = document.elementFromPoint(x, y);
      return {
        disabled: el.disabled,
        readOnly: el.readOnly,
        tagName: el.tagName,
        type: el.type,
        pointerEvents: style.pointerEvents,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        width: rect.width,
        height: rect.height,
        offsetWidth: el.offsetWidth,
        offsetHeight: el.offsetHeight,
        topElementTagName: topEl ? topEl.tagName : 'null',
        topElementId: topEl ? topEl.id : 'null',
        topElementClassName: topEl ? topEl.className : 'null',
      };
    });
    console.log('DOM Properties:', props);

    console.log('Pressing keys sequentially for "banane"...');
    await input.pressSequentially('banane');
    
    const value = await input.inputValue();
    console.log('Input value after typing:', value);
    
    if (value === 'banane') {
      console.log('SUCCESS: Typing works!');
    } else {
      console.log('FAILURE: Typing did not work. Value is:', value);
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
