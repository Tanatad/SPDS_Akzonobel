import type { NextConfig } from "next";
 
const nextConfig: NextConfig = {
  /* config options here */
 
  // ✅ 1. เพิ่มส่วนนี้กลับเข้าไป เพื่ออนุญาตให้โดเมนของ Cloudflare เข้าถึง Next.js ได้
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.trycloudflare.com', // สำหรับกรณีรัน Quick Tunnel (แบบสุ่ม)
        'app.yourdomain.com',  // ⚠️ เปลี่ยนตรงนี้เป็น "โดเมนจริง" ของคุณ (ถ้ามี)
      ],
    },
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