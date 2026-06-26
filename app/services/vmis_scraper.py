from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import time
from app.config import settings

LOGIN_URL = "http://182.52.113.42:8080/ssa/index.php"
TARGET_URL = "http://182.52.113.42:8080/ssa/production/wip_new/index_condition.php"

# --- Helper Functions ---

def handle_possible_alert(driver):
    try:
        driver.switch_to.alert.accept()
        return True
    except: return False

def switch_to_line(driver, line_no):
    """กดปุ่ม Line และรอโหลด (ใช้ Driver เดิม)"""
    print(f"Scraper: ...กำลังเปลี่ยนไป Line {line_no}...")
    xpath_value = f"//input[@value='Line {line_no}']"
    
    driver.switch_to.default_content()
    frames = driver.find_elements(By.TAG_NAME, "frame") + driver.find_elements(By.TAG_NAME, "iframe")
    
    for i in range(len(frames)):
        try:
            driver.switch_to.default_content()
            driver.switch_to.frame(i)
            btns = driver.find_elements(By.XPATH, xpath_value)
            if btns:
                btns[0].click()
                time.sleep(3) # รอโหลดตารางใหม่ (ปรับเวลาได้ถ้าเน็ตช้า)
                return True
        except: continue
    
    print(f"Scraper: ⚠️ หาปุ่ม Line {line_no} ไม่เจอ")
    return False

def extract_data_from_current_page(driver):
    """ดูดข้อมูลจากหน้าปัจจุบัน (ไม่สนใจว่าอยู่ Line ไหน)"""
    extracted_list = []
    
    driver.switch_to.default_content()
    frames = driver.find_elements(By.TAG_NAME, "frame") + driver.find_elements(By.TAG_NAME, "iframe")
    target_frame = None

    # หาเฟรมตาราง
    for i in range(len(frames)):
        try:
            driver.switch_to.default_content()
            driver.switch_to.frame(i)
            # หาแถวที่มี input เยอะๆ
            if len(driver.find_elements(By.XPATH, "//tr[count(td)>10]")) > 0:
                target_frame = i
                break
        except: continue
    
    if target_frame is None: return []

    # เริ่มดูดข้อมูลในเฟรมนั้น
    all_rows = driver.find_elements(By.XPATH, "//tr")
    for row in all_rows:
        try:
            cols = row.find_elements(By.TAG_NAME, "td")
            if len(cols) < 20: continue

            # Helper ย่อยเพื่อดึงค่าในบรรทัด
            def get_val(idx):
                if idx >= len(cols): return None
                inputs = cols[idx].find_elements(By.TAG_NAME, "input")
                if inputs:
                    if inputs[0].get_attribute("type") == "checkbox" or idx in [11, 12]:
                        return "Y" if (inputs[0].is_selected() or inputs[0].get_attribute("checked")) else "N"
                    return inputs[0].get_attribute("value")
                selects = cols[idx].find_elements(By.TAG_NAME, "select")
                if selects: return selects[0].get_attribute("value")
                return cols[idx].text.strip()

            # เช็ค View = Y
            if get_val(11) != 'Y': continue
            
            batch_no = get_val(6)
            if not batch_no: continue

            def safe_int(val):
                try: return int(float(val.replace(",",""))) if val else 0
                except: return 0
            def safe_float(val):
                try: return float(val.replace(",","")) if val else 0.0
                except: return 0.0

            data = {
                "batch_no": batch_no,
                "extruder_line": get_val(1),
                "mixer_line": get_val(2),
                "mill_line": get_val(3),
                "mill_line_2": get_val(4),
                "status": get_val(5),
                "product_code": get_val(7),
                "plan_kg": safe_float(get_val(9)),
                "condition_used": get_val(10),
                "view_checked": True,
                "app_approved": (get_val(12) == 'Y'),
                
                "screw_type": get_val(13),
                "screw_rpm": safe_int(get_val(14)),
                "torque_pct": safe_int(get_val(15)),
                "ht1_setting": safe_int(get_val(16)),
                "ht2_setting": safe_int(get_val(17)),
                "ht3_setting": safe_int(get_val(18)),
                "ht4_setting": safe_int(get_val(19)),
                "ht5_setting": safe_int(get_val(20)),
                
                "mill_feed": safe_int(get_val(21)),
                "mill_dosing": safe_int(get_val(22)),
                "mill_rotor": safe_int(get_val(23)),
                "mill_sep": safe_int(get_val(24)),
                "mill_air_flow": safe_int(get_val(25)),
                "mill_sieve": safe_int(get_val(26)),
            }
            extracted_list.append(data)
        except: continue
        
    return extracted_list

# --- Main Function: กวาดทุกไลน์ (1-11) ---
def scrape_entire_factory():
    print(f"Scraper: 🚀 เริ่มภารกิจกวาดล้างโรงงาน (Line 1-11)...")
    options = webdriver.ChromeOptions()
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--headless")

    driver = webdriver.Chrome(options=options)
    all_factory_data = []

    try:
        # 1. Login ครั้งเดียว
        driver.get(LOGIN_URL)
        try:
            driver.find_element(By.XPATH, "//input[contains(@name, 'user') or contains(@id, 'user')]").send_keys(settings.VMIS_USERNAME)
            driver.find_element(By.XPATH, "//input[contains(@name, 'pass') or contains(@type, 'password')]").send_keys(settings.VMIS_PASSWORD)
            driver.find_element(By.XPATH, "//input[@type='submit'] | //button[@type='submit']").click()
            time.sleep(1)
            handle_possible_alert(driver)
        except: pass

        time.sleep(2)
        driver.get(TARGET_URL)
        handle_possible_alert(driver)
        
        # 2. วนลูปกดปุ่ม Line 1 ถึง 11
        for line_num in range(1, 12): # 1 ถึง 11
            success = switch_to_line(driver, line_num)
            if success:
                print(f"Scraper: >> กำลังดูดข้อมูล Line {line_num}...")
                line_data = extract_data_from_current_page(driver)
                print(f"Scraper:    Line {line_num} ได้มา {len(line_data)} Batch")
                all_factory_data.extend(line_data)
            else:
                print(f"Scraper: ⚠️ ข้าม Line {line_num} (กดปุ่มไม่ได้)")
                
    except Exception as e:
        print(f"Scraper Fatal Error: {e}")
    finally:
        driver.quit()
        
    print(f"Scraper: ✅ เสร็จสิ้นภารกิจ! รวมทั้งหมด {len(all_factory_data)} รายการ")
    return all_factory_data

# (คงฟังก์ชันเก่าไว้ใช้ค้นหาทีละอัน)
def scrape_vmis_recipe(batch_no, line_no):
    # ... (คุณสามารถใช้ Logic คล้ายๆ กันนี้ได้ แต่เพื่อความสั้น ผมละไว้ในคำตอบนี้)
    pass