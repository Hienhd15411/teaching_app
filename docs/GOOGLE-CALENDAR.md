# Google Calendar cho giáo viên — hướng dẫn cài đặt (làm 1 lần, ~15 phút)

App đẩy 2 loại nhắc lên Google Calendar của giáo viên. Google Calendar sau đó
tự nhắc trên điện thoại / email, **không cần mở app**:

| Loại | Trên lịch | Khi nào cập nhật |
|---|---|---|
| **Nhắc lớp** | Mỗi khung giờ 1 sự kiện lặp hàng tuần: `📚 Minh · 1-1` (T2 18:00–19:30), `👥 Nhóm TOEIC tối` (T3 19:30). Nhắc trước 15 phút. | Khi lưu/sửa lịch của học viên hoặc nhóm. |
| **Nhắc thu học phí** | **Mỗi ngày 1 sự kiện tổng hợp** lúc giờ đã chọn (mặc định 08:00): `💰 Thu học phí hôm nay: Lan, Minh`. Mô tả liệt kê từng người: còn mấy buổi, lớp nào, giờ nào, tiền gói. Ngày không ai cần thu → không có sự kiện. Nhìn trước 14 ngày, có **dự đoán**: học viên còn 5 buổi mà học T3/T5 sẽ tự xuất hiện vào đúng ngày họ chỉ còn 2. | Sau mỗi lần điểm danh, đóng tiền, đổi lịch; và khi mở tab Học phí nếu đã quá 30 phút. |

Tất cả nằm trong lịch riêng tên **"Vocab Quest — Lớp học"** do app tạo. App
**không đọc, không sửa** lịch cá nhân của giáo viên (quyền OAuth chỉ cho
phép làm việc trên lịch mà chính app tạo ra). Sự kiện giáo viên tự thêm tay vào
lịch này cũng không bị đụng.

Chạy hoàn toàn trong trình duyệt, không cần server, không cần Firebase Blaze.
Mọi thứ cần đưa lên lịch chỉ thay đổi khi giáo viên đang dùng app (điểm danh,
đóng tiền, xếp lịch) nên đồng bộ ngay lúc đó là đủ.

---

## Bước 1 — Bật Google Calendar API

1. Vào <https://console.cloud.google.com/> và đăng nhập bằng **Google account
   đang quản lý Firebase** (dự án `teaching-app-3959a` chính là một dự án Google
   Cloud, dùng luôn, không tạo mới).
2. Chọn dự án **teaching-app-3959a** ở thanh trên cùng.
3. Menu ☰ → **APIs & Services → Library** → tìm **Google Calendar API** →
   **Enable**.

## Bước 2 — Màn hình đồng ý (OAuth consent screen)

1. **APIs & Services → OAuth consent screen** (tên mới: *Google Auth Platform →
   Branding*).
2. Nếu hỏi User type: chọn **External** → Create.
3. Điền: App name `Vocab Quest`, User support email = email của bạn, Developer
   contact = email của bạn → Save.
4. Mục **Audience** (hoặc *Test users* trong luồng cũ): **Add users** → thêm
   email Google của giáo viên (email sẽ bấm "Kết nối" trong app; ví dụ
   `lemytrinh1801@gmail.com`). Để app ở trạng thái **Testing** — không cần
   Google duyệt, tối đa 100 test user, đủ dùng.
5. Mục **Data access / Scopes**: không bắt buộc thêm; app tự xin scope
   `calendar.app.created` khi kết nối.

## Bước 3 — Tạo OAuth Client ID (Web)

1. **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
2. Application type: **Web application**. Name: `Vocab Quest web`.
3. **Authorized JavaScript origins** → Add URI, thêm cả 2:
   - `https://letrinh-english.netlify.app` (đúng địa chỉ mở app, không có `/` cuối)
   - `http://localhost:8080` (chỉ để test máy local, có thể bỏ)
4. **Authorized redirect URIs**: để trống (app dùng popup, không redirect).
5. **Create** → copy **Client ID** (dạng
   `1055636163241-xxxxxxxx.apps.googleusercontent.com`).

## Bước 4 — Dán Client ID vào app

Mở `js/firebase-config.js`, sửa dòng cuối:

```js
global.GOOGLE_CALENDAR_CLIENT_ID = '1055636163241-xxxxxxxx.apps.googleusercontent.com';
```

Commit → Netlify tự deploy. (Client ID là thông tin công khai theo thiết kế
của OAuth cho web app, không phải secret; bảo mật nằm ở danh sách origin ở
bước 3 và test user ở bước 2.)

## Bước 5 — Kết nối trong app

1. Đăng nhập tài khoản giáo viên → **Lớp học → Học phí**.
2. Khối **📅 Google Calendar của giáo viên** → **Kết nối Google Calendar** →
   chọn đúng Google account đã thêm ở bước 2 → Allow.
   - Nếu hiện cảnh báo "Google hasn't verified this app": bấm *Continue* — đó
     là hành vi bình thường của app ở chế độ Testing.
3. App tạo lịch "Vocab Quest — Lớp học" và đẩy toàn bộ sự kiện. Toast báo
   `Đã đồng bộ N sự kiện`.
4. Mở Google Calendar (web/điện thoại) → bên trái thấy lịch mới. Bật thông báo
   cho lịch này trên điện thoại: Google Calendar app → ☰ → Settings → chọn lịch
   "Vocab Quest — Lớp học" → Notifications.
5. Chỉnh **Giờ nhắc** thu học phí ngay trong khối đó (mặc định 08:00).

Sau đó không cần làm gì thêm. Mỗi lần điểm danh / đóng tiền / đổi lịch, app tự
đẩy lại sau ~1.5 giây.

---

## Khi nào phải cấp quyền lại?

Token Google sống 1 giờ. Khi hết, app xin lại **im lặng** nếu trình duyệt còn
đăng nhập Google. Nếu không được (đổi máy, xoá cookie, thu hồi quyền), app hiện
toast *"Google cần bạn cấp lại quyền — bấm Đồng bộ ngay"* → bấm nút là xong.

## Lỗi thường gặp

| Thông báo | Nguyên nhân / cách sửa |
|---|---|
| `Client ID / origin chưa đúng (origin_mismatch)` | Domain Netlify chưa có trong *Authorized JavaScript origins* (bước 3) hoặc gõ thiếu `https://`. Sau khi thêm chờ ~5 phút. |
| `access_denied` khi bấm Allow | Email đang đăng nhập Google không nằm trong *Test users* (bước 2). |
| `invalid_scope` | Rất hiếm. Mở `js/gcal.js`, đổi hằng `SCOPE` sang `https://www.googleapis.com/auth/calendar` (quyền rộng hơn, vẫn chỉ ghi vào lịch app tạo). |
| `Không tải được Google Sign-in` | Mạng/adblock chặn `accounts.google.com`. Thử trình duyệt khác hoặc tắt extension. |
| Xoá nhầm lịch trên Google | Bấm **Đồng bộ ngay** → app phát hiện lịch mất và tạo lại đầy đủ. |

## Ghi chú kỹ thuật

- Code: `js/gcal.js` (auth + REST + tính toán sự kiện), khối UI trong
  `js/billing-ui.js` (`renderGcalPanel`), kích hoạt tự động trong `js/app.js`
  (`loadBillingTab → reload → GCal.autoSync`).
- Lưu trạng thái ở `/billing_settings/gcal = { calendarId, digestTime,
  lastSyncAt, lastSyncCount }` — dùng rules hiện có (chỉ giáo viên đọc/ghi),
  **không cần sửa Firebase rules**.
- ID sự kiện cố định (mã hex của `uid|thứ` hoặc `ngày`) → đồng bộ lại chỉ
  sửa/xoá đúng chỗ, không bao giờ nhân đôi.
- Thời lượng buổi (45/60/90/120 phút) chỉnh trong form Cấu hình học viên và
  form Nhóm; mặc định 60.
- Ngưỡng "cần thu" = còn ≤ 2 buổi (`GCal.DUE_THRESHOLD`), giống khối "Cần thu
  học phí" trong app. Học viên **không có lịch cố định** chỉ hiện trong app,
  không tạo nhắc hàng ngày (tránh nhắc mãi với học viên đã nghỉ).
- Tài khoản demo không thấy khối này.
