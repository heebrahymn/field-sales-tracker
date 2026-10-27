import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity-ide\brain\8b9fad0a-b1b7-4393-8c3b-5454f954b105\screenshots_3b"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_dev_password():
    pwd = os.environ.get("DEV_USER_PASSWORD")
    if not pwd and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DEV_USER_PASSWORD="):
                    pwd = line.strip().split("=", 1)[1]
                    break
    return pwd or ""

DEV_PASSWORD = get_dev_password()

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
        ]
    )
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        permissions=["geolocation", "camera"],
        geolocation={"latitude": 6.5244, "longitude": 3.3792, "accuracy": 14.0}
    )
    page = context.new_page()
    page.goto("http://localhost:5173", wait_until="networkidle")

    # Login as salesperson
    page.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
    page.fill('input[name="password"]', DEV_PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_selector('text=Tunde', timeout=15000)
    time.sleep(1)

    # Click on the tile or trigger Start Day Modal
    # In SalespersonHomePreview, let's trigger it by clicking tile or evaluating
    start_btn = page.query_selector('text=Start Workday')
    if start_btn:
        start_btn.click()
    else:
        # If currently in started state, click End Day tile to show End Day modal!
        end_btn = page.query_selector('text=End Day (Blocked)') or page.query_selector('text=End Workday')
        if end_btn:
            end_btn.click()

    time.sleep(1.5)
    modal_path = os.path.join(OUTPUT_DIR, "stage3b_02_workday_modal_390.png")
    page.screenshot(path=modal_path)
    print("Captured:", modal_path)
    browser.close()
