import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACTS_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
BASE_URL = "http://localhost:5173"
PASSWORD = os.environ.get("DEV_USER_PASSWORD", "")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()

        print("Logging in as Tunde Adebayo...")
        await page.goto(BASE_URL)
        await page.wait_for_selector("input[type='email']")
        await page.fill("input[type='email']", "tunde.adebayo@carboncarcare.com")
        await page.fill("input[type='password']", PASSWORD)
        await page.click("button[type='submit']")

        await page.wait_for_timeout(3000)
        ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_salesperson_login_result.png")
        await page.screenshot(path=ss_path, full_page=False)
        print("Screenshot saved to:", ss_path)

        # Check what text is visible
        content = await page.content()
        if "Lagos" in content:
            print("Found 'Lagos' in content!")
        if "Start Day" in content:
            print("Found 'Start Day' in content!")
        if "Invalid" in content:
            print("Found 'Invalid' in content!")

        # Also navigate to clients
        clients_btn = page.locator("button:has-text('Clients')")
        if await clients_btn.is_visible():
            await clients_btn.click()
            await page.wait_for_timeout(2000)
            ss_path_clients = os.path.join(ARTIFACTS_DIR, "fix_round3_salesperson_clients_view.png")
            await page.screenshot(path=ss_path_clients, full_page=False)
            print("Clients screenshot saved to:", ss_path_clients)

        await browser.close()

asyncio.run(run())

