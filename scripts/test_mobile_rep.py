from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    c = b.new_context(viewport={'width': 412, 'height': 915})
    page = c.new_page()
    page.goto('http://localhost:5173/login')
    page.fill("input[name='email'], input[type='email']", 'tunde.adebayo@carboncarcare.com')
    page.fill("input[name='password'], input[type='password']", os.environ.get('DEV_USER_PASSWORD', ''))
    page.click("button:has-text('Sign In With Credentials')")
    page.wait_for_timeout(4000)
    print('Current URL:', page.url)
    print('Nav clients count:', page.locator('#nav-tab-clients').count())
    print('Nav clients visible:', page.locator('#nav-tab-clients').is_visible() if page.locator('#nav-tab-clients').count() > 0 else False)
    print('Buttons:', [page.locator('button').nth(i).inner_text().strip() for i in range(min(15, page.locator('button').count()))])
    b.close()
