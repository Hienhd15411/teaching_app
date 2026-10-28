# QC — Vocab Quest

Hai phần:

1. **QC tự động** — một lệnh, chạy trên máy dev hoặc trong phiên Claude Code. Dùng
   Firebase giả và micro giả, không đụng dữ liệu thật.
2. **QC thủ công** — những thứ chỉ kiểm tra được với Firebase thật, email thật,
   Google Calendar, micro và điện thoại thật. Làm theo bảng bên dưới, tick từng dòng.

---

## 1. QC tự động

```bash
# lần đầu trên máy mới
npm i -D playwright && npx playwright install chromium

# chạy toàn bộ (≈2 phút) — nên đặt giờ Việt Nam để bắt lỗi ngày/giờ
TZ=Asia/Ho_Chi_Minh node qc/run.js

# chỉ phần logic + dữ liệu (vài giây, không cần trình duyệt)
node qc/run.js --unit

# chỉ một kịch bản (tên có chứa chữ này): auth, student, placement, toeic,
# interview, teacher, demo, mobile, sync, switch
QC_ONLY=teacher node qc/run.js
```

Kết quả in theo từng khu vực (✅/❌) và lưu vào `qc/last-run.json`.
**Chạy lại trước mỗi lần deploy.**

| Khu vực | Kiểm tra gì |
|---|---|
| Dữ liệu từ vựng / TOEIC | Mọi chủ đề có từ, không trùng, IPA + ví dụ ≥ 95%, mọi bộ đề × Part mở được |
| Ngôn ngữ VI/EN | Không có chuỗi nào thiếu bản dịch (kể cả lúc chạy thật) |
| Chọn từ học / kiểm tra | Học mới đi lần lượt 1–10, 11–20; kiểm tra hỏi đúng từ vừa học |
| Học phí & điểm danh | 1-1 vắng không trừ, nhóm vắng trừ; còn lại = đã đóng − đã trừ |
| Google Calendar | Mỗi khung giờ 1 sự kiện; mỗi ngày tối đa 1 nhắc thu học phí |
| Bài test đầu vào | Đáp án hợp lệ, phương án không trùng nghĩa, lộ trình trỏ đúng bài |
| Phỏng vấn / IPA | Câu mẫu ≥ 8/10, điểm luôn 0–10, đọc đúng câu mẫu = 10/10 |
| Đăng ký / đăng nhập | Bắt email gõ nhầm, email đã có tài khoản, quên mật khẩu |
| Học viên (trình duyệt) | 5 trò chơi chơi đến hết, lưu + đồng bộ, Back, đổi ngôn ngữ |
| Giáo viên (trình duyệt) | Danh sách, CSV, tạo nhóm, cấu hình 1-1, đóng tiền, điểm danh, gộp tài khoản |
| Demo | Có dữ liệu mẫu, không ghi gì vào dữ liệu thật |
| Điện thoại 360px | Không tràn ngang ở mọi màn chính (VI + EN) |
| Mạng chậm | Lần tải cloud đầu lỗi → không ghi đè, thử lại rồi gộp đủ |
| Đổi tài khoản | Người sau không thấy / không nhận tiến độ của người trước |

---

## 2. QC thủ công (cần môi trường thật)

Làm sau mỗi lần thay đổi lớn, trên `https://letrinh-english.netlify.app`, nhớ
**Ctrl+Shift+R** để tải bản mới.

### A. Firebase (làm 1 lần sau đợt QC này)

- [ ] Realtime Database → Rules: dán lại **toàn bộ** khối JSON trong
      `docs/FIREBASE-RULES.md` → Publish (bản mới có `merges` + kiểm tra email/thời gian).
- [ ] Authentication → Settings → Authorized domains có `letrinh-english.netlify.app`.
- [ ] Authentication → Users có tài khoản `demo@vocabquest.app` (nếu chưa tạo,
      người lạ có thể đăng ký email này và vào chế độ demo).
- [ ] Sau khi dán rules: đăng nhập 1 tài khoản học viên, chơi 1 lượt → mở Lớp học
      bằng tài khoản giáo viên thấy tiến độ cập nhật (rules mới không chặn ghi).

### B. Học viên — máy tính (Chrome)

- [ ] Đăng ký tài khoản mới bằng email gõ nhầm `@gmial.com` → app gợi ý sửa.
- [ ] Đăng nhập → Chủ đề → Thẻ ghi nhớ 10 từ → Trắc nghiệm: hỏi đúng 10 từ vừa học.
- [ ] Đọc & Chấm: cho phép micro, đọc 1 từ → có điểm. Bấm thanh menu khi micro đang nghe → micro tắt (biểu tượng ghi âm trên tab biến mất).
- [ ] Từ chối quyền micro → hiện hướng dẫn mở quyền.
- [ ] Đổi VI/EN ở trang chủ đề và trang TOEIC → không lỗi, vẫn ở đúng trang.
- [ ] Làm test đầu vào TOEIC và Giao tiếp, phần nói dùng micro thật.
- [ ] Đặt lịch học → Bật thông báo → đến giờ (tab vẫn mở) nhận được thông báo.
- [ ] Tải file .ics → mở bằng Google Calendar / Apple Calendar → có sự kiện lặp + báo trước 10'.
- [ ] Quên mật khẩu với email thật → thư đến trong 5' (kiểm tra cả Spam), link mở được,
      đặt mật khẩu mới xong có nút quay lại app.

### C. Học viên — điện thoại thật

- [ ] iPhone Safari + Android Chrome: header thấy nút Đăng xuất / ngôn ngữ; vuốt menu ngang được.
- [ ] Micro trên điện thoại (Đọc & Chấm, Phỏng vấn, Luyện IPA).
- [ ] iPhone không hỗ trợ nhận giọng nói ở một số trình duyệt → Luyện IPA có nút "Bỏ qua", Phỏng vấn cho gõ câu trả lời.
- [ ] Nút Back của điện thoại: luôn lùi trong app, không thoát ra, không quay về màn đăng nhập.
- [ ] Mạng 3G yếu: đăng nhập trên máy mới → tiến độ cũ vẫn còn (có thể hiện "Mạng chậm, đang thử lại…").

### D. Giáo viên

- [ ] Lớp học: số học viên không tính tài khoản giáo viên / demo.
- [ ] Khối "Có thể trùng tài khoản": gộp thử 1 cặp chắc chắn trùng → học viên mở app bằng tài khoản giữ lại thấy tiến độ cũ.
- [ ] Học phí: tạo nhóm, cấu hình 1-1, ghi đóng tiền (bấm đúp không bị ghi 2 lần), xoá khoản đóng tiền có hỏi lại.
- [ ] Điểm danh lúc 6h sáng: ngày mặc định là **hôm nay** (không phải hôm qua).
- [ ] Chuyển 1 học viên từ nhóm sang 1-1 → biến mất khỏi danh sách nhóm trong tab Điểm danh.
- [ ] Xuất CSV → mở bằng Excel, tên tiếng Việt hiển thị đúng dấu.
- [ ] Google Calendar: Kết nối → lịch "Vocab Quest — Lớp học" có sự kiện; điểm danh xong vài giây sự kiện 💰 cập nhật.
- [ ] Gửi link đặt lại mật khẩu từ cửa sổ chi tiết học viên.

### E. Demo

- [ ] Đăng nhập `demo@vocabquest.app`: có dữ liệu mẫu, Lớp học/Học phí/Điểm danh dùng được, không có khối Google Calendar.
