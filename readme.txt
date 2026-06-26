1. cd ..
2. cd production-frontend
3. npm run dev
4. python main.py
5. .\cloudflared.exe tunnel --url http://localhost:3000 
.\venv\Scripts\activate

หน้าต่าง 1 เริ่มจากรัน python main.py
หน้าต่าง 2 รัน cd production-frontend และต่อด้วย npm run dev
หน้าต่าง 3 รัน cd production-frontend และต่อด้วย .\cloudflared.exe tunnel --config config.yml run akzo-system