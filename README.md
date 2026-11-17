# Làng Trăng Máu

Game ma sói tối đa 16 người với 39 vai trò. Chủ phòng chọn vai trò trong phòng chờ trước khi bắt đầu; mặc định là 11 Dân · 3 Sói · 1 Trung lập · 1 Solo. Không cần thư viện ngoài.

## Chơi ngay trên GitHub (không cần tải về)

**Chơi đơn với máy — GitHub Pages.** Bật Pages cho repo (Settings → Pages → Deploy from a branch → chọn nhánh chứa code, thư mục `/root`), rồi mở đường link Pages. Luật game chạy ngay trong trình duyệt, không cần server.

**Chơi nhiều người — GitHub Codespaces.** Bấm Code → Codespaces → Create codespace. Server tự khởi động ở cổng 3000. Để người khác vào được, mở tab Ports, đổi Visibility của cổng 3000 sang Public rồi gửi link.

## Chạy trên máy hoặc hosting

```bash
npm start
```

Mở `http://localhost:3000`. Server đọc cổng từ biến `PORT`. Hosting cần chạy tiến trình Node liên tục với đúng 1 instance (Render, Railway, Fly.io).

## Cấu trúc

- `game.js` — bộ luật game, dùng chung cho server và trình duyệt
- `server.js` — server nhiều người chơi
- `index.html` — giao diện; tự chuyển sang chơi đơn khi không có server

## Kiểm thử

```bash
SIM=1 node server.js
```
