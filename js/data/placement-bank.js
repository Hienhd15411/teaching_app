(function (global) {
  'use strict';

  // Placement test bank + roadmap templates.
  //
  // GRAMMAR: 30 original Part-5-style items (ETS format: one blank, four
  // choices), tiered easy / medium / hard. Written for this app — NOT
  // copied from ETS tests (those are copyrighted). Each has a short
  // Vietnamese explanation for the result review.
  //
  // VOCAB_TIERS: which existing topics count as easy / medium / hard when
  // the vocab section samples 20 words across levels.
  //
  // ROADMAPS: 4-week templates per level. Item types:
  //   topic     → play any mode on that daily topic
  //   toeic     → play any mode on that TOEIC part (edition 2024 default)
  //   interview → run the cabin-crew interview focused on that section
  //   drill     → do a pronunciation drill set (manual tick)

  const GRAMMAR = [
    // ---- easy ----
    { id: 'g01', tier: 'easy', q: 'The meeting ______ at 9 a.m. every Monday.', choices: ['start', 'starts', 'starting', 'started'], answer: 1, explain: 'Chủ ngữ số ít + thói quen (every Monday) → thì hiện tại đơn, động từ thêm -s.' },
    { id: 'g02', tier: 'easy', q: 'Please send the report ______ Friday.', choices: ['in', 'on', 'by', 'at'], answer: 2, explain: '"by + thời điểm" = trước hoặc đúng hạn đó.' },
    { id: 'g03', tier: 'easy', q: 'She ______ to the office by bus yesterday.', choices: ['go', 'goes', 'went', 'gone'], answer: 2, explain: '"yesterday" → quá khứ đơn: went.' },
    { id: 'g04', tier: 'easy', q: 'There are ______ chairs in the conference room.', choices: ['much', 'many', 'a little', 'any'], answer: 1, explain: '"chairs" đếm được, số nhiều → many.' },
    { id: 'g05', tier: 'easy', q: 'Mr. Tran is ______ manager of the sales team.', choices: ['a', 'an', 'the', '—'], answer: 2, explain: 'Chức danh xác định duy nhất của đội → the.' },
    { id: 'g06', tier: 'easy', q: 'We ______ finish the project before the deadline.', choices: ['must', 'musts', 'musting', 'to must'], answer: 0, explain: 'Động từ khuyết thiếu must + động từ nguyên mẫu.' },
    { id: 'g07', tier: 'easy', q: 'The new printer is faster ______ the old one.', choices: ['that', 'than', 'then', 'as'], answer: 1, explain: 'So sánh hơn: faster than.' },
    { id: 'g08', tier: 'easy', q: 'I have worked here ______ 2020.', choices: ['for', 'since', 'from', 'during'], answer: 1, explain: 'since + mốc thời gian; for + khoảng thời gian.' },
    { id: 'g09', tier: 'easy', q: 'Customers can pay ______ cash or credit card.', choices: ['by', 'with', 'in', 'on'], answer: 0, explain: 'pay by cash / by card.' },
    { id: 'g10', tier: 'easy', q: 'The store is open ______ 8 a.m. to 10 p.m.', choices: ['from', 'between', 'since', 'at'], answer: 0, explain: 'from ... to ... = từ ... đến ...' },
    // ---- medium ----
    { id: 'g11', tier: 'medium', q: 'All employees ______ to attend the safety training next week.', choices: ['require', 'required', 'are required', 'requiring'], answer: 2, explain: 'Bị động: are required to + V.' },
    { id: 'g12', tier: 'medium', q: 'The manager asked the staff to work ______ during the busy season.', choices: ['efficient', 'efficiency', 'efficiently', 'more efficient'], answer: 2, explain: 'Bổ nghĩa cho động từ work → trạng từ efficiently.' },
    { id: 'g13', tier: 'medium', q: 'If the shipment ______ late, we will contact the supplier.', choices: ['arrives', 'arrived', 'will arrive', 'arriving'], answer: 0, explain: 'Câu điều kiện loại 1: mệnh đề if dùng hiện tại đơn.' },
    { id: 'g14', tier: 'medium', q: '______ the heavy rain, the flight departed on time.', choices: ['Because', 'Although', 'Despite', 'However'], answer: 2, explain: 'Despite + cụm danh từ; Although + mệnh đề.' },
    { id: 'g15', tier: 'medium', q: 'The company ______ its annual report by the end of March.', choices: ['publishes', 'published', 'will have published', 'is publishing'], answer: 2, explain: '"by the end of March" (tương lai) → tương lai hoàn thành.' },
    { id: 'g16', tier: 'medium', q: 'Ms. Lee, ______ joined us last month, will lead the new project.', choices: ['who', 'whom', 'which', 'whose'], answer: 0, explain: 'Đại từ quan hệ chỉ người, làm chủ ngữ → who.' },
    { id: 'g17', tier: 'medium', q: 'Neither the director ______ the assistants were available.', choices: ['or', 'and', 'nor', 'but'], answer: 2, explain: 'Cặp neither ... nor.' },
    { id: 'g18', tier: 'medium', q: 'The hotel offers a ______ discount to returning guests.', choices: ['generous', 'generously', 'generosity', 'generate'], answer: 0, explain: 'Trước danh từ discount cần tính từ: generous.' },
    { id: 'g19', tier: 'medium', q: 'Passengers ______ seatbelts must remain seated.', choices: ['wear', 'wearing', 'worn', 'wore'], answer: 1, explain: 'Mệnh đề quan hệ rút gọn chủ động → V-ing.' },
    { id: 'g20', tier: 'medium', q: 'The proposal was rejected ______ its high cost.', choices: ['because', 'due to', 'since', 'as'], answer: 1, explain: 'due to + danh từ; because + mệnh đề.' },
    // ---- hard ----
    { id: 'g21', tier: 'hard', q: 'Had the crew ______ the weather report earlier, the delay could have been avoided.', choices: ['check', 'checked', 'checking', 'to check'], answer: 1, explain: 'Đảo ngữ điều kiện loại 3: Had + S + V3.' },
    { id: 'g22', tier: 'hard', q: 'The board insisted that the CEO ______ the merger immediately.', choices: ['approves', 'approved', 'approve', 'approving'], answer: 2, explain: 'insist that + S + V nguyên mẫu (giả định cách).' },
    { id: 'g23', tier: 'hard', q: 'Not until the audit was complete ______ the results.', choices: ['the company announced', 'did the company announce', 'the company did announce', 'announced the company'], answer: 1, explain: 'Đảo ngữ với Not until: did + S + V.' },
    { id: 'g24', tier: 'hard', q: 'The airline\'s revenue, ______ by strong holiday demand, exceeded forecasts.', choices: ['boosting', 'boosted', 'boosts', 'to boost'], answer: 1, explain: 'Mệnh đề rút gọn bị động → V3: boosted by.' },
    { id: 'g25', tier: 'hard', q: 'Applicants must submit ______ documentation to support their claim.', choices: ['sufficient', 'sufficiently', 'sufficiency', 'suffice'], answer: 0, explain: 'Trước danh từ documentation → tính từ sufficient.' },
    { id: 'g26', tier: 'hard', q: '______ of the two proposals was accepted by the committee.', choices: ['None', 'Neither', 'Both', 'Either'], answer: 1, explain: '"of the two" → Neither (không cái nào trong hai).' },
    { id: 'g27', tier: 'hard', q: 'The contract is ______ upon the approval of both parties.', choices: ['contingent', 'contingency', 'contingently', 'contingents'], answer: 0, explain: 'be contingent upon = phụ thuộc vào.' },
    { id: 'g28', tier: 'hard', q: 'Rarely ______ such a well-organized event.', choices: ['we have attended', 'have we attended', 'we attended', 'attended we'], answer: 1, explain: 'Đảo ngữ với trạng từ phủ định Rarely.' },
    { id: 'g29', tier: 'hard', q: 'The consultant recommended ______ the outdated software.', choices: ['replace', 'to replace', 'replacing', 'replaced'], answer: 2, explain: 'recommend + V-ing.' },
    { id: 'g30', tier: 'hard', q: 'By the time the inspector arrived, the crew ______ the safety checks.', choices: ['completed', 'had completed', 'has completed', 'completes'], answer: 1, explain: 'Hành động xảy ra trước một hành động quá khứ khác → quá khứ hoàn thành.' },
  ];

  const VOCAB_TIERS = {
    easy: ['intro_people', 'family_home', 'daily_routines', 'food_restaurants', 'shopping_money', 'weather_leisure', 'body_parts', 'clothes_fashion'],
    medium: ['office_jobs', 'travel_hotels', 'health_feelings', 'city_life', 'transport', 'meetings_phone', 'education', 'customer_service', 'directions_navigation'],
    hard: ['business_actions', 'business_concepts', 'sales_marketing', 'presentations', 'interviews_career', 'money_banking', 'environment_climate'],
  };

  // Level thresholds on the 0-100 composite score.
  const LEVELS = [
    { id: 'A2', min: 0, label: { vi: 'Sơ cấp (A2)', en: 'Elementary (A2)' }, toeic: '350 – 500', icon: '🌱' },
    { id: 'B1', min: 45, label: { vi: 'Trung cấp (B1)', en: 'Intermediate (B1)' }, toeic: '500 – 700', icon: '🌿' },
    { id: 'B2', min: 72, label: { vi: 'Trung cao cấp (B2)', en: 'Upper-intermediate (B2)' }, toeic: '700 – 850+', icon: '🌳' },
  ];

  // Two placement tracks. Each defines what the test samples and how the
  // composite score is weighted; ROADMAPS below are keyed by track.
  const TRACKS = {
    toeic: {
      id: 'toeic', icon: '📝',
      label: { vi: 'Test TOEIC', en: 'TOEIC test' },
      desc: { vi: 'Từ vựng công sở + 15 câu ngữ pháp Part 5 · ra điểm TOEIC ước lượng', en: 'Business vocab + 15 Part-5 grammar items · TOEIC estimate' },
      vocabTiers: { easy: 4, medium: 8, hard: 8 },
      grammar: { easy: 4, medium: 6, hard: 5 },
      speaking: 0,
      weights: { vocab: 0.45, grammar: 0.55, speaking: 0 },
    },
    conversation: {
      id: 'conversation', icon: '💬',
      label: { vi: 'Test Giao tiếp', en: 'Conversation test' },
      desc: { vi: 'Từ vựng đời sống + 5 câu ngữ pháp + 2 câu nói · phần nói chiếm 50%', en: 'Everyday vocab + 5 grammar items + 2 speaking prompts · speaking is 50%' },
      vocabTiers: { easy: 10, medium: 8, hard: 2 },
      grammar: { easy: 3, medium: 2, hard: 0 },
      speaking: 2,
      weights: { vocab: 0.35, grammar: 0.15, speaking: 0.5 },
    },
  };

  // Speaking prompts for the conversation track (scored by the interview
  // engine's content/fluency/pronunciation scorer).
  const SPEAKING_PROMPTS = [
    { id: 'sp_intro', q: 'Tell me about yourself in about 30 seconds.', qVi: 'Giới thiệu bản thân khoảng 30 giây.', bankId: 'self_intro' },
    { id: 'sp_hobby', q: 'What do you like to do in your free time, and why?', qVi: 'Bạn thích làm gì lúc rảnh, vì sao?', bankId: 'life_hobby' },
  ];

  const ROADMAPS = {
    toeic: {
      A2: [
        { title: { vi: 'Tuần 1 · Làm quen Part 1-2', en: 'Week 1 · Parts 1-2 basics' }, items: [
          { type: 'toeic', target: 'part1' }, { type: 'toeic', target: 'part2' },
          { type: 'topic', target: 'office_jobs' }, { type: 'topic', target: 'daily_routines' },
        ] },
        { title: { vi: 'Tuần 2 · Ngữ pháp nền Part 5', en: 'Week 2 · Part 5 grammar basics' }, items: [
          { type: 'toeic', target: 'part5' }, { type: 'topic', target: 'shopping_money' },
          { type: 'toeic', target: 'part2' }, { type: 'topic', target: 'travel_hotels' },
        ] },
        { title: { vi: 'Tuần 3 · Nghe hội thoại ngắn', en: 'Week 3 · Short conversations' }, items: [
          { type: 'toeic', target: 'part3' }, { type: 'toeic', target: 'part1' },
          { type: 'topic', target: 'meetings_phone' }, { type: 'drill', target: 'announce' },
        ] },
        { title: { vi: 'Tuần 4 · Ôn tập & đọc ngắn', en: 'Week 4 · Review & short reading' }, items: [
          { type: 'toeic', target: 'part5' }, { type: 'toeic', target: 'part7' },
          { type: 'topic', target: 'customer_service' }, { type: 'toeic', target: 'part3' },
        ] },
      ],
      B1: [
        { title: { vi: 'Tuần 1 · Part 3-4 & từ vựng công sở', en: 'Week 1 · Parts 3-4 & office vocab' }, items: [
          { type: 'toeic', target: 'part3' }, { type: 'toeic', target: 'part4' },
          { type: 'topic', target: 'office_jobs' }, { type: 'topic', target: 'meetings_phone' },
        ] },
        { title: { vi: 'Tuần 2 · Part 5-6 ngữ pháp', en: 'Week 2 · Parts 5-6 grammar' }, items: [
          { type: 'toeic', target: 'part5' }, { type: 'toeic', target: 'part6' },
          { type: 'topic', target: 'business_actions' }, { type: 'topic', target: 'customer_service' },
        ] },
        { title: { vi: 'Tuần 3 · Đọc hiểu Part 7', en: 'Week 3 · Part 7 reading' }, items: [
          { type: 'toeic', target: 'part7' }, { type: 'topic', target: 'sales_marketing' },
          { type: 'toeic', target: 'part4' }, { type: 'topic', target: 'interviews_career' },
        ] },
        { title: { vi: 'Tuần 4 · Tổng ôn mục tiêu 650+', en: 'Week 4 · Review, target 650+' }, items: [
          { type: 'toeic', target: 'part5' }, { type: 'toeic', target: 'part3' },
          { type: 'toeic', target: 'part7' }, { type: 'topic', target: 'money_banking' },
        ] },
      ],
      B2: [
        { title: { vi: 'Tuần 1 · Ngôn ngữ kinh doanh', en: 'Week 1 · Business language' }, items: [
          { type: 'topic', target: 'business_concepts' }, { type: 'topic', target: 'business_actions' },
          { type: 'toeic', target: 'part5' }, { type: 'toeic', target: 'part6' },
        ] },
        { title: { vi: 'Tuần 2 · Đọc nhanh Part 7', en: 'Week 2 · Part 7 speed reading' }, items: [
          { type: 'toeic', target: 'part7' }, { type: 'topic', target: 'presentations' },
          { type: 'topic', target: 'sales_marketing' }, { type: 'toeic', target: 'part7' },
        ] },
        { title: { vi: 'Tuần 3 · Nghe bài nói dài', en: 'Week 3 · Long talks' }, items: [
          { type: 'toeic', target: 'part4' }, { type: 'toeic', target: 'part3' },
          { type: 'topic', target: 'money_banking' }, { type: 'drill', target: 'announce' },
        ] },
        { title: { vi: 'Tuần 4 · Tổng ôn mục tiêu 800+', en: 'Week 4 · Review, target 800+' }, items: [
          { type: 'toeic', target: 'part5' }, { type: 'toeic', target: 'part6' },
          { type: 'toeic', target: 'part7' }, { type: 'toeic', target: 'part4' },
        ] },
      ],
    },
    conversation: {
      A2: [
        { title: { vi: 'Tuần 1 · Chào hỏi & bản thân', en: 'Week 1 · Greetings & yourself' }, items: [
          { type: 'topic', target: 'intro_people' }, { type: 'topic', target: 'daily_routines' },
          { type: 'drill', target: 'greet' }, { type: 'interview', target: 'warmup' },
        ] },
        { title: { vi: 'Tuần 2 · Ăn uống & mua sắm', en: 'Week 2 · Food & shopping' }, items: [
          { type: 'topic', target: 'food_restaurants' }, { type: 'topic', target: 'shopping_money' },
          { type: 'drill', target: 'service' }, { type: 'topic', target: 'family_home' },
        ] },
        { title: { vi: 'Tuần 3 · Đi lại & sức khoẻ', en: 'Week 3 · Getting around & health' }, items: [
          { type: 'topic', target: 'transport' }, { type: 'topic', target: 'health_feelings' },
          { type: 'topic', target: 'directions_navigation' }, { type: 'interview', target: 'self' },
        ] },
        { title: { vi: 'Tuần 4 · Nói về sở thích', en: 'Week 4 · Talking about hobbies' }, items: [
          { type: 'topic', target: 'weather_leisure' }, { type: 'topic', target: 'hobbies_freetime' },
          { type: 'interview', target: 'life' }, { type: 'drill', target: 'interview' },
        ] },
      ],
      B1: [
        { title: { vi: 'Tuần 1 · Công việc & du lịch', en: 'Week 1 · Work & travel' }, items: [
          { type: 'topic', target: 'office_jobs' }, { type: 'topic', target: 'travel_hotels' },
          { type: 'interview', target: 'self' }, { type: 'drill', target: 'greet' },
        ] },
        { title: { vi: 'Tuần 2 · Giao tiếp xã hội', en: 'Week 2 · Social English' }, items: [
          { type: 'topic', target: 'social_expressions' }, { type: 'topic', target: 'relationships' },
          { type: 'interview', target: 'life' }, { type: 'drill', target: 'service' },
        ] },
        { title: { vi: 'Tuần 3 · Xử lý tình huống', en: 'Week 3 · Handling situations' }, items: [
          { type: 'topic', target: 'customer_service' }, { type: 'topic', target: 'emergencies_safety' },
          { type: 'interview', target: 'situation' }, { type: 'drill', target: 'safety' },
        ] },
        { title: { vi: 'Tuần 4 · Kể chuyện & phỏng vấn', en: 'Week 4 · Storytelling & interviews' }, items: [
          { type: 'topic', target: 'interviews_career' }, { type: 'interview', target: 'star' },
          { type: 'interview', target: 'closing' }, { type: 'drill', target: 'interview' },
        ] },
      ],
      B2: [
        { title: { vi: 'Tuần 1 · Thuyết trình & họp', en: 'Week 1 · Presenting & meetings' }, items: [
          { type: 'topic', target: 'presentations' }, { type: 'topic', target: 'meetings_phone' },
          { type: 'interview', target: 'airline' }, { type: 'drill', target: 'announce' },
        ] },
        { title: { vi: 'Tuần 2 · Tình huống phức tạp', en: 'Week 2 · Complex situations' }, items: [
          { type: 'topic', target: 'business_actions' }, { type: 'interview', target: 'situation' },
          { type: 'topic', target: 'customer_service' }, { type: 'drill', target: 'safety' },
        ] },
        { title: { vi: 'Tuần 3 · Quan điểm & tranh luận', en: 'Week 3 · Opinions & debate' }, items: [
          { type: 'topic', target: 'environment_climate' }, { type: 'topic', target: 'business_concepts' },
          { type: 'interview', target: 'life' }, { type: 'interview', target: 'star' },
        ] },
        { title: { vi: 'Tuần 4 · Phỏng vấn trọn buổi', en: 'Week 4 · Full interview' }, items: [
          { type: 'interview', target: 'warmup' }, { type: 'interview', target: 'self' },
          { type: 'interview', target: 'closing' }, { type: 'drill', target: 'interview' },
        ] },
      ],
    },
  };

  global.PLACEMENT_BANK = { GRAMMAR, VOCAB_TIERS, LEVELS, TRACKS, SPEAKING_PROMPTS, ROADMAPS };
})(window);
