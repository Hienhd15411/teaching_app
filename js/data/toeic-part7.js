(function () {
  'use strict';
  if (typeof TOEIC === 'undefined') return;

  // Part 7 · Reading Comprehension — single/double/triple passages.
  // Contexts: ads, articles, forms, schedules, invoices, contracts, reviews.
  // Curated from public TOEIC prep materials. Not ETS.

  // ---- 2023 edition ----
  TOEIC.setPart('2023', 'part7', 'keywords', [
    { en: 'indicate', vi: 'chỉ ra, ngụ ý', pos: 'v', ipa: 'ˈɪndɪkeɪt', example: 'What does the report indicate about sales?' },
    { en: 'infer', vi: 'suy ra', pos: 'v', ipa: 'ɪnˈfɜː', example: 'What can be inferred about the company?' },
    { en: 'imply', vi: 'ám chỉ', pos: 'v', ipa: 'ɪmˈplaɪ', example: 'The author implies a bigger trend.' },
    { en: 'suggest', vi: 'gợi ý', pos: 'v', ipa: 'səˈdʒest', example: 'The article suggests a new approach.' },
    { en: 'refer to', vi: 'nhắc tới', pos: 'phr', ipa: 'rɪˈfɜː tuː', example: 'The underlined word refers to the project.' },
    { en: 'according to', vi: 'theo như', pos: 'phr', ipa: 'əˈkɔːdɪŋ tuː', example: 'According to the memo, hours will change.' },
    { en: 'purpose', vi: 'mục đích', pos: 'n', ipa: 'ˈpɜːpəs', example: 'What is the purpose of the email?' },
    { en: 'main idea', vi: 'ý chính', pos: 'n', ipa: 'meɪn aɪˈdɪə', example: 'What is the main idea of the passage?' },
    { en: 'recipient', vi: 'người nhận', pos: 'n', ipa: 'rɪˈsɪpiənt', example: 'The recipient of the letter is Mr. Lee.' },
    { en: 'addressed to', vi: 'gửi tới', pos: 'phr', ipa: 'əˈdrest tuː', example: 'The memo is addressed to all managers.' },
  ]);
  TOEIC.setPart('2023', 'part7', 'highFreq', [
    { en: 'advertisement', vi: 'quảng cáo', pos: 'n', ipa: 'ədˈvɜːtɪsmənt', example: 'The advertisement lists job requirements.', syn: ['ad'] },
    { en: 'article', vi: 'bài báo', pos: 'n', ipa: 'ˈɑːtɪkl', example: 'The article discusses market trends.' },
    { en: 'memo', vi: 'bản ghi nhớ', pos: 'n', ipa: 'ˈmeməʊ', example: 'Please read the attached memo.' },
    { en: 'notice', vi: 'thông báo', pos: 'n', ipa: 'ˈnəʊtɪs', example: 'A notice was posted in the lobby.' },
    { en: 'schedule', vi: 'lịch trình', pos: 'n', ipa: 'ˈʃedjuːl', example: 'See the schedule below.' },
    { en: 'invoice', vi: 'hoá đơn', pos: 'n', ipa: 'ˈɪnvɔɪs', example: 'The invoice is due in 30 days.' },
    { en: 'receipt', vi: 'biên lai', pos: 'n', ipa: 'rɪˈsiːt', example: 'A receipt was included with the package.' },
    { en: 'form', vi: 'mẫu đơn', pos: 'n', ipa: 'fɔːm', example: 'Fill out the application form.' },
    { en: 'survey', vi: 'khảo sát', pos: 'n', ipa: 'ˈsɜːveɪ', example: 'Complete the short survey.' },
    { en: 'warranty', vi: 'bảo hành', pos: 'n', ipa: 'ˈwɒrənti', example: 'The warranty lasts two years.' },
    { en: 'terms', vi: 'điều khoản', pos: 'n', ipa: 'tɜːmz', example: 'Review the terms before signing.' },
    { en: 'conditions', vi: 'điều kiện', pos: 'n', ipa: 'kənˈdɪʃnz', example: 'All conditions apply.' },
    { en: 'discount', vi: 'giảm giá', pos: 'n', ipa: 'ˈdɪskaʊnt', example: 'Members receive a 15% discount.' },
    { en: 'coupon', vi: 'phiếu giảm giá', pos: 'n', ipa: 'ˈkuːpɒn', example: 'The coupon expires on June 30.' },
    { en: 'deadline', vi: 'hạn chót', pos: 'n', ipa: 'ˈdedlaɪn', example: 'The application deadline is Friday.' },
    { en: 'eligibility', vi: 'điều kiện đủ', pos: 'n', ipa: 'ˌelɪdʒəˈbɪləti', example: 'Check your eligibility before applying.' },
    { en: 'eligible', vi: 'đủ điều kiện', pos: 'adj', ipa: 'ˈelɪdʒəbl', example: 'You are eligible for a free upgrade.' },
    { en: 'available', vi: 'có sẵn', pos: 'adj', ipa: 'əˈveɪləbl', example: 'Tickets are available online.' },
    { en: 'valid', vi: 'hợp lệ', pos: 'adj', ipa: 'ˈvælɪd', example: 'The offer is valid until Sunday.' },
    { en: 'expire', vi: 'hết hạn', pos: 'v', ipa: 'ɪkˈspaɪə', example: 'The offer expires next week.' },
    { en: 'submit', vi: 'nộp', pos: 'v', ipa: 'səbˈmɪt', example: 'Submit your résumé online.' },
    { en: 'enclose', vi: 'đính kèm', pos: 'v', ipa: 'ɪnˈkləʊz', example: 'Enclosed are two letters of reference.' },
    { en: 'request', vi: 'yêu cầu', pos: 'v', ipa: 'rɪˈkwest', example: 'We request a prompt reply.' },
    { en: 'provide', vi: 'cung cấp', pos: 'v', ipa: 'prəˈvaɪd', example: 'Please provide the required documents.' },
    { en: 'proof', vi: 'bằng chứng', pos: 'n', ipa: 'pruːf', example: 'Please bring proof of purchase.' },
  ]);

  // ---- 2024 edition ----
  TOEIC.setPart('2024', 'part7', 'keywords', [
    { en: 'most likely', vi: 'có nhiều khả năng', pos: 'phr', ipa: 'məʊst ˈlaɪkli', example: 'Who is most likely the author?' },
    { en: 'NOT true', vi: 'KHÔNG đúng', pos: 'phr', ipa: 'nɒt truː', example: 'Which statement is NOT true about the offer?' },
    { en: 'be mentioned', vi: 'được đề cập', pos: 'phr', ipa: 'bi ˈmenʃnd', example: 'Which benefit is mentioned?' },
    { en: 'in the first paragraph', vi: 'ở đoạn đầu', pos: 'phr', ipa: 'ɪn ðə fɜːst ˈpærəɡrɑːf', example: 'In the first paragraph, the writer describes the problem.' },
    { en: 'closest in meaning', vi: 'gần nghĩa nhất', pos: 'phr', ipa: 'ˈkləʊsɪst ɪn ˈmiːnɪŋ', example: 'Which word is closest in meaning to "implement"?' },
    { en: 'attached', vi: 'đính kèm', pos: 'adj', ipa: 'əˈtætʃt', example: 'See the attached schedule.' },
    { en: 'best completes', vi: 'hoàn thành tốt nhất', pos: 'phr', ipa: 'best kəmˈpliːts', example: 'Which sentence best completes the paragraph?' },
    { en: 'best describes', vi: 'mô tả đúng nhất', pos: 'phr', ipa: 'best dɪˈskraɪbz', example: 'What best describes the event?' },
    { en: 'be expected to', vi: 'được kỳ vọng', pos: 'phr', ipa: 'bi ɪkˈspektɪd tuː', example: 'Applicants are expected to have experience.' },
    { en: 'be required to', vi: 'được yêu cầu', pos: 'phr', ipa: 'bi rɪˈkwaɪəd tuː', example: 'Guests are required to register.' },
  ]);
  TOEIC.setPart('2024', 'part7', 'highFreq', [
    { en: 'candidate', vi: 'ứng viên', pos: 'n', ipa: 'ˈkændɪdət', example: 'The ideal candidate has five years\u2019 experience.' },
    { en: 'position', vi: 'vị trí công việc', pos: 'n', ipa: 'pəˈzɪʃn', example: 'The position is open until filled.' },
    { en: 'qualification', vi: 'bằng cấp', pos: 'n', ipa: 'ˌkwɒlɪfɪˈkeɪʃn', example: 'Please list your qualifications.' },
    { en: 'résumé', vi: 'sơ yếu lý lịch', pos: 'n', ipa: 'ˈrezjuːmeɪ', example: 'Attach your résumé and cover letter.', syn: ['CV'] },
    { en: 'reference', vi: 'người tham chiếu', pos: 'n', ipa: 'ˈrefrəns', example: 'Provide two professional references.' },
    { en: 'salary', vi: 'lương', pos: 'n', ipa: 'ˈsæləri', example: 'Salary depends on experience.' },
    { en: 'compensation', vi: 'tiền thù lao', pos: 'n', ipa: 'ˌkɒmpenˈseɪʃn', example: 'Our compensation package is competitive.' },
    { en: 'benefits', vi: 'phúc lợi', pos: 'n', ipa: 'ˈbenɪfɪts', example: 'Benefits include health insurance.' },
    { en: 'vacancy', vi: 'vị trí trống', pos: 'n', ipa: 'ˈveɪkənsi', example: 'We have three vacancies in marketing.' },
    { en: 'shift', vi: 'ca làm', pos: 'n', ipa: 'ʃɪft', example: 'Night shifts pay more.' },
    { en: 'booking', vi: 'đặt chỗ', pos: 'n', ipa: 'ˈbʊkɪŋ', example: 'Confirm your booking by email.' },
    { en: 'reservation', vi: 'đặt chỗ', pos: 'n', ipa: 'ˌrezəˈveɪʃn', example: 'Your reservation is under the name Tran.' },
    { en: 'confirmation', vi: 'xác nhận', pos: 'n', ipa: 'ˌkɒnfəˈmeɪʃn', example: 'You will receive a confirmation email.' },
    { en: 'itinerary', vi: 'lịch trình', pos: 'n', ipa: 'aɪˈtɪnərəri', example: 'The itinerary is subject to change.' },
    { en: 'facility', vi: 'cơ sở vật chất', pos: 'n', ipa: 'fəˈsɪləti', example: 'The facility includes a gym.' },
    { en: 'venue', vi: 'địa điểm tổ chức', pos: 'n', ipa: 'ˈvenjuː', example: 'The venue seats 300 guests.' },
    { en: 'issue', vi: 'phát hành, vấn đề', pos: 'v', ipa: 'ˈɪʃuː', example: 'A new version will be issued.' },
    { en: 'return', vi: 'đổi trả', pos: 'v', ipa: 'rɪˈtɜːn', example: 'Items can be returned within 30 days.' },
    { en: 'exchange', vi: 'đổi', pos: 'v', ipa: 'ɪksˈtʃeɪndʒ', example: 'Items can be exchanged for store credit.' },
    { en: 'apply', vi: 'áp dụng, ứng tuyển', pos: 'v', ipa: 'əˈplaɪ', example: 'Terms and conditions apply.' },
    { en: 'qualify', vi: 'đủ tiêu chuẩn', pos: 'v', ipa: 'ˈkwɒlɪfaɪ', example: 'You qualify for free shipping.' },
    { en: 'upgrade', vi: 'nâng cấp', pos: 'v', ipa: 'ʌpˈɡreɪd', example: 'Members can upgrade for free.' },
    { en: 'redeem', vi: 'đổi (điểm, voucher)', pos: 'v', ipa: 'rɪˈdiːm', example: 'Redeem your points at checkout.' },
    { en: 'limited', vi: 'có giới hạn', pos: 'adj', ipa: 'ˈlɪmɪtɪd', example: 'Limited quantities available.' },
    { en: 'prospective', vi: 'tiềm năng', pos: 'adj', ipa: 'prəˈspektɪv', example: 'Prospective clients may visit the office.' },
  ]);

  // ---- 2026 edition ----
  TOEIC.setPart('2026', 'part7', 'keywords', [
    { en: 'in paragraph', vi: 'trong đoạn', pos: 'phr', ipa: 'ɪn ˈpærəɡrɑːf', example: 'In paragraph 2, the word "firm" means...' },
    { en: 'best fits', vi: 'phù hợp nhất', pos: 'phr', ipa: 'best fɪts', example: 'Which sentence best fits here?' },
    { en: 'True about', vi: 'đúng về', pos: 'phr', ipa: 'truː əˈbaʊt', example: 'What is true about the new policy?' },
    { en: 'at the end of', vi: 'ở cuối', pos: 'phr', ipa: 'æt ði end əv', example: 'At the end of the memo, the author lists actions.' },
    { en: 'in the context', vi: 'trong ngữ cảnh', pos: 'phr', ipa: 'ɪn ðə ˈkɒntekst', example: 'In the context, "address" most nearly means...' },
    { en: 'tone', vi: 'giọng điệu', pos: 'n', ipa: 'təʊn', example: 'What is the tone of the article?' },
    { en: 'attitude', vi: 'thái độ', pos: 'n', ipa: 'ˈætɪtjuːd', example: 'What is the author\u2019s attitude?' },
    { en: 'expressed', vi: 'được bày tỏ', pos: 'adj', ipa: 'ɪkˈsprest', example: 'What concern is expressed in the letter?' },
    { en: 'based on', vi: 'dựa trên', pos: 'phr', ipa: 'beɪst ɒn', example: 'Based on the chart, sales rose.' },
    { en: 'sender', vi: 'người gửi', pos: 'n', ipa: 'ˈsendə', example: 'Who is the sender of the email?' },
  ]);
  TOEIC.setPart('2026', 'part7', 'highFreq', [
    { en: 'agreement', vi: 'hợp đồng, thoả thuận', pos: 'n', ipa: 'əˈɡriːmənt', example: 'The agreement was signed last week.' },
    { en: 'contract', vi: 'hợp đồng', pos: 'n', ipa: 'ˈkɒntrækt', example: 'Please review the contract carefully.' },
    { en: 'clause', vi: 'điều khoản', pos: 'n', ipa: 'klɔːz', example: 'A new clause was added to the contract.' },
    { en: 'refund policy', vi: 'chính sách hoàn tiền', pos: 'n', ipa: 'ˈriːfʌnd ˈpɒləsi', example: 'Check the refund policy before buying.' },
    { en: 'shipping fee', vi: 'phí vận chuyển', pos: 'n', ipa: 'ˈʃɪpɪŋ fiː', example: 'Shipping fees apply to overseas orders.' },
    { en: 'tracking number', vi: 'mã theo dõi', pos: 'n', ipa: 'ˈtrækɪŋ ˈnʌmbə', example: 'Your tracking number is in the email.' },
    { en: 'review', vi: 'bài đánh giá', pos: 'n', ipa: 'rɪˈvjuː', example: 'Read the customer review online.' },
    { en: 'testimonial', vi: 'lời chứng thực', pos: 'n', ipa: 'ˌtestɪˈməʊniəl', example: 'The page features customer testimonials.' },
    { en: 'rating', vi: 'xếp hạng', pos: 'n', ipa: 'ˈreɪtɪŋ', example: 'The service received a five-star rating.' },
    { en: 'complaint', vi: 'lời than phiền', pos: 'n', ipa: 'kəmˈpleɪnt', example: 'We take every complaint seriously.' },
    { en: 'refund request', vi: 'yêu cầu hoàn tiền', pos: 'n', ipa: 'ˈriːfʌnd rɪˈkwest', example: 'Submit a refund request within 14 days.' },
    { en: 'report', vi: 'báo cáo', pos: 'n', ipa: 'rɪˈpɔːt', example: 'The annual report is available online.' },
    { en: 'press release', vi: 'thông cáo báo chí', pos: 'n', ipa: 'pres rɪˈliːs', example: 'The press release announces a new product.' },
    { en: 'announcement', vi: 'thông báo', pos: 'n', ipa: 'əˈnaʊnsmənt', example: 'An announcement will be made shortly.' },
    { en: 'proposal', vi: 'đề xuất', pos: 'n', ipa: 'prəˈpəʊzl', example: 'The proposal was accepted.' },
    { en: 'grant', vi: 'trợ cấp, cấp cho', pos: 'v', ipa: 'ɡrɑːnt', example: 'The committee granted approval.' },
    { en: 'reject', vi: 'từ chối', pos: 'v', ipa: 'rɪˈdʒekt', example: 'The request was rejected.', ant: ['accept', 'approve'] },
    { en: 'accept', vi: 'chấp nhận', pos: 'v', ipa: 'əkˈsept', example: 'We are pleased to accept your offer.', ant: ['reject'] },
    { en: 'extend', vi: 'gia hạn', pos: 'v', ipa: 'ɪkˈstend', example: 'The deadline has been extended.' },
    { en: 'waive', vi: 'miễn', pos: 'v', ipa: 'weɪv', example: 'The fee will be waived for members.' },
    { en: 'estimate', vi: 'ước tính', pos: 'n', ipa: 'ˈestɪmət', example: 'A cost estimate is attached.' },
    { en: 'quote', vi: 'báo giá', pos: 'n', ipa: 'kwəʊt', example: 'A quote will be sent tomorrow.' },
    { en: 'draft', vi: 'bản nháp', pos: 'n', ipa: 'drɑːft', example: 'The draft will be reviewed this week.' },
    { en: 'revised', vi: 'đã sửa đổi', pos: 'adj', ipa: 'rɪˈvaɪzd', example: 'Please see the revised document.' },
    { en: 'final', vi: 'cuối cùng', pos: 'adj', ipa: 'ˈfaɪnl', example: 'The final decision rests with the board.' },
  ]);
})();
