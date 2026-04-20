(function (global) {
  'use strict';

  const DICT = {
    vi: {
      'nav.topics': 'Chủ đề',
      'nav.progress': 'Tiến độ',
      'nav.toeic': 'TOEIC',
      'toeic.title': 'Luyện TOEIC',
      'toeic.subtitle': 'Từ vựng tần suất cao + từ khoá quyết định đáp án, theo từng Part (1-7).',
      'toeic.chooseEdition': 'Chọn bộ xoay',
      'toeic.choosePart': 'Chọn Part',
      'toeic.editions.2023': 'ETS 2023',
      'toeic.editions.2024': 'ETS 2024',
      'toeic.editions.2026': 'ETS 2026',
      'toeic.group.highFreq': 'Từ tần suất cao',
      'toeic.group.keywords': 'Từ khoá phải nhớ',
      'toeic.group.highFreqDesc': 'Các từ và cụm xuất hiện nhiều trong part này.',
      'toeic.group.keywordsDesc': 'Từ quyết định đáp án — bắt buộc phải hiểu nghĩa.',
      'toeic.wordsInGroup': 'từ',
      'toeic.sourceNote': 'Nội dung được tổng hợp từ tài liệu TOEIC công khai, không phải trích nguyên đề ETS.',
      'footer.made': 'Dành cho người học tiếng Anh giao tiếp',

      'profile.title': 'Chào mừng!',
      'profile.tagline': 'Chọn hoặc tạo hồ sơ để bắt đầu hành trình học từ vựng.',
      'profile.createNew': 'Tạo hồ sơ mới',
      'profile.namePlaceholder': 'Tên học viên (VD: An, Bình)',
      'profile.save': 'Tạo hồ sơ',
      'profile.cancel': 'Huỷ',
      'profile.pickAvatar': 'Chọn avatar',
      'profile.confirmDelete': 'Xoá hồ sơ này cùng toàn bộ tiến độ?',
      'profile.emptyName': 'Vui lòng nhập tên.',

      'topics.title': 'Chọn chủ đề',
      'topics.subtitle': 'Từ vựng theo từng chủ đề giao tiếp thường gặp.',
      'topics.wordsCount': 'từ',
      'topics.mastered': 'đã thạo',

      'topic.back': '← Quay lại',
      'topic.chooseMode': 'Chọn kiểu chơi',
      'topic.allWords': 'Danh sách từ',

      'mode.flashcard': 'Flashcard',
      'mode.flashcardDesc': 'Lật thẻ, tự đánh giá mức nhớ. Hệ thống lặp lại cách quãng.',
      'mode.quiz': 'Trắc nghiệm',
      'mode.quizDesc': '4 đáp án, tính combo & bonus.',
      'mode.typing': 'Gõ từ',
      'mode.typingDesc': 'Xem nghĩa tiếng Việt, gõ từ tiếng Anh. Rèn spelling.',
      'mode.matching': 'Nối cặp',
      'mode.matchingDesc': 'Nối từ tiếng Anh với nghĩa tiếng Việt nhanh nhất.',
      'mode.speaking': 'Đọc & Chấm',
      'mode.speakingDesc': 'Nhìn Việt + IPA, đọc từ tiếng Anh, Chrome chấm phát âm.',

      'game.back': 'Thoát',
      'game.next': 'Tiếp',
      'game.submit': 'Kiểm tra',
      'game.score': 'Điểm',
      'game.correct': 'Đúng',
      'game.wrong': 'Sai',
      'game.combo': 'Combo',
      'game.again': 'Chưa nhớ',
      'game.good': 'Khá',
      'game.easy': 'Dễ',
      'game.tapToFlip': 'Chạm để lật thẻ',
      'game.typingPlaceholder': 'Gõ từ tiếng Anh...',
      'game.answerCorrect': '✓ Chính xác!',
      'game.answerWrong': '✗ Đáp án: ',
      'game.matchingHint': 'Nối từ tiếng Anh với nghĩa tiếng Việt.',
      'game.showAnswer': 'Xem đáp án',
      'game.typingHintPos': 'loại từ',
      'word.letters': 'chữ cái',
      'game.meaning': 'Nghĩa',
      'word.listenAgain': 'Nghe lại',
      'game.tapToSpeak': '🎤 Chạm để nói',
      'game.listening': '🎙️ Đang nghe...',
      'game.heardYou': 'Hệ thống nghe được',
      'game.noSpeechHeard': 'Không nghe được gì. Thử lại nhé.',
      'game.speakingExact': '✓ Phát âm chuẩn!',
      'game.speakingClose': '≈ Gần đúng rồi!',
      'game.speakingWrong': '✗ Chưa đúng. Nghe lại rồi thử lại.',
      'game.speakingError': 'Có lỗi khi nhận diện giọng nói.',
      'game.speakingNotSupported': 'Trình duyệt chưa hỗ trợ đọc-chấm',
      'game.speakingUseChrome': 'Hãy mở bằng Google Chrome hoặc Microsoft Edge để dùng tính năng này.',
      'game.micNotAllowed': 'Cần cho phép micro. Vào cài đặt trình duyệt để cấp quyền.',
      'game.micNotFound': 'Không tìm thấy micro. Kiểm tra thiết bị.',
      'game.tryAgain': 'Thử lại',
      'word.synonym': 'Đồng nghĩa',
      'word.antonym': 'Trái nghĩa',
      'word.example': 'Ví dụ',
      'word.ipa': 'Phát âm',
      'word.listen': 'Nghe phát âm',
      'word.audioNotSupported': 'Trình duyệt không hỗ trợ phát âm tự động.',

      'result.title': 'Hoàn thành!',
      'result.accuracy': 'Độ chính xác',
      'result.xpEarned': 'XP nhận',
      'result.time': 'Thời gian',
      'result.bestCombo': 'Combo cao nhất',
      'result.playAgain': 'Chơi lại',
      'result.backToTopics': 'Về chủ đề',
      'result.newBadges': 'Huy hiệu mới',

      'progress.title': 'Tiến độ của tôi',
      'progress.level': 'Cấp',
      'progress.xp': 'XP',
      'progress.streak': 'Chuỗi ngày',
      'progress.wordsLearned': 'Từ đã gặp',
      'progress.wordsMastered': 'Từ đã thạo',
      'progress.byTopic': 'Tiến độ theo chủ đề',
      'progress.history': 'Hoạt động 30 ngày',
      'progress.badges': 'Huy hiệu',
      'progress.export': 'Xuất dữ liệu',
      'progress.import': 'Nhập dữ liệu',
      'progress.empty': 'Chưa có dữ liệu. Hãy bắt đầu chơi một chủ đề!',
      'progress.days': 'ngày',
      'progress.reviewWrong': 'Ôn từ sai',
      'progress.noTopicsPlayed': 'Chưa có chủ đề nào được chơi. Hãy mở tab Chủ đề để bắt đầu.',
      'progress.toReview': 'Từ cần ôn',
      'progress.noWordsToReview': 'Tất cả từ đều ổn! 🎉 Hãy khám phá thêm chủ đề mới.',
      'progress.attempts': 'Lượt chơi',
      'progress.lastPlayed': 'Lần cuối',
      'progress.topicCol': 'Chủ đề',
      'progress.masteryCol': 'Thạo',
      'progress.accuracyCol': 'Đúng',

      'grammar.soon': 'Phần ngữ pháp đang được xây dựng. Hẹn gặp lại!',

      'badge.firstWord': 'Từ đầu tiên',
      'badge.words100': '100 từ',
      'badge.streak3': 'Chuỗi 3 ngày',
      'badge.streak7': 'Chuỗi 7 ngày',
      'badge.streak30': 'Chuỗi 30 ngày',
      'badge.topicMaster': 'Bậc thầy chủ đề',
      'badge.flashcardFirst': 'Flashcard đầu tiên',
      'badge.quizFirst': 'Quiz đầu tiên',
      'badge.typingFirst': 'Gõ từ đầu tiên',
      'badge.matchingFirst': 'Nối cặp đầu tiên',
    },
    en: {
      'nav.topics': 'Topics',
      'nav.progress': 'Progress',
      'nav.toeic': 'TOEIC',
      'toeic.title': 'TOEIC Practice',
      'toeic.subtitle': 'High-frequency words and decisive keywords, organized by Part (1-7).',
      'toeic.chooseEdition': 'Choose edition',
      'toeic.choosePart': 'Choose a Part',
      'toeic.editions.2023': 'ETS 2023',
      'toeic.editions.2024': 'ETS 2024',
      'toeic.editions.2026': 'ETS 2026',
      'toeic.group.highFreq': 'High-frequency',
      'toeic.group.keywords': 'Must-know keywords',
      'toeic.group.highFreqDesc': 'Words and collocations that appear often in this part.',
      'toeic.group.keywordsDesc': 'Decisive trigger words — knowing their meaning is essential.',
      'toeic.wordsInGroup': 'words',
      'toeic.sourceNote': 'Curated from public TOEIC preparation materials; not a reproduction of any ETS test.',
      'footer.made': 'Made for English conversation learners',

      'profile.title': 'Welcome!',
      'profile.tagline': 'Pick or create a profile to start your vocabulary journey.',
      'profile.createNew': 'Create new profile',
      'profile.namePlaceholder': 'Your name (e.g. Alex)',
      'profile.save': 'Create profile',
      'profile.cancel': 'Cancel',
      'profile.pickAvatar': 'Pick an avatar',
      'profile.confirmDelete': 'Delete this profile and all its progress?',
      'profile.emptyName': 'Please enter a name.',

      'topics.title': 'Choose a topic',
      'topics.subtitle': 'Vocabulary by common conversation themes.',
      'topics.wordsCount': 'words',
      'topics.mastered': 'mastered',

      'topic.back': '← Back',
      'topic.chooseMode': 'Choose a game mode',
      'topic.allWords': 'All words',

      'mode.flashcard': 'Flashcards',
      'mode.flashcardDesc': 'Flip cards, rate yourself. Spaced repetition under the hood.',
      'mode.quiz': 'Multiple choice',
      'mode.quizDesc': '4 options, combo & bonus points.',
      'mode.typing': 'Typing',
      'mode.typingDesc': 'See the meaning, type the English word. Drills spelling.',
      'mode.matching': 'Matching',
      'mode.matchingDesc': 'Match English words with Vietnamese meanings — fast!',
      'mode.speaking': 'Speak & Score',
      'mode.speakingDesc': 'See VI + IPA, read the English aloud, Chrome scores pronunciation.',

      'game.back': 'Exit',
      'game.next': 'Next',
      'game.submit': 'Check',
      'game.score': 'Score',
      'game.correct': 'Correct',
      'game.wrong': 'Wrong',
      'game.combo': 'Combo',
      'game.again': 'Again',
      'game.good': 'Good',
      'game.easy': 'Easy',
      'game.tapToFlip': 'Tap to flip',
      'game.typingPlaceholder': 'Type the English word...',
      'game.answerCorrect': '✓ Correct!',
      'game.answerWrong': '✗ Answer: ',
      'game.matchingHint': 'Match English words with their Vietnamese meanings.',
      'game.showAnswer': 'Show answer',
      'game.typingHintPos': 'part of speech',
      'word.letters': 'letters',
      'game.meaning': 'Meaning',
      'word.listenAgain': 'Listen again',
      'game.tapToSpeak': '🎤 Tap to speak',
      'game.listening': '🎙️ Listening...',
      'game.heardYou': 'We heard',
      'game.noSpeechHeard': "Didn't catch that. Please try again.",
      'game.speakingExact': '✓ Perfect pronunciation!',
      'game.speakingClose': '≈ Close — try once more.',
      'game.speakingWrong': '✗ Not quite. Listen and try again.',
      'game.speakingError': 'Speech recognition error.',
      'game.speakingNotSupported': 'Speak-to-score not supported',
      'game.speakingUseChrome': 'Please open this site in Google Chrome or Microsoft Edge.',
      'game.micNotAllowed': 'Microphone access denied. Please allow it in browser settings.',
      'game.micNotFound': 'No microphone detected. Check your device.',
      'game.tryAgain': 'Try again',
      'word.synonym': 'Synonyms',
      'word.antonym': 'Antonyms',
      'word.example': 'Example',
      'word.ipa': 'Pronunciation',
      'word.listen': 'Listen',
      'word.audioNotSupported': 'Your browser does not support speech synthesis.',

      'result.title': 'Completed!',
      'result.accuracy': 'Accuracy',
      'result.xpEarned': 'XP earned',
      'result.time': 'Time',
      'result.bestCombo': 'Best combo',
      'result.playAgain': 'Play again',
      'result.backToTopics': 'Back to topics',
      'result.newBadges': 'New badges',

      'progress.title': 'My progress',
      'progress.level': 'Level',
      'progress.xp': 'XP',
      'progress.streak': 'Day streak',
      'progress.wordsLearned': 'Words seen',
      'progress.wordsMastered': 'Words mastered',
      'progress.byTopic': 'Progress by topic',
      'progress.history': '30-day activity',
      'progress.badges': 'Badges',
      'progress.export': 'Export data',
      'progress.import': 'Import data',
      'progress.empty': 'No data yet. Start a topic to begin!',
      'progress.days': 'days',
      'progress.reviewWrong': 'Review mistakes',
      'progress.noTopicsPlayed': 'No topic played yet. Open Topics to start.',
      'progress.toReview': 'Words to review',
      'progress.noWordsToReview': 'All words look solid! 🎉 Explore new topics.',
      'progress.attempts': 'Sessions',
      'progress.lastPlayed': 'Last played',
      'progress.topicCol': 'Topic',
      'progress.masteryCol': 'Mastered',
      'progress.accuracyCol': 'Accuracy',

      'grammar.soon': 'Grammar lessons coming soon. Stay tuned!',

      'badge.firstWord': 'First word',
      'badge.words100': '100 words',
      'badge.streak3': '3-day streak',
      'badge.streak7': '7-day streak',
      'badge.streak30': '30-day streak',
      'badge.topicMaster': 'Topic master',
      'badge.flashcardFirst': 'First flashcard',
      'badge.quizFirst': 'First quiz',
      'badge.typingFirst': 'First typing',
      'badge.matchingFirst': 'First matching',
    },
  };

  const LANG_KEY = 'vlt_lang';
  let currentLang = localStorage.getItem(LANG_KEY) || 'vi';

  const listeners = [];

  function t(key) {
    return (DICT[currentLang] && DICT[currentLang][key]) || (DICT.vi && DICT.vi[key]) || key;
  }

  function getLang() { return currentLang; }

  function setLang(lang) {
    if (!DICT[lang]) return;
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyStaticTranslations();
    listeners.forEach((fn) => fn(lang));
  }

  function toggle() {
    setLang(currentLang === 'vi' ? 'en' : 'vi');
  }

  function onChange(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    const label = document.getElementById('langLabel');
    if (label) label.textContent = currentLang.toUpperCase();
  }

  global.I18N = { t, getLang, setLang, toggle, onChange, applyStaticTranslations };
})(window);
