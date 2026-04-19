# Tài liệu tham khảo

Thư mục này chứa các file PDF/tài liệu gốc mà giáo viên dùng làm nguồn cho nội dung từ vựng trong `js/data/vocab.js` và `js/data/topics.js`.

## Cách dùng

1. Kéo file PDF vào thư mục này (ví dụ `docs/business-english.pdf`, `docs/daily-conversation.pdf`).
2. Commit và push như bình thường:
   ```bash
   git add docs/*.pdf
   git commit -m "Add source PDFs for vocab content"
   git push
   ```
3. Báo cho Claude: "đã add PDF vào docs/, đọc và làm lại vocab theo đó".

## Ghi chú

- File PDF không cần public — chỉ dùng làm nguồn tham khảo nội bộ.
- Nếu PDF nặng (>10 trang), Claude sẽ đọc từng range trang để trích xuất từ vựng.
- Sau khi sync xong, PDF có thể xoá hoặc giữ lại tuỳ ý.
