import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/HQ Administrator/.gemini/antigravity/brain/fc573132-6d8d-4550-b06f-9eb28f426230';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 1. Log in as HQ Admin
  console.log('Logging in as HQ Admin...');
  await page.fill('#email', 'hq.admin@carboncarcare.com');
  await page.fill('#password', 'Field2026Admin!Secure');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await page.waitForSelector('text=HQ Operational Oversight', { timeout: 15000 });
  console.log('HQ Dashboard loaded.');

  // 2. Click "Users & Access" or User Management tab
  const usersTab = page.locator('button:has-text("Users & Access")');
  await usersTab.click();
  await page.waitForTimeout(1000);

  // 3. Click "Provision User" button
  console.log('Opening Provision User modal...');
  const provisionBtn = page.locator('button:has-text("Provision User")');
  await provisionBtn.click();
  await page.waitForSelector('text=Provision New System User', { timeout: 5000 });

  // 4. Verify Nigeria (NG) by default
  const deviceSelect = page.locator('#newUserDeviceId');
  await page.waitForTimeout(500);

  const ngOptions = await deviceSelect.locator('option').allInnerTexts();
  console.log('Nigeria Device Options Count:', ngOptions.length);
  console.log('Sample NG options:', ngOptions.slice(0, 5));

  const ngWarning = page.locator('text=No unassigned company devices are currently available for this market');
  const isNgWarningVisible = await ngWarning.isVisible();
  console.log('Is Nigeria warning visible:', isNgWarningVisible);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ng_provision_device_dropdown.png'),
    fullPage: false,
  });
  console.log('Saved ng_provision_device_dropdown.png');

  // 5. Select Zambia (ZM)
  console.log('Selecting Zambia...');
  const marketSelect = page.locator('select#marketCode, select[name="marketCode"]').first();
  await marketSelect.selectOption('ZM');
  await page.waitForTimeout(500);

  const zmOptions = await deviceSelect.locator('option').allInnerTexts();
  console.log('Zambia Device Options Count:', zmOptions.length);
  console.log('ZM options:', zmOptions);
  const isZmWarningVisible = await ngWarning.isVisible();
  console.log('Is Zambia warning visible:', isZmWarningVisible);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'zm_provision_device_dropdown.png'),
    fullPage: false,
  });
  console.log('Saved zm_provision_device_dropdown.png');

  // 6. Select Malawi (MW)
  console.log('Selecting Malawi...');
  await marketSelect.selectOption('MW');
  await page.waitForTimeout(500);

  const mwOptions = await deviceSelect.locator('option').allInnerTexts();
  console.log('Malawi Device Options Count:', mwOptions.length);
  console.log('MW options:', mwOptions);
  const isMwWarningVisible = await ngWarning.isVisible();
  console.log('Is Malawi warning visible:', isMwWarningVisible);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'mw_provision_device_dropdown.png'),
    fullPage: false,
  });
  console.log('Saved mw_provision_device_dropdown.png');

  await browser.close();
  console.log('Verification finished successfully.');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

