import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // ✅ 1. เพิ่มส่วนนี้เพื่ออนุญาตโดเมน และปลดล็อกขนาดไฟล์ 50MB สำหรับ Middleware/Proxy
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.trycloudflare.com', // สำหรับกรณีรัน Quick Tunnel (แบบสุ่ม)
        'app.yourdomain.com',  // ⚠️ เปลี่ยนตรงนี้เป็น "โดเมนจริง" ของคุณ (ถ้ามี)
      ],
      bodySizeLimit: '50mb', // 🔥 ปลดล็อกขนาดไฟล์สำหรับ Server Actions
    },
    // 🔥 ปลดล็อกลิมิต 10MB สำหรับการวิ่งผ่าน Proxy (Rewrites)
    // (ใส่เป็นตัวเลข byte หรือ string '50mb' ก็ได้ ขึ้นอยู่กับเวอร์ชัน)
    middlewareClientMaxBodySize: 50 * 1024 * 1024, 
  },

  // 🔥 สำหรับ Next.js 14+ (ที่นำ serverActions ออกจาก experimental แล้ว)
  serverActions: {
    bodySizeLimit: '50mb',
  },

  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  } as any,

  // ✅ 2. ส่วน headers แก้เรื่อง Cross Origin แบบ Manual (ของเดิม)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" }, 
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },

  // ✅ 3. ส่วน Proxy เดิม (ห้ามลบเด็ดขาด ไม่งั้นคุยกับ Backend ไม่ได้)
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',      
        destination: 'http://127.0.0.1:8000/api/v1/:path*'
      }
    ]
  }
};

export default nextConfig;