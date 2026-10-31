import time
from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        page.fill('input[type="email"]', "tunde.adebayo@carboncarcare.com")
        page.fill('input[type="password"]', os.environ.get("DEV_USER_PASSWORD", ""))
        page.click('button[type="submit"]')
        page.wait_for_load_state("networkidle")
        time.sleep(3)

        page.screenshot(path="docs/screenshots/stage3f/tunde_dashboard.png")
        print("Captured docs/screenshots/stage3f/tunde_dashboard.png")

        buttons = page.locator("button").all()
        print(f"Buttons found ({len(buttons)}):")
        for i, b in enumerate(buttons):
            txt = b.inner_text().replace("\n", " ").strip()
            print(f"  [{i}]: '{txt}'")

        browser.close()

if __name__ == "__main__":
    test()

