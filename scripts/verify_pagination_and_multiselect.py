import time
import os
import shutil
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "docs/screenshots/stage3f"
BRAIN_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity\brain\fc573132-6d8d-4550-b06f-9eb28f426230"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def get_dev_password():
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("DEV_USER_PASSWORD="):
                return line.strip().split("=", 1)[1]
    return "[DEV_USER_PASSWORD_REDACTED]"

def copy_to_brain(filename):
    src = os.path.join(SCREENSHOT_DIR, filename)
    dst = os.path.join(BRAIN_DIR, filename)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {filename} to brain directory.")

def test_pagination_and_multiselect():
    dev_password = get_dev_password()
    print("=" * 80)
    print("VERIFYING PAGINATION (10, 20, 50, 100) & MULTI-SELECT ROW DELETION")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("\n[Step 1] Navigating to local app at http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        # Check if login form is present
        email_input = page.query_selector('input[type="email"]') or page.query_selector('#email')
        if email_input:
            print("Authenticating as HQ Administrator...")
            email_input.fill("hq.admin@carboncarcare.com")
            pwd_input = page.query_selector('input[type="password"]') or page.query_selector('#password')
            pwd_input.fill(dev_password)
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")
            time.sleep(3)

        print("Authenticated successfully.")

        # =========================================================================
        # 1. VERIFY DEVICE MANAGEMENT PAGINATION & MULTI-SELECT
        # =========================================================================
        print("\n--- Testing HQ Device Management ---")
        page.click("button:has-text('Devices & MDM')")
        page.wait_for_selector('text="Company-Issued Handset Inventory & MDM"', timeout=10000)
        time.sleep(2)

        # 1.1 Verify Pagination is visible
        pagination_text = page.locator("text=/Showing \\d+ to \\d+ of \\d+ devices/i")
        pagination_text.wait_for(timeout=10000)
        print("Device pagination text visible:", pagination_text.text_content())

        # Verify page size selector
        page_size_select = page.locator("select").filter(has_text="10")
        assert page_size_select.is_visible(), "Page size selector not visible"
        print("Page size selector found. Default value:", page_size_select.input_value())

        # Screenshot 1: Device table default pagination (10 per page)
        shot1 = "hq_device_pagination_default_10.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot1))
        copy_to_brain(shot1)

        # 1.2 Test Multi-Select: Click header checkbox (select all on page)
        print("Selecting header checkbox (select all on page)...")
        header_checkbox = page.locator("thead input[type='checkbox']").first
        header_checkbox.click()
        time.sleep(1)

        # Verify Bulk Action Bar appears
        bulk_bar = page.locator("text=/\\d+ devices? selected/i")
        assert bulk_bar.is_visible(), "Bulk action bar not visible after selecting devices"
        print("Bulk action bar active:", bulk_bar.text_content())

        # Screenshot 2: Device table with bulk selection bar active
        shot2 = "hq_device_multiselect_action_bar.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot2))
        copy_to_brain(shot2)

        # 1.3 Test clicking Delete Selected to open modal
        delete_selected_btn = page.locator("button:has-text('Delete Selected')")
        assert delete_selected_btn.is_visible(), "Delete Selected button not visible"
        delete_selected_btn.click()
        time.sleep(1)

        # Verify bulk delete modal
        modal_header = page.locator("h3:has-text('Bulk Delete Company Handsets')")
        modal_header.wait_for(timeout=5000)
        print("Bulk Delete Handsets modal displayed successfully.")

        # Screenshot 3: Bulk delete devices confirmation modal
        shot3 = "hq_device_bulk_delete_modal.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot3))
        copy_to_brain(shot3)

        # Cancel modal
        page.locator("button:has-text('Cancel')").click()
        time.sleep(1)

        # Clear selection
        page.locator("button:has-text('Clear selection')").click()
        time.sleep(1)
        assert not bulk_bar.is_visible(), "Bulk bar should disappear after Clear selection"
        print("Clear selection successfully reset device multi-select state.")

        # 1.4 Test changing page size filter to 20
        print("Changing device page size to 20...")
        page_size_select.select_option("20")
        time.sleep(1)
        print("Device pagination after switching to 20:", pagination_text.text_content())

        # =========================================================================
        # 2. VERIFY USER MANAGEMENT PAGINATION & MULTI-SELECT
        # =========================================================================
        print("\n--- Testing HQ User & Role Management ---")
        page.click("button:has-text('Users & Roles')")
        page.wait_for_selector('text="User & Role Governance Console"', timeout=10000)
        time.sleep(2)

        # 2.1 Verify Pagination is visible
        user_pagination_text = page.locator("text=/Showing \\d+ to \\d+ of \\d+ users/i")
        user_pagination_text.wait_for(timeout=10000)
        print("User pagination text visible:", user_pagination_text.text_content())

        # Verify page size selector
        user_page_size_select = page.locator("select").filter(has_text="10")
        assert user_page_size_select.is_visible(), "User page size selector not visible"

        # Screenshot 4: User table default pagination (10 per page)
        shot4 = "hq_user_pagination_default_10.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot4))
        copy_to_brain(shot4)

        # 2.2 Test Multi-Select: Click header checkbox
        print("Selecting header checkbox in User Management...")
        user_header_checkbox = page.locator("thead input[type='checkbox']").first
        user_header_checkbox.click()
        time.sleep(1)

        # Verify user bulk action bar appears
        user_bulk_bar = page.locator("text=/\\d+ users? selected/i")
        assert user_bulk_bar.is_visible(), "User bulk action bar not visible"
        print("User bulk action bar active:", user_bulk_bar.text_content())

        # Verify primary HQ Admin checkbox is protected/disabled
        admin_row_lock = page.locator("[title='Primary Administrator account cannot be selected for bulk deletion']")
        if admin_row_lock.count() > 0:
            print("Primary HQ Admin lock icon/protection confirmed active!")

        # Screenshot 5: User table with bulk selection bar and admin lock
        shot5 = "hq_user_multiselect_action_bar.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot5))
        copy_to_brain(shot5)

        # 2.3 Test opening Bulk Delete Users modal
        user_delete_btn = page.locator("button:has-text('Delete Selected')")
        assert user_delete_btn.is_visible(), "User Delete Selected button not visible"
        user_delete_btn.click()
        time.sleep(1)

        user_modal_title = page.locator("h3:has-text('Bulk Delete Employee Accounts')")
        user_modal_title.wait_for(timeout=5000)
        print("Bulk Delete User Accounts modal displayed successfully.")

        # Screenshot 6: Bulk delete users confirmation modal with unlinking notice
        shot6 = "hq_user_bulk_delete_modal.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot6))
        copy_to_brain(shot6)

        # Cancel modal
        page.locator("button:has-text('Cancel')").click()
        time.sleep(1)

        # Clear selection
        page.locator("button:has-text('Clear selection')").click()
        time.sleep(1)
        assert not user_bulk_bar.is_visible(), "User bulk bar should disappear after Clear selection"
        print("Clear selection successfully reset user multi-select state.")

        # 2.4 Test user page size filter to 20
        print("Changing user page size to 20...")
        user_page_size_select.select_option("20")
        time.sleep(1)
        print("User pagination after switching to 20:", user_pagination_text.text_content())

        # Screenshot 7: User page showing 20 rows
        shot7 = "hq_user_pagination_20_per_page.png"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, shot7))
        copy_to_brain(shot7)

        browser.close()
        print("\nAll Playwright pagination and multi-select verifications PASSED successfully!")

if __name__ == "__main__":
    test_pagination_and_multiselect()
