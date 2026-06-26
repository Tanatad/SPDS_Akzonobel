import streamlit as st
import requests
import pandas as pd
from datetime import datetime
import time

# URL Backend
API_URL = "http://127.0.0.1:8000/api/v1"

# --- 1. CONFIG & MODERN CSS ---
st.set_page_config(page_title="Production Logger", layout="wide", page_icon="🏭", initial_sidebar_state="collapsed")

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; color: #1e293b; }
    .stApp { background-color: #f1f5f9; }
    
    /* Hide Header/Footer */
    header[data-testid="stHeader"], footer, .stDeployButton { display: none; }
    #MainMenu { visibility: hidden; }

    /* Custom Tabs Navigation */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px; background-color: #ffffff; padding: 10px 20px;
        border-radius: 100px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        margin-bottom: 25px; width: fit-content; margin-left: auto; margin-right: auto;
    }
    .stTabs [data-baseweb="tab"] {
        height: 40px; border-radius: 50px; border: none;
        color: #64748b; font-weight: 600; padding: 0 24px;
    }
    .stTabs [aria-selected="true"] {
        background-color: #004B8D; color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 75, 141, 0.4);
    }
    .stTabs [data-baseweb="tab-border"] { display: none; }

    /* Metric Card */
    .metric-container {
        background-color: white; border: 1px solid #e2e8f0; border-radius: 12px;
        padding: 16px; text-align: center; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
    }
    .metric-container:hover { transform: translateY(-2px); border-color: #cbd5e1; }
    .metric-label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
    .metric-unit { font-size: 0.8rem; color: #94a3b8; margin-left: 2px; }

    /* Inputs & Buttons */
    .stTextInput input, .stSelectbox div[data-baseweb="select"] {
        border-radius: 8px; border: 1px solid #cbd5e1; padding: 8px;
    }
    div.stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #004B8D 0%, #003666 100%);
        border: none; height: 45px; border-radius: 8px; font-weight: 600;
        box-shadow: 0 4px 6px -1px rgba(0, 75, 141, 0.3); transition: all 0.2s;
    }
    div.stButton > button[kind="primary"]:hover { transform: scale(1.02); }
    
    /* Login Box */
    .login-box {
        max-width: 400px; margin: auto; padding: 30px; background: white;
        border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center;
    }

    /* Force Table Full Width */
    [data-testid="stDataFrame"] { width: 100%; }
    [data-testid="stDataFrame"] > div { width: 100%; }
</style>
""", unsafe_allow_html=True)

# --- 2. AUTHENTICATION (Database Version) ---
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.username = ""
    st.session_state.role = ""

# --- LOGIN / REGISTER PAGE ---
if not st.session_state.logged_in:
    c1, c2, c3 = st.columns([1, 1, 1])
    with c2:
        st.markdown("<br><br>", unsafe_allow_html=True)
        # Logo & Header
        st.markdown("""<div class="login-box"><h3 style="color:#004B8D;">Production Logger</h3></div>""", unsafe_allow_html=True)
        
        # Tabs: Login vs Register
        auth_tab1, auth_tab2 = st.tabs(["🔐 Sign In", "📝 Sign Up"])
        
        # --- LOGIN TAB ---
        with auth_tab1:
            l_user = st.text_input("Username", key="l_user")
            l_pass = st.text_input("Password", type="password", key="l_pass")
            
            if st.button("Login", type="primary", use_container_width=True):
                if not l_user or not l_pass:
                    st.warning("Please fill in all fields")
                else:
                    try:
                        # Call API Login
                        res = requests.post(f"{API_URL}/auth/login", json={"username": l_user, "password": l_pass})
                        if res.status_code == 200:
                            data = res.json()
                            st.session_state.logged_in = True
                            st.session_state.username = data['username']
                            st.session_state.role = data['role']
                            st.rerun()
                        else:
                            st.error(res.json()['detail'])
                    except Exception as e:
                        st.error(f"Server Connection Error: {e}")

        # --- REGISTER TAB ---
        with auth_tab2:
            st.info("Create a new account (Company Code required)")
            
            # กำหนด default ให้ session state ถ้ายังไม่มี (เพื่อกัน Error ตอนสั่งล้างค่า)
            if "r_user" not in st.session_state: st.session_state.r_user = ""
            if "r_pass" not in st.session_state: st.session_state.r_pass = ""
            if "r_confirm" not in st.session_state: st.session_state.r_confirm = ""
            if "r_code" not in st.session_state: st.session_state.r_code = ""

            # ผูกตัวแปรกับ key ใน session state
            r_user = st.text_input("New Username", key="r_user")
            r_pass = st.text_input("New Password", type="password", key="r_pass")
            r_confirm = st.text_input("Confirm Password", type="password", key="r_confirm")
            r_code = st.text_input("Company Invite Code", type="password", key="r_code", placeholder="Ask your manager...")
            
            if st.button("Create Account", use_container_width=True):
                if not r_user or not r_pass or not r_code:
                    st.warning("Please fill in all fields")
                elif r_pass != r_confirm:
                    st.error("Passwords do not match!")
                else:
                    try:
                        payload = {
                            "username": r_user, 
                            "password": r_pass, 
                            "invite_code": r_code
                        }
                        res = requests.post(f"{API_URL}/auth/register", json=payload)
                        
                        if res.status_code == 201:
                            st.success("🎉 Account created! Please Login.")
                            
                            # ✅ เพิ่ม 4 บรรทัดนี้: ล้างค่าในช่องกรอกให้เกลี้ยง
                            st.session_state.r_user = ""
                            st.session_state.r_pass = ""
                            st.session_state.r_confirm = ""
                            st.session_state.r_code = ""
                            
                            time.sleep(1.5)
                            st.rerun()
                        elif res.status_code == 403:
                            st.error("❌ Wrong Invite Code! Please contact Manager.")
                        else:
                            st.error(res.json()['detail'])
                    except Exception as e:
                        st.error(f"Server Connection Error: {e}")

    st.stop() # หยุดการทำงานจนกว่าจะ Login

# --- MAIN APP (User Logged In) ---
col_head1, col_head2 = st.columns([10, 1])
with col_head1: 
    st.markdown(f"#### 🏭 **Production Logger** <span style='color:#94a3b8; font-size:14px;'>| {st.session_state.username} ({st.session_state.role})</span>", unsafe_allow_html=True)
with col_head2:
    if st.button("Logout"):
        st.session_state.logged_in = False
        st.session_state.username = ""
        st.rerun()
st.markdown("---")

# CONSTANTS
EXTRUDER_LIST = [1, 2, 3, 7, 8, 9, 11]
MILL_LIST = [2, 3, 4, 9, 10, 12, 13, 14]
DEFAULT_PAIRING = {1: 2, 2: 3, 3: 4, 7: 10, 8: 13, 9: 9, 11: 14}

# HELPERS
def display_card(title, value, unit=""):
    st.markdown(f"""<div class="metric-container"><div class="metric-label">{title}</div><div class="metric-value">{value}</div><div class="metric-unit">{unit}</div></div>""", unsafe_allow_html=True)

def fmt(val):
    try: return f"{float(val):.2f}" if val is not None else "0.00"
    except: return "0.00"

# CALLBACKS
def save_extruder_callback():
    payload = {"po_no": st.session_state.po_input, "product_code": st.session_state.code_input, 
               "extruder_line": st.session_state.ext_key, "mill_line": st.session_state.mill_key}
    try:
        res = requests.post(f"{API_URL}/process/extruder", json=payload)
        if res.status_code == 200:
            st.session_state.po_input = ""
            st.session_state.code_input = ""
            st.session_state.data_ready = False
            st.session_state.preview_data = {k:0 for k in st.session_state.preview_data}
            st.session_state.msg_toast = ("success", "🎉 Batch Started Successfully!")
        elif res.status_code == 400: st.session_state.msg_toast = ("error", f"❌ STOP! {res.json()['detail']}")
        else: st.session_state.msg_toast = ("error", f"Server Error: {res.text}")
    except Exception as e: st.session_state.msg_toast = ("error", f"Connection Failed: {e}")

if "msg_toast" in st.session_state:
    t, m = st.session_state.msg_toast
    st.toast(m, icon="✅" if t == "success" else "🚨")
    del st.session_state.msg_toast

# TABS
tab1, tab2, tab3 = st.tabs(["🔥 Extruder Station", "⚙️ Mill Station", "📊 History & Reports"])

# --- TAB 1: EXTRUDER ---
with tab1:
    c_in, c_dash = st.columns([1, 2], gap="large")
    with c_in:
        st.markdown("##### 📝 New Batch")
        with st.container(border=True):
            if "po_input" not in st.session_state: st.session_state.po_input = ""
            if "code_input" not in st.session_state: st.session_state.code_input = ""
            if "data_ready" not in st.session_state: st.session_state.data_ready = False
            if "preview_data" not in st.session_state:
                st.session_state.preview_data = {'actual_screw_rpm': 0, 'actual_torque_pct': 0, 'actual_side_feed_pct': 0, 'actual_ht1': 0, 'actual_ht2': 0, 'actual_ht3': 0, 'actual_ht4': 0, 'actual_ht5': 0}

            st.text_input("PO Number", key="po_input", placeholder="Scan Barcode...")
            st.text_input("Product Code", key="code_input", placeholder="Product Code...")
            
            c_sel1, c_sel2 = st.columns(2)
            with c_sel1:
                if "last_ext_line" not in st.session_state: st.session_state.last_ext_line = EXTRUDER_LIST[0]
                st.selectbox("Extruder", EXTRUDER_LIST, key="ext_key")
                if st.session_state.ext_key != st.session_state.last_ext_line:
                    new_ext = st.session_state.ext_key
                    if new_ext in DEFAULT_PAIRING and DEFAULT_PAIRING[new_ext] in MILL_LIST: st.session_state.mill_key = DEFAULT_PAIRING[new_ext]
                    st.session_state.last_ext_line = new_ext
            with c_sel2: st.selectbox("Mill Plan", MILL_LIST, key="mill_key")

            st.write("")
            if st.button("🔌 Connect Machine", type="secondary", use_container_width=True):
                if not st.session_state.po_input: st.toast("Please input PO Number", icon="⚠️")
                else:
                    with st.spinner("Connecting..."):
                        try:
                            res = requests.get(f"{API_URL}/preview/extruder/{st.session_state.ext_key}")
                            if res.status_code == 200:
                                st.session_state.preview_data = res.json()
                                st.session_state.data_ready = True
                                st.toast("Connected!", icon="✅")
                            else: st.error(res.text)
                        except Exception as e: st.error(str(e))

    with c_dash:
        st.markdown(f"##### 📊 Live Dashboard")
        data = st.session_state.preview_data
        r1c1, r1c2, r1c3, r1c4 = st.columns(4)
        with r1c1: display_card("Screw", fmt(data.get('actual_screw_rpm')), "RPM")
        with r1c2: display_card("Torque", fmt(data.get('actual_torque_pct')), "%")
        with r1c3: display_card("Side Feed", fmt(data.get('actual_side_feed_pct')), "%")
        with r1c4: display_card("HT1", fmt(data.get('actual_ht1')), "°C")
        st.write("")
        r2c1, r2c2, r2c3, r2c4 = st.columns(4)
        with r2c1: display_card("HT2", fmt(data.get('actual_ht2')), "°C")
        with r2c2: display_card("HT3", fmt(data.get('actual_ht3')), "°C")
        with r2c3: display_card("HT4", fmt(data.get('actual_ht4')), "°C")
        with r2c4: display_card("HT5", fmt(data.get('actual_ht5')), "°C")
        st.write("")
        if st.session_state.data_ready:
            b1, b2 = st.columns([1, 2])
            with b1:
                if st.button("🔄 Refresh", use_container_width=True):
                    res = requests.get(f"{API_URL}/preview/extruder/{st.session_state.ext_key}")
                    if res.status_code == 200:
                        st.session_state.preview_data = res.json()
                        st.toast("Refreshed", icon="🔄")
                        time.sleep(0.5)
                        st.rerun()
            with b2: st.button("💾 START BATCH", type="primary", use_container_width=True, on_click=save_extruder_callback)
        else: st.info("👈 Please input details and connect to machine.")

# --- TAB 2: MILL ---
with tab2:
    st.markdown("##### 🏭 Select Mill Machine")
    if "selected_mill" not in st.session_state: st.session_state.selected_mill = MILL_LIST[0]
    cols = st.columns(len(MILL_LIST))
    for i, m in enumerate(MILL_LIST):
        with cols[i]:
            if st.button(f"M{m}", key=f"btn_mill_{m}", type="primary" if st.session_state.selected_mill == m else "secondary", use_container_width=True):
                st.session_state.selected_mill = m
                st.rerun()
    curr_mill = st.session_state.selected_mill
    st.markdown("---")
    try:
        res = requests.get(f"{API_URL}/process/pending-mill")
        if res.status_code == 200:
            all_jobs = res.json()
            my_jobs = [j for j in all_jobs if j['planned_mill_line'] == curr_mill]
            if len(my_jobs) > 0:
                st.success(f"⚡ **{len(my_jobs)}** jobs pending for Mill {curr_mill}")
                for job in my_jobs:
                    with st.expander(f"📌 PO: {job['po_no']} | {job['product_code']}", expanded=True):
                        xc1, xc2 = st.columns([3, 1])
                        with xc1: st.caption(f"Waiting since: {job['timestamp_extruder']}")
                        with xc2:
                            if st.button("Select Job", key=f"sel_{job['log_id']}", use_container_width=True):
                                st.session_state.mill_job_id = job['log_id']
                                st.session_state.mill_job_data = job
                                st.session_state.mill_ready = False
                                st.session_state.mill_preview_data = {}

                if "mill_job_id" in st.session_state:
                    st.markdown("---")
                    job_data = st.session_state.mill_job_data
                    if "mill_ready" not in st.session_state: st.session_state.mill_ready = False
                    if "mill_preview_data" not in st.session_state: st.session_state.mill_preview_data = {}

                    st.markdown(f"#### ⚙️ Process: {job_data['po_no']}")
                    
                    if st.button("🔌 Read Live Data", type="secondary"):
                        with st.spinner("Reading..."):
                            try:
                                res_mill = requests.get(f"{API_URL}/preview/mill/{curr_mill}")
                                if res_mill.status_code == 200:
                                    st.session_state.mill_preview_data = res_mill.json()
                                    st.session_state.mill_ready = True
                                    st.toast("Connected!", icon="✅")
                                else: st.error(res_mill.text)
                            except Exception as e: st.error(str(e))
                    
                    if st.session_state.mill_ready:
                        lat = st.session_state.mill_preview_data
                        m1, m2, m3 = st.columns(3)
                        with m1: display_card("Rotor", fmt(lat.get('actual_mill_rotor')), "RPM")
                        with m2: display_card("Airflow", fmt(lat.get('actual_mill_air_flow')), "%")
                        with m3: display_card("Separator", fmt(lat.get('actual_mill_sep')), "RPM")
                        st.write("")
                        m4, m5, m6 = st.columns(3)
                        with m4: display_card("Dosing", fmt(lat.get('actual_mill_dosing')), "RPM")
                        with m5: display_card("Temp IN", fmt(lat.get('actual_mill_temp_in')), "°C")
                        with m6: display_card("Temp OUT", fmt(lat.get('actual_mill_temp_out')), "°C")
                        st.write("")
                        b1, b2 = st.columns([1, 2])
                        with b1:
                            if st.button("🔄 Refresh", key="mill_refresh", use_container_width=True):
                                with st.spinner("Refreshing..."):
                                    res_mill = requests.get(f"{API_URL}/preview/mill/{curr_mill}")
                                    if res_mill.status_code == 200:
                                        st.session_state.mill_preview_data = res_mill.json()
                                        st.toast("Refreshed", icon="🔄")
                                        time.sleep(0.5)
                                        st.rerun()
                        with b2:
                            if st.button("✅ FINISH JOB", type="primary", use_container_width=True):
                                payload = {"log_id": job_data['log_id'], "actual_mill_line": curr_mill}
                                try:
                                    res_save = requests.post(f"{API_URL}/process/mill", json=payload)
                                    if res_save.status_code == 200:
                                        st.balloons()
                                        del st.session_state.mill_job_id
                                        del st.session_state.mill_ready
                                        del st.session_state.mill_preview_data
                                        time.sleep(1)
                                        st.rerun()
                                    else: st.error(f"Save Failed: {res_save.text}")
                                except Exception as e: st.error(str(e))
            else: st.info(f"No active jobs for Mill {curr_mill}")
    except Exception as e: st.error(str(e))

# --- TAB 3: HISTORY ---
with tab3:
    st.markdown("##### 🔍 Search Database")
    with st.container(border=True):
        c1, c2, c3, c4 = st.columns(4)
        start_d = c1.date_input("From", datetime.now())
        end_d = c2.date_input("To", datetime.now())
        f_ext = c3.selectbox("Extruder", [0] + EXTRUDER_LIST, format_func=lambda x: "All Lines" if x == 0 else f"Line {x}")
        f_mill = c4.selectbox("Mill", [0] + MILL_LIST, format_func=lambda x: "All Lines" if x == 0 else f"Line {x}")
        
        c5, c6 = st.columns([3, 1])
        txt = c5.text_input("Search", placeholder="Search PO or Product Code...")
        with c6:
            st.write("")
            if st.button("SEARCH", type="primary", use_container_width=True):
                st.session_state.search_hist = True

    if st.session_state.get("search_hist"):
        params = {"start_date": start_d, "end_date": end_d, "search": txt, "extruder_line": f_ext, "mill_line": f_mill}
        try:
            res = requests.get(f"{API_URL}/history/view", params=params)
            if res.status_code == 200:
                df = pd.DataFrame(res.json())
                if not df.empty:
                    if 'created_at' in df.columns:
                        df['created_at'] = pd.to_datetime(df['created_at']).dt.strftime('%Y-%m-%d')
                    
                    float_cols = [c for c in df.columns if 'actual_' in c]
                    for c in float_cols: df[c] = df[c].apply(lambda x: f"{float(x):.2f}" if pd.notnull(x) else "-")
                    
                    desired_order = ["log_id", "created_at", "po_no", "product_code", "extruder_line", "actual_mill_line", "actual_screw_rpm", "actual_torque_pct", "actual_ht1", "actual_ht2", "actual_ht3", "actual_ht4", "actual_ht5", "actual_side_feed_pct", "actual_mill_rotor", "actual_mill_air_flow", "actual_mill_sep", "actual_mill_dosing", "actual_mill_temp_in", "actual_mill_temp_out"]
                    col_map = {"log_id": "ID", "created_at": "DATE", "po_no": "PO NO", "product_code": "PRODUCT", "extruder_line": "EXT", "actual_mill_line": "MILL", "actual_screw_rpm": "SCREW", "actual_torque_pct": "TORQUE", "actual_ht1": "HT1", "actual_ht2": "HT2", "actual_ht3": "HT3", "actual_ht4": "HT4", "actual_ht5": "HT5", "actual_side_feed_pct": "SIDE FEED", "actual_mill_rotor": "ROTOR", "actual_mill_air_flow": "AIR", "actual_mill_sep": "SEP", "actual_mill_dosing": "DOSING", "actual_mill_temp_in": "T-IN", "actual_mill_temp_out": "T-OUT"}

                    final_cols = [c for c in desired_order if c in df.columns]
                    disp_df = df[final_cols].rename(columns=col_map)
                    
                    st.dataframe(disp_df, hide_index=True)
                    
                    q_str = "&".join([f"{k}={v}" for k,v in params.items() if v])
                    st.link_button("📥 Download Excel", f"{API_URL}/history/export?{q_str}")
                    
                    with st.expander("🗑️ Admin: Delete Records"):
                        dc1, dc2 = st.columns([3, 1])
                        d_id = dc1.number_input("Log ID to delete", step=1, min_value=1)
                        if dc2.button("DELETE", type="primary", use_container_width=True):
                            requests.delete(f"{API_URL}/history/delete/{d_id}")
                            st.rerun()
                else: st.warning("No records found.")
        except Exception as e: st.error(f"Error: {e}")