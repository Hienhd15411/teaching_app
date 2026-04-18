# 🎮 Vocab Quest — Tool học từ vựng tiếng Anh giao tiếp

Ứng dụng web tĩnh (không cần server, không cần build) dành cho giáo viên dạy tiếng Anh giao tiếp và học viên của họ. Học viên luyện từ vựng theo **chủ đề** (Văn phòng, Nhà ở, Đi chơi, Ăn uống, Du lịch, Mua sắm) qua 4 kiểu game, có hệ thống XP / Level / Streak / Huy hiệu và tự động ghi nhớ từ yếu dựa trên **spaced repetition (Leitner 5 hộp)**.

## Tính năng chính

- **4 game mode**: Flashcard (lật thẻ, tự đánh giá), Multiple-choice Quiz, Typing (gõ từ), Matching (nối cặp).
- **Nhiều profile học viên**: mỗi em tạo 1 profile riêng trên máy, tiến độ độc lập.
- **Song ngữ**: toggle Việt ↔ Anh trên header (🌐).
- **Spaced repetition**: từ sai sẽ được ưu tiên ôn lại; có nút "Ôn từ sai" trên mỗi chủ đề.
- **Tiến độ cá nhân**: XP, level, streak ngày, % thạo theo chủ đề, lịch sử 30 ngày, huy hiệu.
- **Export / Import**: xuất tiến độ ra file `.json` để backup hoặc chuyển máy.

## Cách chạy

### Cách 1: Mở trực tiếp (đơn giản nhất)

Nháy đúp `index.html` → mở trong Chrome/Firefox/Edge. Xong. Tất cả chạy bằng localStorage trên máy của học viên.

> Lưu ý: vì dùng classic `<script>` tag, tool chạy được cả với `file://`. Không cần cài gì thêm.

### Cách 2: Chạy qua local server (khuyến nghị cho lớp học online)

```bash
cd teaching_app
python3 -m http.server 8080
# hoặc: npx serve .
```

Rồi mở http://localhost:8080.

### Cách 3: Deploy miễn phí

- **GitHub Pages**: push repo lên GitHub → Settings → Pages → enable branch này. Share link cho học viên.
- **Netlify / Vercel**: kéo thư mục vào Netlify Drop, ra ngay link.

## Hướng dẫn cho giáo viên

### Thêm từ vựng mới

Mở `js/data/vocab.js`, thêm entry vào mảng của chủ đề tương ứng:

```js
{ en: 'colleague', vi: 'đồng nghiệp', pos: 'n', example: 'My colleague helped me.' }
```

- `pos`: `n` (noun), `v` (verb), `adj`, `adv`, `phr` (phrase).
- `example`: câu ví dụ — hiển thị trong flashcard và typing game.

### Thêm chủ đề mới

1. Mở `js/data/topics.js`, thêm object mới:
   ```js
   { id: 'health', icon: '🏥', title: { vi: 'Sức khoẻ', en: 'Health' }, desc: { vi: '...', en: '...' } }
   ```
2. Mở `js/data/vocab.js`, thêm key `health: [...]` với danh sách từ.

### Xin tiến độ học viên

Yêu cầu học viên vào **Tiến độ → ⬇️ Xuất dữ liệu**, gửi file JSON qua Zalo/email. Giáo viên có thể mở file đó để xem chi tiết, hoặc Import vào máy mình để "xem lại" profile đó.

## Quy tắc điểm (gamification)

| Hành động              | XP  |
|------------------------|-----|
| Trả lời đúng (quiz / typing / matching) | +10 |
| Combo ≥ 3 đúng liên tiếp  | bonus +5/từ |
| Flashcard "Good"        | +5  |
| Flashcard "Easy"        | +10 |
| Flashcard "Again" / sai | 0, từ về box 1 |

- **Level up**: ngưỡng XP = `100 × level^1.5`.
- **Streak**: ngày liên tiếp có học ≥1 game. Quá 1 ngày không học sẽ reset.
- **Box 1–5 (Leitner)**: đúng → lên 1 box, sai → về box 1. Box ≥ 4 tính là "đã thạo".

## Cấu trúc thư mục

```
teaching_app/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js            # Router + render các view
│   ├── i18n.js           # Song ngữ VI/EN
│   ├── storage.js        # localStorage wrapper
│   ├── srs.js            # Leitner spaced repetition
│   ├── progress.js       # XP/level/streak/badges
│   ├── profile.js        # Profile picker
│   ├── data/
│   │   ├── topics.js     # Danh sách chủ đề
│   │   ├── vocab.js      # Từ vựng (edit ở đây để thêm từ)
│   │   └── grammar.js    # Stub — sắp có
│   └── games/
│       ├── flashcard.js
│       ├── quiz.js
│       ├── typing.js
│       └── matching.js
└── README.md
```

## Hướng mở rộng

- **Ngữ pháp** (`js/data/grammar.js` đã có stub + comment TODO) — có thể thêm bài tập điền từ, chia động từ.
- **Audio**: dùng Web Speech API (`speechSynthesis.speak`) để đọc từ tiếng Anh.
- **Leaderboard nhóm**: yêu cầu backend — có thể dùng Firebase/Supabase sau này.
- **Câu giao tiếp (phrase)**: thêm `pos: 'phr'` là đã hỗ trợ sẵn.

## Tương thích

- Chrome, Firefox, Edge, Safari (desktop & mobile).
- Yêu cầu JavaScript bật và `localStorage` khả dụng (không chạy trong chế độ ẩn danh mà không bật storage).
