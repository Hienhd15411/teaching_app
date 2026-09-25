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

  const ROADMAPS = {
    A2: [
      { title: { vi: 'Tuần 1 · Nền tảng giao tiếp', en: 'Week 1 · Everyday basics' }, items: [
        { type: 'topic', target: 'intro_people' }, { type: 'topic', target: 'daily_routines' },
        { type: 'topic', target: 'food_restaurants' }, { type: 'toeic', target: 'part1' },
      ] },
      { title: { vi: 'Tuần 2 · Sinh hoạt & mua sắm', en: 'Week 2 · Life & shopping' }, items: [
        { type: 'topic', target: 'family_home' }, { type: 'topic', target: 'shopping_money' },
        { type: 'toeic', target: 'part2' }, { type: 'interview', target: 'warmup' },
      ] },
      { title: { vi: 'Tuần 3 · Đi lại & sức khoẻ', en: 'Week 3 · Getting around & health' }, items: [
        { type: 'topic', target: 'transport' }, { type: 'topic', target: 'health_feelings' },
        { type: 'toeic', target: 'part1' }, { type: 'drill', target: 'greet' },
      ] },
      { title: { vi: 'Tuần 4 · Ôn & tự tin nói', en: 'Week 4 · Review & speak up' }, items: [
        { type: 'topic', target: 'weather_leisure' }, { type: 'toeic', target: 'part2' },
        { type: 'interview', target: 'self' }, { type: 'drill', target: 'service' },
      ] },
    ],
    B1: [
      { title: { vi: 'Tuần 1 · Công sở & du lịch', en: 'Week 1 · Office & travel' }, items: [
        { type: 'topic', target: 'office_jobs' }, { type: 'topic', target: 'travel_hotels' },
        { type: 'toeic', target: 'part3' }, { type: 'interview', target: 'self' },
      ] },
      { title: { vi: 'Tuần 2 · Họp & dịch vụ', en: 'Week 2 · Meetings & service' }, items: [
        { type: 'topic', target: 'meetings_phone' }, { type: 'topic', target: 'customer_service' },
        { type: 'toeic', target: 'part5' }, { type: 'drill', target: 'announce' },
      ] },
      { title: { vi: 'Tuần 3 · Nghe hiểu & tình huống', en: 'Week 3 · Listening & situations' }, items: [
        { type: 'topic', target: 'city_life' }, { type: 'toeic', target: 'part4' },
        { type: 'interview', target: 'situation' }, { type: 'drill', target: 'safety' },
      ] },
      { title: { vi: 'Tuần 4 · Ngữ pháp & hành vi', en: 'Week 4 · Grammar & behaviour' }, items: [
        { type: 'topic', target: 'interviews_career' }, { type: 'toeic', target: 'part5' },
        { type: 'toeic', target: 'part6' }, { type: 'interview', target: 'star' },
      ] },
    ],
    B2: [
      { title: { vi: 'Tuần 1 · Ngôn ngữ kinh doanh', en: 'Week 1 · Business language' }, items: [
        { type: 'topic', target: 'business_actions' }, { type: 'topic', target: 'business_concepts' },
        { type: 'toeic', target: 'part5' }, { type: 'interview', target: 'airline' },
      ] },
      { title: { vi: 'Tuần 2 · Đọc hiểu nâng cao', en: 'Week 2 · Advanced reading' }, items: [
        { type: 'topic', target: 'sales_marketing' }, { type: 'toeic', target: 'part6' },
        { type: 'toeic', target: 'part7' }, { type: 'interview', target: 'situation' },
      ] },
      { title: { vi: 'Tuần 3 · Thuyết trình & phỏng vấn', en: 'Week 3 · Presenting & interviews' }, items: [
        { type: 'topic', target: 'presentations' }, { type: 'toeic', target: 'part4' },
        { type: 'interview', target: 'star' }, { type: 'drill', target: 'interview' },
      ] },
      { title: { vi: 'Tuần 4 · Tổng ôn mục tiêu 800+', en: 'Week 4 · Full review, target 800+' }, items: [
        { type: 'toeic', target: 'part3' }, { type: 'toeic', target: 'part7' },
        { type: 'interview', target: 'closing' }, { type: 'topic', target: 'money_banking' },
      ] },
    ],
  };

  global.PLACEMENT_BANK = { GRAMMAR, VOCAB_TIERS, LEVELS, ROADMAPS };
})(window);
