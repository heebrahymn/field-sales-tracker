import time
from playwright.sync_api import sync_playwright

users = [
    "chukwudi.okafor@carboncarcare.com",
    "amina.bello@carboncarcare.com",
    "peter.mwale@carboncarcare.com",
    "thandiwe.tembo@carboncarcare.com"
]

def check():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for u in users:
            context = browser.new_context(viewport={"width": 390, "height": 844})
            page = context.new_page()
            page.goto("http://localhost:5173", wait_until="networkidle")
            time.sleep(1)

            page.fill('input[type="email"]', u)
            page.fill('input[type="password"]', "[DEV_USER_PASSWORD_REDACTED]")
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            start_btn = page.locator("button:has-text('Start Workday'), button:has-text('Start Day')").first
            is_start = start_btn.is_visible()
            print(f"User {u} -> Has Start Workday button: {is_start}")
            context.close()
        browser.close()

if __name__ == "__main__":
    check()

