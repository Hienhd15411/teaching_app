# Báo cáo QC toàn bộ app — 28/10/2026

Cách làm: rà code theo 4 khu vực (học viên, giáo viên/học phí/lịch, phỏng vấn/IPA/test
đầu vào, đăng nhập/đồng bộ/bảo mật/giao diện), viết bộ QC tự động `qc/` (214 kiểm tra:
logic, dữ liệu, và chạy app thật trên Chromium với Firebase giả), sửa lỗi, chạy lại
đến khi xanh hết. Phần cần môi trường thật: `docs/QC-CHECKLIST.md`.

**Kết quả cuối:** 214/214 kiểm tra tự động đạt (`TZ=Asia/Ho_Chi_Minh node qc/run.js`).

## Lỗi nghiêm trọng đã sửa

| # | Lỗi | Hậu quả | Sửa |
|---|---|---|---|
| 1 | File export Firebase (email, tên, tiến độ của 58 học viên) nằm trong repo công khai | Lộ dữ liệu cá nhân, có thể tải được từ web | Gỡ khỏi repo + `.gitignore`. **Lịch sử git vẫn còn — xem "Cần bạn quyết định"** |
| 2 | Từ "Fill out/in" tạo khoá chứa `/` | Ai học chủ đề đó thì mất đồng bộ cloud vĩnh viễn, giáo viên không thấy tiến độ | Làm sạch khoá + tự sửa dữ liệu cũ |
| 3 | Đọc cloud lỗi/timeout bị coi là "tài khoản trống" | Đăng nhập máy mới qua mạng yếu, chơi 1 lượt → xoá sạch tiến độ trên cloud | Chặn ghi cho tới khi đọc được; thử lại tự động |
| 4 | Máy cũ ghi đè máy mới | Tab điện thoại mở từ sáng ghi đè bài học trên laptop | Mỗi lần ghi: đọc cloud → gộp → ghi |
| 5 | Header tràn trên điện thoại | Không thấy nút Đăng xuất / đổi ngôn ngữ trên màn ≤ 400px | Header 2 dòng, menu vuốt ngang |
| 6 | Ngày tính theo giờ UTC | 0h–7h sáng: điểm danh mở nhầm ngày hôm qua (bấm có thể xoá điểm danh hôm qua), báo nhầm "bỏ buổi", thu nhập tính sai tháng | Dùng ngày giờ Việt Nam ở mọi chỗ |
| 7 | Đổi VI/EN trên trang chủ đề / TOEIC / trò chơi | Lỗi JavaScript, kẹt trang | Giữ tham số trang khi đổi ngôn ngữ |
| 8 | Rời trò chơi bằng menu / nút Back | Micro vẫn bật, phím Enter làm trò cũ hiện lại, đồng hồ phỏng vấn chấm câu cũ vào phiên mới | Dọn micro, hẹn giờ, phím tắt mỗi khi chuyển màn |
| 9 | Nhóm ↔ học phí từng học viên lệch nhau | Đổi học viên sang 1-1 rồi sửa nhóm → bị kéo lại vào nhóm, mất giá 1-1; xoá nhóm → học viên 0đ, biến mất khỏi điểm danh | Đồng bộ hai chiều, xoá nhóm trả học viên về "chưa cấu hình" |
| 10 | Bấm đúp | Ghi đóng tiền 2 lần (gấp đôi buổi + thu nhập); điểm danh tự huỷ | Khoá nút khi đang ghi; hỏi lại khi xoá khoản đóng tiền |
| 11 | Học viên tự ghi số lạ vào hồ sơ | Có thể chèn mã chạy trên máy giáo viên; giả mạo email để được chọn khi gộp tài khoản | Ép kiểu số khi hiển thị + rules kiểm tra email/thời gian |
| 12 | Quyền Phỏng vấn chỉ ẩn menu | Học viên chưa được mở quyền vẫn vào được qua lộ trình 4 tuần | Kiểm tra quyền mỗi lần mở |
| 13 | Google Calendar đồng bộ khi tải danh sách học viên lỗi | Xoá hết sự kiện lịch dạy + nhắc học phí | Bỏ qua đồng bộ khi danh sách lỗi/rỗng; chỉ tạo lại lịch khi thật sự bị xoá (404) |

## Lỗi trung bình / nhẹ đã sửa

- **Trò chơi:** "Thử lại" ở Đọc & Chấm chấm điểm nhiều lần (1 từ nhảy lên "đã thuộc"); ôn từ sai chỉ có 1–2 phương án; hai phương án/ thẻ nối cùng nghĩa ("có thể" = possible/likely); gõ "affordable" cho "rẻ" bị chấm sai; nút Back quay lại trò vừa chơi thì bắt đầu lượt mới; thẻ nối bị mất trạng thái chọn.
- **Tiến độ:** chuỗi ngày 🔥 không về 0 khi bỏ học; biểu đồ 14/30 ngày lệch 1 ngày; nhập file tiến độ khi đang đăng nhập không đồng bộ; tên/avatar chọn lúc đăng ký bị đổi thành phần đầu email; ngày đăng ký gốc bị ghi đè (danh sách "mới nhất" sai); màn hình không cập nhật sau khi tải cloud; đăng xuất làm mất 1,5 giây dữ liệu cuối.
- **Đăng nhập:** Back quay về màn đăng nhập khi đang đăng nhập; báo nhầm email hợp lệ (hotmail.fr, yahoo.co.uk) là gõ sai.
- **Phỏng vấn:** từ khoá có gạch nối (hard-working, check-in, low-cost…) không bao giờ được tính; "as" khớp nhầm trong "was", "team" trong "steam"; "like/actually" bị tính là từ đệm; bật/tắt đồng hồ sau khi nộp làm nộp lại lần 2; nói xong xoá hết vẫn được 1,5 điểm; gõ khi micro đang nghe bị ghi đè; micro bị chặn không báo gì. Phỏng vấn theo phần giờ tick đúng mục lộ trình của phần đó.
- **Luyện IPA:** đọc thêm nhiều từ thừa hoặc sai thứ tự vẫn 10/10; "row 20", "15C" (cách Chrome ghi số) bị chấm sai; trình duyệt không có nhận giọng nói bị kẹt ở câu 1 (thêm nút Bỏ qua); luyện IPA không được tính là "đã học hôm nay"; thử lại cộng dồn điểm trung bình; câu tự nhập thiếu IPA cho ~140 từ thường gặp trên máy bay.
- **Test đầu vào:** phương án trùng nghĩa (2 nút cùng chữ "đánh giá"); nhắc học có thể bị lỡ nếu tab chạy nền; file .ics sai định dạng DTSTAMP.
- **Giáo viên:** tài khoản giáo viên/demo bị đếm là học viên; ↻ ở tab Học phí không hiện học viên mới; hai tab tải chồng lên nhau; thu nhập giữa 2 khối không khớp; CSV mở bằng Excel lỗi dấu tiếng Việt + có thể chứa công thức; một số thông báo chưa dịch.
- **Giao diện:** chữ xám nhạt dưới chuẩn tương phản WCAG AA → đậm hơn; khoá chế độ sáng (trình duyệt ép dark mode không làm vỡ màu); bảng rộng cuộn ngang trên điện thoại thay vì ẩn cột email.

## Cần bạn quyết định / làm

1. **Dữ liệu học viên vẫn nằm trong lịch sử git** (commit cũ) của repo công khai. Muốn xoá hẳn cần viết lại lịch sử và *force-push* — thao tác không hoàn tác được, mình chưa làm. Cách nhanh hơn: chuyển repo GitHub sang **Private** (Settings → General → Danger Zone → Change visibility).
2. Repo cũng chứa 2 file PDF giáo trình có bản quyền (`docs/Business_Result…pdf`, `docs/Vocabulary_in_Use…pdf`) và `TOEIC_Vocabulary.xlsx`, đang công khai trên GitHub và có thể tải từ web Netlify. Nên gỡ hoặc để repo Private.
3. Dán lại Firebase rules mới và các bước trong `docs/QC-CHECKLIST.md` phần A.

## Chưa sửa (ghi nhận, rủi ro thấp)

- Bỏ tick thủ công 1 mục lộ trình trên máy này có thể hiện lại sau khi đăng nhập máy khác.
- Quy tắc "1-1 vắng có trừ buổi không" vẫn cho chỉnh trong ⚙️ (giữ linh hoạt như bạn yêu cầu trước đây; mặc định không trừ).
- 123 cặp từ trong dữ liệu có cùng nghĩa tiếng Việt. App đã xử lý trong trò chơi; dữ liệu giữ nguyên.
- Rules chưa giới hạn dung lượng tiến độ của 1 học viên.
