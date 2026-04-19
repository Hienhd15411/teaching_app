(function () {
  'use strict';
  if (typeof TOEIC === 'undefined') return;

  // Part 6 · Text Completion — cohesion, transitions, sentence-insertion.
  // Contexts: emails, memos, notices, short articles.
  // Curated from public TOEIC prep materials. Not ETS.

  // ---- 2023 edition ----
  TOEIC.setPart('2023', 'part6', 'keywords', [
    { en: 'in contrast', vi: 'ngược lại', pos: 'phr', ipa: 'ɪn ˈkɒntrɑːst', example: 'In contrast, the rural market stayed flat.' },
    { en: 'for instance', vi: 'chẳng hạn', pos: 'phr', ipa: 'fə ˈɪnstəns', example: 'For instance, customers prefer online orders.' },
    { en: 'as a result', vi: 'do đó', pos: 'phr', ipa: 'əz ə rɪˈzʌlt', example: 'The system failed; as a result, the order was lost.' },
    { en: 'furthermore', vi: 'hơn nữa', pos: 'adv', ipa: 'ˌfɜːðəˈmɔː', example: 'Furthermore, staff morale has improved.' },
    { en: 'otherwise', vi: 'nếu không', pos: 'adv', ipa: 'ˈʌðəwaɪz', example: 'Submit by Friday; otherwise, late fees apply.' },
    { en: 'instead', vi: 'thay vào đó', pos: 'adv', ipa: 'ɪnˈsted', example: 'The manager could not attend; the assistant came instead.' },
    { en: 'nonetheless', vi: 'tuy nhiên', pos: 'adv', ipa: 'ˌnʌnðəˈles', example: 'The results were modest; nonetheless, the team celebrated.' },
    { en: 'subsequently', vi: 'sau đó', pos: 'adv', ipa: 'ˈsʌbsɪkwəntli', example: 'The policy was drafted and subsequently approved.' },
    { en: 'meanwhile', vi: 'trong lúc đó', pos: 'adv', ipa: 'ˈmiːnwaɪl', example: 'Meanwhile, the design team finalised the logo.' },
    { en: 'accordingly', vi: 'theo đó', pos: 'adv', ipa: 'əˈkɔːdɪŋli', example: 'Prices rose; schedules were adjusted accordingly.' },
  ]);
  TOEIC.setPart('2023', 'part6', 'highFreq', [
    { en: 'notice', vi: 'thông báo', pos: 'n', ipa: 'ˈnəʊtɪs', example: 'Please read the attached notice.' },
    { en: 'memo', vi: 'bản ghi nhớ', pos: 'n', ipa: 'ˈmeməʊ', example: 'The memo outlines new procedures.' },
    { en: 'policy', vi: 'chính sách', pos: 'n', ipa: 'ˈpɒləsi', example: 'Our refund policy is on the website.' },
    { en: 'procedure', vi: 'quy trình', pos: 'n', ipa: 'prəˈsiːdʒə', example: 'Follow the safety procedure carefully.' },
    { en: 'staff', vi: 'nhân viên', pos: 'n', ipa: 'stɑːf', example: 'All staff must attend the briefing.' },
    { en: 'inform', vi: 'thông báo', pos: 'v', ipa: 'ɪnˈfɔːm', example: 'Please inform your supervisor.' },
    { en: 'announce', vi: 'thông báo', pos: 'v', ipa: 'əˈnaʊns', example: 'We are pleased to announce a new service.' },
    { en: 'implement', vi: 'triển khai', pos: 'v', ipa: 'ˈɪmplɪment', example: 'The changes will be implemented next quarter.' },
    { en: 'update', vi: 'cập nhật', pos: 'v', ipa: 'ˌʌpˈdeɪt', example: 'We will update you as the situation develops.' },
    { en: 'include', vi: 'bao gồm', pos: 'v', ipa: 'ɪnˈkluːd', example: 'The package includes free delivery.' },
    { en: 'offer', vi: 'cung cấp', pos: 'v', ipa: 'ˈɒfə', example: 'We offer 24/7 support.' },
    { en: 'provide', vi: 'cung cấp', pos: 'v', ipa: 'prəˈvaɪd', example: 'Please provide your account number.' },
    { en: 'appreciate', vi: 'trân trọng', pos: 'v', ipa: 'əˈpriːʃieɪt', example: 'We appreciate your patience.' },
    { en: 'apologise', vi: 'xin lỗi', pos: 'v', ipa: 'əˈpɒlədʒaɪz', example: 'We apologise for the inconvenience.' },
    { en: 'encourage', vi: 'khuyến khích', pos: 'v', ipa: 'ɪnˈkʌrɪdʒ', example: 'We encourage early registration.' },
    { en: 'remind', vi: 'nhắc nhở', pos: 'v', ipa: 'rɪˈmaɪnd', example: 'This is to remind you of the deadline.' },
    { en: 'effective', vi: 'có hiệu lực', pos: 'adj', ipa: 'ɪˈfektɪv', example: 'Effective Monday, working hours will change.' },
    { en: 'current', vi: 'hiện tại', pos: 'adj', ipa: 'ˈkʌrənt', example: 'Please check the current rates.' },
    { en: 'previous', vi: 'trước đây', pos: 'adj', ipa: 'ˈpriːviəs', example: 'See the previous version of the policy.' },
    { en: 'recent', vi: 'gần đây', pos: 'adj', ipa: 'ˈriːsnt', example: 'In a recent survey, customers praised our service.' },
    { en: 'ongoing', vi: 'đang diễn ra', pos: 'adj', ipa: 'ˈɒnɡəʊɪŋ', example: 'The renovation is ongoing.' },
    { en: 'temporary', vi: 'tạm thời', pos: 'adj', ipa: 'ˈtemprəri', example: 'This is a temporary solution.', ant: ['permanent'] },
    { en: 'permanent', vi: 'lâu dài', pos: 'adj', ipa: 'ˈpɜːmənənt', example: 'We are offering permanent positions.', ant: ['temporary'] },
    { en: 'in the meantime', vi: 'trong thời gian chờ', pos: 'phr', ipa: 'ɪn ðə ˈmiːntaɪm', example: "In the meantime, please check your email." },
    { en: 'further', vi: 'thêm nữa', pos: 'adj', ipa: 'ˈfɜːðə', example: 'For further information, visit our site.' },
  ]);

  // ---- 2024 edition ----
  TOEIC.setPart('2024', 'part6', 'keywords', [
    { en: 'similarly', vi: 'tương tự', pos: 'adv', ipa: 'ˈsɪmələli', example: 'Similarly, the European office grew.' },
    { en: 'likewise', vi: 'cũng vậy', pos: 'adv', ipa: 'ˈlaɪkwaɪz', example: 'Likewise, support tickets dropped.' },
    { en: 'consequently', vi: 'kết quả là', pos: 'adv', ipa: 'ˈkɒnsɪkwəntli', example: 'Supply was limited; consequently, prices rose.' },
    { en: 'on the other hand', vi: 'mặt khác', pos: 'phr', ipa: 'ɒn ði ˈʌðə hænd', example: 'On the other hand, costs were lower.' },
    { en: 'to this end', vi: 'với mục đích đó', pos: 'phr', ipa: 'tə ðɪs end', example: 'To this end, new policies will be introduced.' },
    { en: 'in fact', vi: 'thực tế', pos: 'phr', ipa: 'ɪn fækt', example: 'In fact, the results exceeded our targets.' },
    { en: 'in particular', vi: 'nói riêng', pos: 'phr', ipa: 'ɪn pəˈtɪkjələ', example: 'In particular, the new feature drew praise.' },
    { en: 'to summarise', vi: 'tóm lại', pos: 'phr', ipa: 'tə ˈsʌməraɪz', example: 'To summarise, three actions are required.' },
    { en: 'by contrast', vi: 'trái lại', pos: 'phr', ipa: 'baɪ ˈkɒntrɑːst', example: 'By contrast, the previous plan failed.' },
    { en: 'with regard to', vi: 'về vấn đề', pos: 'phr', ipa: 'wɪð rɪˈɡɑːd tuː', example: 'With regard to your request, we are reviewing it.' },
  ]);
  TOEIC.setPart('2024', 'part6', 'highFreq', [
    { en: 'correspondence', vi: 'thư từ', pos: 'n', ipa: 'ˌkɒrəˈspɒndəns', example: 'Please keep all correspondence on file.' },
    { en: 'recipient', vi: 'người nhận', pos: 'n', ipa: 'rɪˈsɪpiənt', example: 'The recipient should reply within 48 hours.' },
    { en: 'request', vi: 'yêu cầu', pos: 'n', ipa: 'rɪˈkwest', example: 'We received your request yesterday.' },
    { en: 'response', vi: 'phản hồi', pos: 'n', ipa: 'rɪˈspɒns', example: 'A prompt response is appreciated.' },
    { en: 'feedback', vi: 'phản hồi', pos: 'n', ipa: 'ˈfiːdbæk', example: 'We welcome your feedback.' },
    { en: 'concern', vi: 'mối quan tâm', pos: 'n', ipa: 'kənˈsɜːn', example: 'Your concerns will be addressed.' },
    { en: 'matter', vi: 'vấn đề', pos: 'n', ipa: 'ˈmætə', example: 'This is an urgent matter.' },
    { en: 'issue', vi: 'vấn đề', pos: 'n', ipa: 'ˈɪʃuː', example: 'We have resolved the billing issue.' },
    { en: 'attention', vi: 'sự chú ý', pos: 'n', ipa: 'əˈtenʃn', example: 'Please give this your immediate attention.' },
    { en: 'arrangement', vi: 'sự sắp xếp', pos: 'n', ipa: 'əˈreɪndʒmənt', example: 'Travel arrangements are being finalised.' },
    { en: 'appointment', vi: 'cuộc hẹn', pos: 'n', ipa: 'əˈpɔɪntmənt', example: 'Your appointment is confirmed.' },
    { en: 'appreciate', vi: 'trân trọng', pos: 'v', ipa: 'əˈpriːʃieɪt', example: 'We deeply appreciate your support.' },
    { en: 'attach', vi: 'đính kèm', pos: 'v', ipa: 'əˈtætʃ', example: 'Please see the attached document.' },
    { en: 'enclose', vi: 'đính kèm (thư)', pos: 'v', ipa: 'ɪnˈkləʊz', example: 'Enclosed is the updated invoice.' },
    { en: 'clarify', vi: 'làm rõ', pos: 'v', ipa: 'ˈklærɪfaɪ', example: 'Could you clarify the terms?' },
    { en: 'confirm', vi: 'xác nhận', pos: 'v', ipa: 'kənˈfɜːm', example: 'Please confirm your attendance.' },
    { en: 'kindly', vi: 'vui lòng', pos: 'adv', ipa: 'ˈkaɪndli', example: 'Kindly respond at your earliest convenience.' },
    { en: 'promptly', vi: 'mau chóng', pos: 'adv', ipa: 'ˈprɒmptli', example: 'We will reply promptly.' },
    { en: 'respectfully', vi: 'trân trọng', pos: 'adv', ipa: 'rɪˈspektfəli', example: 'Respectfully yours.' },
    { en: 'sincerely', vi: 'chân thành', pos: 'adv', ipa: 'sɪnˈsɪəli', example: 'Sincerely, the Management Team.' },
    { en: 'regards', vi: 'lời chào trân trọng', pos: 'n', ipa: 'rɪˈɡɑːdz', example: 'Best regards, Alex.' },
    { en: 'attention-grabbing', vi: 'thu hút sự chú ý', pos: 'adj', ipa: 'əˈtenʃn ˈɡræbɪŋ', example: 'The subject line is attention-grabbing.' },
    { en: 'detailed', vi: 'chi tiết', pos: 'adj', ipa: 'ˈdiːteɪld', example: 'A detailed report is attached.' },
    { en: 'relevant', vi: 'liên quan', pos: 'adj', ipa: 'ˈreləvənt', example: 'Please include only relevant information.' },
    { en: 'timely', vi: 'kịp thời', pos: 'adj', ipa: 'ˈtaɪmli', example: 'Thank you for your timely reply.' },
  ]);

  // ---- 2026 edition ----
  TOEIC.setPart('2026', 'part6', 'keywords', [
    { en: 'at the same time', vi: 'cùng lúc', pos: 'phr', ipa: 'æt ðə seɪm taɪm', example: 'At the same time, new features were launched.' },
    { en: 'given that', vi: 'cho rằng', pos: 'phr', ipa: 'ˈɡɪvn ðæt', example: 'Given that demand is high, we will expand.' },
    { en: 'as such', vi: 'vì vậy', pos: 'phr', ipa: 'əz sʌtʃ', example: 'The proposal is incomplete; as such, it was returned.' },
    { en: 'in response to', vi: 'phản hồi', pos: 'phr', ipa: 'ɪn rɪˈspɒns tuː', example: 'In response to customer feedback, we updated the app.' },
    { en: 'for this reason', vi: 'vì lý do này', pos: 'phr', ipa: 'fə ðɪs ˈriːzn', example: 'For this reason, the meeting was postponed.' },
    { en: 'effective immediately', vi: 'có hiệu lực ngay', pos: 'phr', ipa: 'ɪˈfektɪv ɪˈmiːdiətli', example: 'Effective immediately, the policy is in force.' },
    { en: 'please note that', vi: 'vui lòng lưu ý', pos: 'phr', ipa: 'pliːz nəʊt ðæt', example: 'Please note that the office will be closed.' },
    { en: 'we regret to inform', vi: 'rất tiếc phải báo', pos: 'phr', ipa: 'wiː rɪˈɡret tə ɪnˈfɔːm', example: 'We regret to inform you that your flight is cancelled.' },
    { en: 'as outlined', vi: 'như đã nêu', pos: 'phr', ipa: 'əz ˈaʊtlaɪnd', example: 'As outlined in the memo, a new process begins.' },
    { en: 'on behalf of', vi: 'thay mặt', pos: 'phr', ipa: 'ɒn bɪˈhɑːf əv', example: 'On behalf of the team, thank you.' },
  ]);
  TOEIC.setPart('2026', 'part6', 'highFreq', [
    { en: 'subscriber', vi: 'người đăng ký', pos: 'n', ipa: 'səbˈskraɪbə', example: 'Our subscribers receive weekly updates.' },
    { en: 'newsletter', vi: 'bản tin', pos: 'n', ipa: 'ˈnjuːzletə', example: 'Sign up for our monthly newsletter.' },
    { en: 'headline', vi: 'tiêu đề', pos: 'n', ipa: 'ˈhedlaɪn', example: 'The headline caught my eye.' },
    { en: 'paragraph', vi: 'đoạn văn', pos: 'n', ipa: 'ˈpærəɡrɑːf', example: 'Read the second paragraph carefully.' },
    { en: 'column', vi: 'chuyên mục', pos: 'n', ipa: 'ˈkɒləm', example: 'Her column appears every Sunday.' },
    { en: 'article', vi: 'bài báo', pos: 'n', ipa: 'ˈɑːtɪkl', example: 'This article analyses the trend.' },
    { en: 'brochure', vi: 'tờ rơi quảng cáo', pos: 'n', ipa: 'ˈbrəʊʃə', example: 'A brochure is enclosed for your reference.' },
    { en: 'bulletin', vi: 'bản tin ngắn', pos: 'n', ipa: 'ˈbʊlətɪn', example: 'Check the company bulletin for updates.' },
    { en: 'notice board', vi: 'bảng thông báo', pos: 'n', ipa: 'ˈnəʊtɪs bɔːd', example: 'The notice is on the bulletin board.' },
    { en: 'disclaimer', vi: 'lời miễn trừ', pos: 'n', ipa: 'dɪsˈkleɪmə', example: 'A disclaimer appears at the bottom.' },
    { en: 'footnote', vi: 'chú thích cuối trang', pos: 'n', ipa: 'ˈfʊtnəʊt', example: 'See the footnote for sources.' },
    { en: 'draft', vi: 'bản nháp', pos: 'n', ipa: 'drɑːft', example: 'Please review the draft.' },
    { en: 'revision', vi: 'bản sửa', pos: 'n', ipa: 'rɪˈvɪʒn', example: 'The latest revision fixes the errors.' },
    { en: 'update', vi: 'cập nhật', pos: 'n', ipa: 'ˈʌpdeɪt', example: 'A system update is scheduled for tonight.' },
    { en: 'reminder', vi: 'lời nhắc', pos: 'n', ipa: 'rɪˈmaɪndə', example: 'This is a friendly reminder.' },
    { en: 'welcome', vi: 'chào đón', pos: 'v', ipa: 'ˈwelkəm', example: 'We welcome feedback from subscribers.' },
    { en: 'respond', vi: 'phản hồi', pos: 'v', ipa: 'rɪˈspɒnd', example: 'Kindly respond by Friday.' },
    { en: 'submit', vi: 'gửi, nộp', pos: 'v', ipa: 'səbˈmɪt', example: 'Submit your article for consideration.' },
    { en: 'forward', vi: 'chuyển tiếp', pos: 'v', ipa: 'ˈfɔːwəd', example: 'Please forward this email to your team.' },
    { en: 'announce', vi: 'công bố', pos: 'v', ipa: 'əˈnaʊns', example: 'We are excited to announce a partnership.' },
    { en: 'release', vi: 'công bố, phát hành', pos: 'v', ipa: 'rɪˈliːs', example: 'The report will be released next week.' },
    { en: 'publish', vi: 'xuất bản', pos: 'v', ipa: 'ˈpʌblɪʃ', example: 'The guidelines will be published online.' },
    { en: 'discontinue', vi: 'ngưng', pos: 'v', ipa: 'ˌdɪskənˈtɪnjuː', example: 'This model has been discontinued.', ant: ['continue'] },
    { en: 'replace', vi: 'thay thế', pos: 'v', ipa: 'rɪˈpleɪs', example: 'A newer version will replace it.' },
    { en: 'remove', vi: 'gỡ bỏ', pos: 'v', ipa: 'rɪˈmuːv', example: 'Remove outdated posts from the site.' },
  ]);
})();
