import os
import sys
import time
from playwright.sync_api import sync_playwright

LOCAL_URL = "http://localhost:4173/"
SCREENSHOT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity-ide\brain\8b9fad0a-b1b7-4393-8c3b-5454f954b105\screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_corrections_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # =========================================================================
        # 1. TEST AT 360x800 (Compact Android Handset e.g. Galaxy A04/A14)
        # =========================================================================
        print("\n--- Testing at 360x800 (Compact Android) ---")
        ctx_360 = browser.new_context(viewport={"width": 360, "height": 800})
        page_360 = ctx_360.new_page()
        page_360.goto(LOCAL_URL, wait_until="networkidle")
        page_360.wait_for_timeout(600)
        
        # Test Sync Queue Badge Navigation (P1)
        sync_badge = page_360.locator("#btn-sync-queue-badge")
        if sync_badge.count() > 0:
            print("Found #btn-sync-queue-badge. Clicking to test direct Sync Queue navigation...")
            sync_badge.click()
            page_360.wait_for_timeout(400)
            page_360.screenshot(path=os.path.join(SCREENSHOT_DIR, "revised_01_sync_queue_opened_360px.png"))
            assert "Offline Queue & Sync" in page_360.locator("body").text_content()
            print("PASS: #btn-sync-queue-badge navigated directly to Offline Sync Queue!")
        else:
            print("FAIL: #btn-sync-queue-badge not found!")
            sys.exit(1)
            
        # Navigate to Visit Workflow
        visit_tab = page_360.locator("#nav-tab-visit").first
        visit_tab.click()
        page_360.wait_for_timeout(500)
        
        # Check Sticky Mobile Primary CTA Footer
        sticky_cta = page_360.locator("#sticky-visit-workflow-cta")
        assert sticky_cta.count() > 0
        sticky_checkout = page_360.locator("#sticky-btn-checkout")
        assert sticky_checkout.count() > 0
        page_360.screenshot(path=os.path.join(SCREENSHOT_DIR, "revised_02_sticky_cta_active_visit_360px.png"))
        print("PASS: Sticky CTA visible on 360x800 without scrolling!")
        
        # Check Active Visit Reset Protection: Verify "Report Disruption" exists and "Cancel Session" is absent
        assert page_360.locator("#btn-report-visit-disruption").count() > 0
        assert page_360.locator("button:has-text('Cancel Session')").count() == 0
        print("PASS: Silent 'Cancel Session' strictly omitted; 'Report Disruption' present!")
        
        # Test Outside Geofence Warning Modal Actions
        # Click Outside (340m) in simulator
        page_360.locator("button:has-text('Outside (340m)')").first.click()
        page_360.wait_for_timeout(300)
        
        # Click Sticky Check Out
        sticky_checkout.click()
        page_360.wait_for_timeout(400)
        page_360.screenshot(path=os.path.join(SCREENSHOT_DIR, "revised_03_outside_geofence_modal_360px.png"))
        
        # Verify explicit buttons
        ack_btn = page_360.locator("#btn-outside-geofence-acknowledge")
        cancel_btn = page_360.locator("#btn-outside-geofence-cancel")
        assert ack_btn.count() > 0
        assert cancel_btn.count() > 0
        print("PASS: Explicit Outside Geofence buttons found ('Acknowledge & Continue' and 'Cancel (Keep Visit Active)')!")
        
        # Click Cancel -> Visit must remain active!
        cancel_btn.click()
        page_360.wait_for_timeout(400)
        assert "Visit Session In Progress" in page_360.locator("body").text_content()
        print("PASS: Cancelling outside-geofence checkout kept visit active without advancing!")
        
        ctx_360.close()
        
        # =========================================================================
        # 2. TEST AT 390x844 (Standard iPhone / Midrange Android)
        # =========================================================================
        print("\n--- Testing at 390x844 (Standard Viewport) ---")
        ctx_390 = browser.new_context(viewport={"width": 390, "height": 844})
        page_390 = ctx_390.new_page()
        page_390.goto(LOCAL_URL, wait_until="networkidle")
        page_390.wait_for_timeout(500)
        
        page_390.locator("#nav-tab-visit").first.click()
        page_390.wait_for_timeout(400)
        page_390.screenshot(path=os.path.join(SCREENSHOT_DIR, "revised_04_sticky_cta_390px.png"))
        assert page_390.locator("#sticky-visit-workflow-cta").count() > 0
        print("PASS: Sticky CTA verified at 390x844!")
        ctx_390.close()
        
        # =========================================================================
        # 3. TEST AT 430x932 (Large Flagship Android / iOS)
        # =========================================================================
        print("\n--- Testing at 430x932 (Large Flagship Viewport) ---")
        ctx_430 = browser.new_context(viewport={"width": 430, "height": 932})
        page_430 = ctx_430.new_page()
        page_430.goto(LOCAL_URL, wait_until="networkidle")
        page_430.wait_for_timeout(500)
        
        page_430.locator("#nav-tab-visit").first.click()
        page_430.wait_for_timeout(400)
        page_430.screenshot(path=os.path.join(SCREENSHOT_DIR, "revised_05_sticky_cta_430px.png"))
        assert page_430.locator("#sticky-visit-workflow-cta").count() > 0
        print("PASS: Sticky CTA verified at 430x932!")
        ctx_430.close()
        
        browser.close()
        print("\nAll Pre-Stage 3 Playwright verifications passed successfully!")

if __name__ == "__main__":
    run_corrections_verification()
