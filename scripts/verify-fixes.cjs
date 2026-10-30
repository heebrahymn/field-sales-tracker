const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/HQ Administrator/.gemini/antigravity/brain/fc573132-6d8d-4550-b06f-9eb28f426230';
const BASE_URL = 'http://localhost:5173';

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['geolocation', 'camera'],
    geolocation: { latitude: 6.5892, longitude: 3.3581 },
  });

  const page = await context.newPage();

  console.log('--- Step 1: Login as Country Sales Head (Nigeria) ---');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill in Country Sales Head login
  await page.fill('input[type="email"]', 'babatunde.adeleke@carboncarcare.com');
  await page.fill('input[type="password"]', '[DEV_USER_PASSWORD_REDACTED]');
  await page.click('button:has-text("Sign In to Carbon Field")');

  await page.waitForTimeout(3000);
  console.log('Sales Head Logged In. Current URL:', page.url());

  // Capture Dashboard Overview
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_sales_head_dashboard.png'), fullPage: true });

  console.log('--- Step 2: Check Team Attendance Review ---');
  // Click Team Attendance tab
  const attendanceBtn = page.locator('button:has-text("Team Attendance")').first();
  if (await attendanceBtn.count() > 0) {
    await attendanceBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_team_attendance_view.png'), fullPage: true });

  // If there's an "Approve Non-Visit Day" button, test approving it!
  const approveNonVisitBtn = page.locator('button:has-text("Approve Non-Visit Day")').first();
  if (await approveNonVisitBtn.count() > 0 && await approveNonVisitBtn.isVisible()) {
    console.log('Found pending non-visit workday request. Clicking Approve Non-Visit Day...');
    await approveNonVisitBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_non_visit_approved_table.png'), fullPage: true });
    console.log('Captured approved non-visit table screenshot.');
  } else {
    console.log('No pending non-visit request at this moment.');
  }

  console.log('--- Step 3: Check Client Approvals (Proposed Pins Queue) ---');
  const clientApprovalsBtn = page.locator('button:has-text("Client Approvals")').first();
  if (await clientApprovalsBtn.count() > 0) {
    await clientApprovalsBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_client_approvals_queue.png'), fullPage: true });
  }

  console.log('--- Step 4: Login as Salesperson (Tunde Adebayo) on Mobile Viewport ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    permissions: ['geolocation', 'camera'],
    geolocation: { latitude: 6.5892, longitude: 3.3581 },
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto(`${BASE_URL}/login`);
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.fill('input[type="email"]', 'tunde.adebayo@carboncarcare.ng');
  await mobilePage.fill('input[type="password"]', '[DEV_USER_PASSWORD_REDACTED]');
  await mobilePage.click('button:has-text("Sign In to Carbon Field")');
  await mobilePage.waitForTimeout(3000);

  console.log('Salesperson Mobile Logged In. Current URL:', mobilePage.url());
  await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_salesperson_home.png') });

  // Navigate to Clients & Locations Directory
  const clientsNavBtn = mobilePage.locator('button:has-text("Clients"), a:has-text("Clients")').first();
  if (await clientsNavBtn.count() > 0) {
    await clientsNavBtn.click();
    await mobilePage.waitForTimeout(2000);
  }

  // Open "Add Client" modal
  const addClientBtn = mobilePage.locator('button:has-text("Add Client"), button:has-text("New Client")').first();
  if (await addClientBtn.count() > 0) {
    await addClientBtn.click();
    await mobilePage.waitForTimeout(1500);

    // Verify Camera UI in RegisterBranchModal
    await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_register_client_camera_modal.png') });
    console.log('Captured register client modal with live camera preview.');

    // Click "Open Live Camera" if present
    const openCamBtn = mobilePage.locator('button:has-text("Open Live Camera")').first();
    if (await openCamBtn.count() > 0 && await openCamBtn.isVisible()) {
      await openCamBtn.click();
      await mobilePage.waitForTimeout(1500);
      await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_register_client_camera_active.png') });
      console.log('Live camera activated in client registration modal.');

      // Test camera flip button
      const switchBtn = mobilePage.locator('button:has-text("Switch to Front"), button:has-text("Switch to Back")').first();
      if (await switchBtn.count() > 0) {
        console.log('Testing camera flip...');
        await switchBtn.click();
        await mobilePage.waitForTimeout(1000);
        await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_register_client_camera_flipped.png') });
      }

      // Snap photo
      const captureBtn = mobilePage.locator('button:has-text("Capture Photo")').first();
      if (await captureBtn.count() > 0) {
        await captureBtn.click();
        await mobilePage.waitForTimeout(1000);
        await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_register_client_photo_snapped.png') });
        console.log('Live premises photo snapped in client registration.');
      }
    }

    // Close modal
    const closeBtn = mobilePage.locator('button:has-text("Cancel")').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await mobilePage.waitForTimeout(500);
    }
  }

  // Check Exceptions Workbench on mobile
  const exceptionsNavBtn = mobilePage.locator('button:has-text("Exceptions"), a:has-text("Exceptions")').first();
  if (await exceptionsNavBtn.count() > 0) {
    await exceptionsNavBtn.click();
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'fix_salesperson_exceptions_workbench.png') });
    console.log('Captured salesperson exceptions workbench with refresh control.');
  }

  await browser.close();
  console.log('--- Verification Complete! ---');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

