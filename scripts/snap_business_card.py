import time
import os
from playwright.sync_api import sync_playwright

BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
BASE_URL = "http://localhost:5173"
DEV_PASSWORD = "[DEV_USER_PASSWORD_REDACTED]"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto(f"{BASE_URL}/login")
    page.fill("input[name='email'], input[type='email']", "babatunde.adeleke@carboncarcare.com")
    page.fill("input[name='password'], input[type='password']", DEV_PASSWORD)
    page.click("button:has-text('Sign In With Credentials')")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    page.locator("button:has-text('Client Visit Verification')").first.click()
    time.sleep(2)

    btn = page.locator("button:has-text('Inspect Full Audit Record')").first
    if btn.is_visible():
        btn.click()
        time.sleep(2)
        # Scroll the modal body down to clearly see the business card section
        page.locator(".px-6.py-5").evaluate("e => e.scrollTop = e.scrollHeight")
        time.sleep(1)
        out_path = os.path.join(BRAIN_DIR, "fix_round4_sales_head_business_card_inspection.png")
        page.screenshot(path=out_path)
        print(f"Captured: {out_path}")
    else:
        print("Inspect Full Audit Record button not found")

    browser.close()

