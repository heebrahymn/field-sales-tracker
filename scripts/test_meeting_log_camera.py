import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACTS_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
BASE_URL = "http://localhost:5173"
PASSWORD = "[DEV_USER_PASSWORD_REDACTED]"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()

        await page.goto(BASE_URL)
        await page.wait_for_selector("input[type='email']")
        await page.fill("input[type='email']", "tunde.adebayo@carboncarcare.com")
        await page.fill("input[type='password']", PASSWORD)
        await page.click("button[type='submit']")

        await page.wait_for_timeout(2500)

        # Check if meeting log modal or pending logs exists
        # Click on Pending Meeting Logs if any or trigger meeting log button
        log_btn = page.locator("button:has-text('Complete Log')").or_(page.locator("button:has-text('Meeting Log')")).first
        if await log_btn.is_visible():
            await log_btn.click()
            await page.wait_for_timeout(1000)
            ss_path = os.path.join(ARTIFACTS_DIR, "fix_round3_meeting_log_modal_card_upload.png")
            await page.screenshot(path=ss_path, full_page=False)
            print("Meeting Log Modal screenshot saved:", ss_path)
        else:
            print("No open visit for meeting log; checking completed visits list")

        # Check Add Client Modal camera toggle
        clients_btn = page.locator("button:has-text('Clients')")
        if await clients_btn.is_visible():
            await clients_btn.click()
            await page.wait_for_timeout(1500)
            add_client_btn = page.locator("button:has-text('Add Client')")
            if await add_client_btn.is_visible():
                await add_client_btn.click()
                await page.wait_for_selector("text=Register Client & Propose Location Pin")
                await page.wait_for_timeout(1000)
                ss_path_add = os.path.join(ARTIFACTS_DIR, "fix_round3_salesperson_add_client_camera.png")
                await page.screenshot(path=ss_path_add, full_page=False)
                print("Add Client Camera Modal screenshot saved:", ss_path_add)

        await browser.close()

asyncio.run(run())

