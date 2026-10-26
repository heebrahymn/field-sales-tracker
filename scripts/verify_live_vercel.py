import sys
import os
import time
from playwright.sync_api import sync_playwright

LIVE_URL = "https://field-sales-tracker-b6l7.vercel.app/"
SCREENSHOT_DIR = r"C:\Users\HQ Administrator\.gemini\antigravity-ide\brain\8b9fad0a-b1b7-4393-8c3b-5454f954b105\screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def verify_live():
    print(f"\n=======================================================")
    print(f"VERIFYING LIVE VERCEL DEPLOYMENT: {LIVE_URL}")
    print(f"=======================================================\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
        page = context.new_page()
        
        errors = []
        logs = []
        page.on("console", lambda msg: logs.append(msg.text))
        page.on("pageerror", lambda err: errors.append(str(err)))
        
        print("1. Loading Live Site...")
        response = page.goto(LIVE_URL, wait_until="networkidle")
        print(f"   HTTP Status: {response.status}")
        assert response.status == 200, f"Expected HTTP 200, got {response.status}"
        page.wait_for_timeout(1000)
        
        # Check title and meta
        title = page.title()
        print(f"   Document Title: {title}")
        assert "Carbon Field Sales Tracker" in title
        
        # 1. Verify Sync Queue Action
        print("\n2. Verifying Persistent Sync Queue Action...")
        sync_badge = page.locator("#btn-sync-queue-badge")
        assert sync_badge.count() > 0, "Sync badge button #btn-sync-queue-badge not found!"
        print(f"   Sync Badge found with tag: {sync_badge.evaluate('el => el.tagName')}")
        print(f"   Aria label: {sync_badge.get_attribute('aria-label')}")
        
        # Click sync badge to navigate
        sync_badge.click()
        page.wait_for_timeout(500)
        heading = page.locator("text=Offline Queue & Sync")
        assert heading.count() > 0, "Failed to navigate to Offline Queue & Sync via badge click!"
        print("   PASS: Clicking sync badge navigated to Offline Queue & Sync")
        
        # 2. Return to Visit tab
        print("\n3. Navigating to Visit Workflow...")
        page.click("button:has-text('Visit')")
        page.wait_for_timeout(500)
        
        # Verify Active Visit view
        active_heading = page.locator("text=Visit Session In Progress")
        assert active_heading.count() > 0, "Expected active visit session"
        print("   PASS: Active visit session in progress")
        
        # 3. Verify Silent Cancel Button is Removed & Replaced with Report Disruption
        cancel_btn = page.locator("#btn-cancel-active-visit")
        assert cancel_btn.count() == 0, "Silent cancel visit button #btn-cancel-active-visit should NOT exist!"
        disruption_btn = page.locator("#btn-report-visit-disruption")
        assert disruption_btn.count() > 0, "Report Disruption button #btn-report-visit-disruption not found!"
        print("   PASS: Silent cancel is absent; Report Disruption button is present")
        
        # 4. Verify Sticky CTA Footer
        sticky_cta = page.locator("#sticky-visit-workflow-cta")
        assert sticky_cta.count() > 0, "Sticky CTA footer #sticky-visit-workflow-cta not found!"
        sticky_checkout = page.locator("#sticky-btn-checkout")
        assert sticky_checkout.count() > 0, "Sticky checkout button #sticky-btn-checkout not found!"
        print("   PASS: Sticky mobile visit footer is live and visible")
        
        # 5. Verify Outside Geofence Warning Modal with Explicit Actions
        print("\n4. Triggering Outside-Geofence Checkout Warning...")
        # Switch simulator to Outside (340m)
        page.click("button:has-text('Outside (340m)')")
        page.wait_for_timeout(300)
        
        # Click checkout
        sticky_checkout.click()
        page.wait_for_timeout(500)
        
        modal_title = page.locator("#outside-geofence-modal-title")
        assert modal_title.count() > 0, "Outside-geofence modal not opened!"
        ack_btn = page.locator("#btn-outside-geofence-acknowledge")
        cancel_outside_btn = page.locator("#btn-outside-geofence-cancel")
        assert ack_btn.count() > 0, "Acknowledge button #btn-outside-geofence-acknowledge not found!"
        assert cancel_outside_btn.count() > 0, "Cancel outside button #btn-outside-geofence-cancel not found!"
        print(f"   Acknowledge text: {ack_btn.inner_text()}")
        print(f"   Cancel text: {cancel_outside_btn.inner_text()}")
        print("   PASS: Outside-geofence modal has explicit Acknowledge & Continue and Cancel actions")
        
        # Cancel modal to keep visit active
        cancel_outside_btn.click()
        page.wait_for_timeout(300)
        assert page.locator("#outside-geofence-modal-title").count() == 0, "Modal should be closed"
        assert page.locator("text=Visit Session In Progress").count() > 0, "Visit must remain active!"
        print("   PASS: Cancel keeps visit active")
        
        # 6. Verify Demo / Simulation Labels
        print("\n5. Verifying Demo Labels & Safety...")
        demo_pill = page.locator("text=Stage 1A Demo")
        assert demo_pill.count() > 0, "Stage 1A Demo pill must be present"
        print(f"   PASS: Found demo indicator: {demo_pill.inner_text()}")
        
        mock_indicator = page.locator("text=GPS & Geofence Simulator (Test Controls)")
        assert mock_indicator.count() > 0, "GPS simulator test controls must be present"
        print("   PASS: Simulated telemetry test controls remain visible")
        
        # 7. Check for Javascript runtime errors
        assert len(errors) == 0, f"JS errors detected on live site: {errors}"
        print(f"   PASS: Zero runtime JavaScript errors on live Vercel site!")
        
        # Take verification screenshot
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "live_vercel_verification.png"))
        print(f"   Screenshot captured: live_vercel_verification.png")
        
        browser.close()
        print("\n=======================================================")
        print("ALL LIVE VERCEL VERIFICATIONS PASSED SUCCESSFULLY!")
        print("=======================================================\n")

if __name__ == "__main__":
    verify_live()
