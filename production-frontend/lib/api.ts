import axios from 'axios';

const api = axios.create({
    // ❌ ลบอันเก่าที่เขียนว่า 'http://localhost:8000/api/v1' หรือ 'http://127.0.0.1:8000/api/v1'
    
    // ✅ ใช้อันนี้แทน (ไม่ต้องมี http... ข้างหน้า)
    baseURL: '/api/v1', 
    
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;