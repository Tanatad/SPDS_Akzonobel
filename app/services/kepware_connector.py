import asyncio
from asyncua import Client

KEPWARE_ENDPOINT = "opc.tcp://192.168.0.200:49320"

# --- Helper Function อ่าน Tag ---
async def _read_tags(client, tags_map):
    result = {}
    for db_field, item_id in tags_map.items():
        try:
            node_id = f"ns=2;s={item_id}"
            var = client.get_node(node_id)
            val = await var.read_value()
            result[db_field] = float(val)
        except Exception as e:
            # print(f"Kepware Warning: อ่าน Tag {item_id} ไม่ได้")
            result[db_field] = 0.0
    return result

# --- 1. ฟังก์ชันอ่านเฉพาะ EXTRUDER ---
async def read_extruder_only(line_no: int):
    print(f"Kepware: ⚡ กำลังดึงค่า Actual + Setting -> Extruder {line_no}")
    
    ext_tags = {}
    
    # ---------------------------------------------------------
    # 1. กำหนด Prefix (หัวข้อ Tag)
    # ---------------------------------------------------------
    if line_no == 3:
        # กรณีพิเศษ: Extruder 3 (Tag ยาวกว่าปกติ)
        prefix = "Extruder_3.Device1.ServerInterfaces.Akzo_Performance_Portal.OPC_UA_Comms"
    else:
        # กรณีปกติ: Extruder อื่นๆ
        prefix = f"Extruder_{line_no}.Device"

    # ---------------------------------------------------------
    # 2. เตรียม Tag List (Actual + Setting + Water)
    # ---------------------------------------------------------
    ext_tags = {
        # --- A. ACTUAL VALUES (ค่าจริง) ---
        "actual_screw_rpm": f"{prefix}.Extruder Actual Speed (RPM)",
        "actual_torque_pct": f"{prefix}.Extruder Torque PCT",
        "actual_side_feed_pct": f"{prefix}.Feeder Actual Speed PCT",
        
        "actual_ht1": f"{prefix}.Zone 1 Actual Temperature",
        "actual_ht2": f"{prefix}.Zone 2 Actual Temperature",
        "actual_ht3": f"{prefix}.Zone 3 Actual Temperature",
        "actual_ht4": f"{prefix}.Zone 4 Actual Temperature",
        "actual_ht5": f"{prefix}.Zone 5 Actual Temperature",

        # --- B. SETTING VALUES (ค่ามาตรฐาน) (ข้อ 8) ---
        # ⚠️ สำคัญ: กรุณาเช็คชื่อ Tag ใน Kepware ว่าลงท้ายด้วยอะไร (เช่น .SetPoint, .SP, .Setting)
        # ตัวอย่างนี้ผมสมมติว่าเป็น .SetPoint ครับ
        "std_screw_rpm": f"{prefix}.Setpoint - Extruder", 
        "std_side_feed_pct": f"{prefix}.Setpoint - Feeder",
        
        "std_ht1": f"{prefix}.Setpoint - Zone 1 Temperature",
        "std_ht2": f"{prefix}.Setpoint - Zone 2 Temperature",
        "std_ht3": f"{prefix}.Setpoint - Zone 3 Temperature",
        "std_ht4": f"{prefix}.Setpoint - Zone 4 Temperature",
        "std_ht5": f"{prefix}.Setpoint - Zone 5 Temperature",

        # --- C. WATER SYSTEM (ข้อ 6) ---
        # Barrel Water Temp (ดึงจาก BCU Customer C/F)
        "barrel_water_temp": f"{prefix}.BCU Customer Temperature C/F", 
    }

    # --- D. WATER FLOW (ข้อ 5: เฉพาะเครื่อง 1, 3, 7, 11) ---
    if line_no in [1, 3, 7, 11]:
        ext_tags["barrel_water_flow"] = f"{prefix}.BCU Customer Flow"

    # ---------------------------------------------------------
    # 3. เริ่มอ่านค่า
    # ---------------------------------------------------------
    try:
        async with Client(url=KEPWARE_ENDPOINT) as client:
            data = await _read_tags(client, ext_tags)
            # print(f"Kepware: ✅ Data Ext {line_no} -> {data}") # ปิดไว้ถ้ารกหน้าจอ
            return data
    except Exception as e:
        print(f"Kepware Error (Ext {line_no}): {e}")
        # Return ค่า 0.0 ทั้งหมดกันโปรแกรมพัง
        return {k: 0.0 for k in ext_tags.keys()}

# --- 2. ฟังก์ชันอ่านเฉพาะ MILL ---
async def read_mill_only(mill_line: str):
    print(f"Kepware: ⚡ กำลังดึงค่า Actual -> Mill {mill_line} เท่านั้น")
    
    try:
        m_line = int(mill_line)
    except:
        print("Kepware: ⚠️ ไม่พบข้อมูล Mill Line")
        return {}

    mill_tags = {}
    
    # --- Group B: Mill 9, 13, 14 ---
    if m_line in [9, 13, 14]:
        prefix = f"Mill_{m_line}.Device"
        mill_tags = {
            "actual_mill_sep": f"{prefix}.SEPARATOR",
            "actual_mill_rotor": f"{prefix}.ROTOR",
            "actual_mill_dosing": f"{prefix}.FEEDER",
            "actual_mill_air_flow": f"{prefix}.AIRFLOW",
            # Temp In/Out แบบตรงตัว
            "actual_mill_temp_in": f"{prefix}.TEMP_IN",
            "actual_mill_temp_out": f"{prefix}.TEMP_OUT",
        }
        
    # --- Group A: Mill 2, 3, 4, 10, 12 ---
    elif m_line in [2, 3, 4, 10, 12]:
        prefix = f"Mill_{m_line}.Device"
        mill_tags = {
            "actual_mill_sep": f"{prefix}.CLASSIFIER_SPEED",
            "actual_mill_rotor": f"{prefix}.MAIN_SPEED",
            "actual_mill_dosing": f"{prefix}.FEED_A_SPEED",
            "actual_mill_air_flow": f"{prefix}.FT_AIR_1",
            # Temp In/Out แบบชื่อเฉพาะ (new-t2, new-t3)
            "actual_mill_temp_in": f"{prefix}.new-t2",
            "actual_mill_temp_out": f"{prefix}.new-t3",
        }
    
    if not mill_tags:
        return {}

    try:
        async with Client(url=KEPWARE_ENDPOINT) as client:
            data = await _read_tags(client, mill_tags)
            print(f"Kepware: ✅ Mill Data -> {data}")
            return data
    except Exception as e:
        print(f"Kepware Error: {e}")
        return {k: 0.0 for k in mill_tags.keys()}