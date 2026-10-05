import os
import glob
from playwright.sync_api import sync_playwright

os.makedirs("/home/jules/verification/videos", exist_ok=True)
os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

def run_cuj(page):
    # wait longer
    page.goto("http://localhost:3010/dashboard/extruder", wait_until="domcontentloaded", timeout=120000)
    page.wait_for_timeout(2000)

    # Click on the first machine card
    machine_card = page.locator("text=EXTRUDER").first
    if machine_card.is_visible():
        machine_card.click()
        page.wait_for_timeout(2000)
    else:
        print("Machine card not visible!")

    page.screenshot(path="/home/jules/verification/screenshots/verification_final_ui.png")
    page.wait_for_timeout(2000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()

    video_files = glob.glob("/home/jules/verification/videos/*.webm")
    if video_files:
        print(f"Video saved to: {video_files[-1]}")
