import time
import os
from playwright.sync_api import sync_playwright

def inspect():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        # Login as Tunde Adebayo
        email_input = page.query_selector('input[type="email"]') or page.query_selector('#email')
        if email_input:
            email_input.fill("tunde.adebayo@carboncarcare.com")
            pwd_input = page.query_selector('input[type="password"]') or page.query_selector('#password')
            pwd_input.fill(os.environ.get("DEV_USER_PASSWORD", ""))
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            time.sleep(3)

        page.screenshot(path="docs/screenshots/stage3f/current_salesperson_home.png")
        print("Captured docs/screenshots/stage3f/current_salesperson_home.png")

        # Print all buttons on page
        buttons = page.locator("button").all()
        print(f"Total buttons found: {len(buttons)}")
        for i, b in enumerate(buttons):
            txt = b.inner_text().replace("\n", " ").strip()
            print(f"Button {i}: '{txt}'")

        browser.close()

if __name__ == "__main__":
    inspect()

