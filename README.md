# Làng Trăng Máu

Game ma sói nhiều người chơi (16 người, 1 server duy nhất), không cần thư viện ngoài.

## Chạy

```bash
npm start
```

Mở `http://localhost:3000`. Server đọc cổng từ biến môi trường `PORT`.

Đội hình: 11 Dân · 3 Sói · 1 Trung lập · 1 Solo. Thiếu người thì máy tự lấp chỗ trống.

## Deploy

Cần hosting chạy tiến trình Node liên tục với đúng 1 instance (Render, Railway, Fly.io). Start command: `npm start`.

## Kiểm thử

```bash
SIM=1 node server.js
```
