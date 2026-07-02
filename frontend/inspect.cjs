const { chromium } = require('playwright');
(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log('Navigating...');
  await page.goto('http://localhost:5173/masters/cities', { waitUntil: 'networkidle' });
  console.log('Clicking Add City...');
  await page.click('button:has-text("Add City")');
  await page.waitForTimeout(1000); // wait for modal
  console.log('Evaluating...');
  const res = await page.evaluate(() => {
    const dialog = document.querySelector('.MuiDialog-paper');
    if (!dialog) return 'No dialog found';
    
    // Find the Autocomplete
    const auto = document.querySelector('.MuiAutocomplete-root');
    if (!auto) return 'No Autocomplete found';
    
    const autoStyle = window.getComputedStyle(auto);
    
    const parentGridItem = auto.closest('.MuiGrid-item');
    const gridStyle = parentGridItem ? window.getComputedStyle(parentGridItem) : null;
    
    // Check City Name input width too
    const inputs = Array.from(document.querySelectorAll('.MuiGrid-item'));
    const cityInputGrid = inputs.length > 0 ? inputs[0] : null;
    const cityGridStyle = cityInputGrid ? window.getComputedStyle(cityInputGrid) : null;
    
    return {
      auto: {
        width: autoStyle.width,
        minWidth: autoStyle.minWidth,
        maxWidth: autoStyle.maxWidth,
        flex: autoStyle.flex
      },
      parentGrid: gridStyle ? {
        width: gridStyle.width,
        flex: gridStyle.flex,
        flexBasis: gridStyle.flexBasis,
        maxWidth: gridStyle.maxWidth
      } : null,
      cityGrid: cityGridStyle ? {
        width: cityGridStyle.width,
        flex: cityGridStyle.flex,
        flexBasis: cityGridStyle.flexBasis,
        maxWidth: cityGridStyle.maxWidth
      } : null,
      dialogWidth: window.getComputedStyle(dialog).width
    };
  });
  console.log('Result:', JSON.stringify(res, null, 2));
  await browser.close();
})();
