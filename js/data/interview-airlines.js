(function (global) {
  'use strict';

  // Airline dimension for the cabin-crew interview simulator.
  //
  // Adds: airline definitions (signature + facts), a section model, and
  // extra questions (warm-up, airline-knowledge per airline, closing).
  // The core bank in interview-bank.js stays as the shared pool used by
  // every airline.
  //
  // SOURCES (airline facts & interview emphasis — researched, not invented):
  //  - Vietjet: LCC positioning, "flying is fun", young/dynamic; AI video
  //    round + appearance/quick-reaction focus.
  //    skywings.vn, glassdoor.com Vietjet Air cabin crew
  //  - Vietnam Airlines: flag carrier since 1956, SkyTeam, 4-star, lotus
  //    brand; interview values honesty + teamwork, work-abroad readiness.
  //    glassdoor.com Vietnam Airlines, skydreamacademy.com, mytour.vn
  //  - Sun PhuQuoc Airways: Vietnam's first "resort airline", Sun Group,
  //    launched 1 Nov 2025, hub Phu Quoc, premium resort experience, part
  //    of Sun World tourism ecosystem, A321 fleet.
  //    en.wikipedia.org/wiki/Sun_PhuQuoc_Airways,
  //    traveldailynews.asia, media-outreach.com (Sun Group launch)
  //    NOTE: brand-new carrier — its interview *signature* is inferred from
  //    brand positioning (luxury hospitality / Phu Quoc destination
  //    expertise), not from documented interview records.

  if (!global.INTERVIEW_BANK) return;

  const SECTIONS = [
    { id: 'warmup', icon: '🎬', label: { vi: 'Khởi động', en: 'Warm-up' } },
    { id: 'self', icon: '🙋', label: { vi: 'Bản thân & Động lực', en: 'Self & Motivation' } },
    { id: 'airline', icon: '🏢', label: { vi: 'Hiểu biết về hãng', en: 'About the Airline' } },
    { id: 'life', icon: '☕', label: { vi: 'Đời sống & Giao tiếp', en: 'Life & Communication' } },
    { id: 'situation', icon: '✈️', label: { vi: 'Tình huống trên máy bay', en: 'In-flight Situations' } },
    { id: 'star', icon: '⭐', label: { vi: 'Câu hỏi hành vi (STAR)', en: 'Behavioral (STAR)' } },
    { id: 'closing', icon: '🎯', label: { vi: 'Kết thúc', en: 'Closing' } },
  ];

  const AIRLINES = {
    vietjet: {
      id: 'vietjet', icon: '✈️', name: 'Vietjet Air',
      tagline: { vi: 'Trẻ trung · Năng động · "Flying is fun"', en: 'Young · Dynamic · "Flying is fun"' },
      accent: '#e30613',
    },
    vna: {
      id: 'vna', icon: '🪷', name: 'Vietnam Airlines',
      tagline: { vi: 'Hãng quốc gia · Chuẩn mực · Đại sứ văn hóa', en: 'Flag carrier · Refined · Cultural ambassador' },
      accent: '#1a5632',
    },
    sunphuquoc: {
      id: 'sunphuquoc', icon: '🌴', name: 'Sun PhuQuoc Airways',
      tagline: { vi: 'Hãng resort đầu tiên · Nghỉ dưỡng cao cấp · Phú Quốc', en: 'First resort airline · Premium leisure · Phu Quoc' },
      accent: '#f39200',
    },
  };

  // Map existing core-bank questions (which use `cat`) onto sections, with
  // a few id-level overrides so the flow opens and closes naturally.
  const CAT_TO_SECTION = { self: 'self', life: 'life', situation: 'situation', star: 'star' };
  const ID_SECTION_OVERRIDE = {
    self_intro: 'warmup',
    self_hire_you: 'closing',
    self_goal5y: 'closing',
  };
  INTERVIEW_BANK.questions.forEach((q) => {
    q.section = ID_SECTION_OVERRIDE[q.id] || CAT_TO_SECTION[q.cat] || q.cat;
    if (!q.airlines) q.airlines = 'all';
  });

  // ---- extra shared questions (warm-up + closing) ----
  const EXTRA = [
    {
      id: 'warm_smalltalk', section: 'warmup', cat: 'self', airlines: 'all',
      q: 'How are you feeling today, and how did you get here?',
      qVi: 'Hôm nay bạn thấy thế nào, và bạn đến đây bằng cách nào?',
      keywords: ['feel|feeling|good|excited|nervous|fine', 'thank|thanks', 'came|took|drove|bus|grab|motorbike|early'],
      model: 'Thank you for asking. I feel a little nervous but mostly excited — this is a big opportunity for me. I came here early by motorbike to make sure I would not be late, and I used the extra time to relax and prepare myself.',
      minWords: 20,
    },
    {
      id: 'close_questions_for_us', section: 'closing', cat: 'self', airlines: 'all',
      q: 'Do you have any questions for us?',
      qVi: 'Bạn có câu hỏi nào cho chúng tôi không?',
      keywords: ['yes|thank you', 'training|learn', 'team|crew|culture|route|schedule|career|next step', 'thank'],
      model: 'Yes, thank you. I would love to know what the initial training programme is like for new cabin crew, and what qualities your best crew members share. I am also curious about the next steps in this recruitment process. Thank you again for your time today.',
      minWords: 20,
    },
    {
      id: 'close_final_word', section: 'closing', cat: 'self', airlines: 'all',
      q: 'Is there anything else you would like us to know about you?',
      qVi: 'Bạn còn điều gì muốn chúng tôi biết về bạn không?',
      keywords: ['passion|dream|committed|ready|hard-working|learn', 'thank', 'contribute|team|service|opportunity'],
      model: 'I just want to say how much this role means to me. I am a fast learner, I take safety and service seriously, and I am fully committed to growing with your airline for the long term. Thank you for giving me the chance to share my story today.',
      minWords: 20,
    },

    // ===== VIETJET airline-knowledge =====
    {
      id: 'vj_why', section: 'airline', cat: 'self', airlines: ['vietjet'],
      q: 'Vietjet has a young, energetic brand. Why does that fit you?',
      qVi: 'Vietjet có thương hiệu trẻ trung, năng động. Vì sao điều đó hợp với bạn?',
      keywords: ['young|energetic|dynamic|fun|positive|smile', 'fit|match|me too|i am', 'service|customer|team', 'grow|growing|opportunity'],
      model: 'Vietjet is young, fast-growing and full of energy, and that is exactly who I am. I bring a bright smile and a positive attitude, I adapt quickly, and I love an environment where things move fast. Vietjet made flying affordable for millions of Vietnamese, and I would be proud to give those passengers a fun, friendly experience.',
      minWords: 30,
    },
    {
      id: 'vj_know', section: 'airline', cat: 'self', airlines: ['vietjet'],
      q: 'What do you know about Vietjet Air?',
      qVi: 'Bạn biết gì về Vietjet Air?',
      keywords: ['low-cost|budget|affordable|lcc', 'private|first', 'young|dynamic|fun', 'hub|tan son nhat|noi bai|ho chi minh|hanoi', 'international|route|grow', 'a320|a321|airbus'],
      model: 'Vietjet is Vietnam\'s first private low-cost airline, launched in 2011, based mainly at Tan Son Nhat and Noi Bai. It is known for making flying affordable and fun, a young and dynamic brand, and it has grown fast with a modern Airbus A320 and A321 fleet expanding across Asia. Its energetic image is a big part of its identity.',
      minWords: 30,
    },
    {
      id: 'vj_quick', section: 'airline', cat: 'situation', airlines: ['vietjet'],
      q: 'On a busy low-cost flight with a very fast turnaround, how do you keep service quick but still friendly?',
      qVi: 'Trên chuyến bay giá rẻ đông khách, thời gian quay đầu rất nhanh — làm sao phục vụ vừa nhanh vừa thân thiện?',
      keywords: ['fast|quick|efficient|speed', 'smile|friendly|warm|greeting', 'prepare|organized|prioritize', 'team|help|crew', 'safety'],
      model: 'Speed and warmth are not opposites. I prepare the cart and my zone before boarding so service flows without delay, I keep a genuine smile even when moving fast, and I coordinate with my crew so no passenger is left waiting. A quick "hello, how are you?" costs one second but makes the service feel personal, and I never let the fast pace compromise safety checks.',
      minWords: 30,
    },

    // ===== VIETNAM AIRLINES airline-knowledge =====
    {
      id: 'vna_why', section: 'airline', cat: 'self', airlines: ['vna'],
      q: 'Vietnam Airlines is the national flag carrier. What does representing Vietnam mean to you?',
      qVi: 'Vietnam Airlines là hãng hàng không quốc gia. Việc đại diện cho Việt Nam có ý nghĩa gì với bạn?',
      keywords: ['proud|honor|represent|ambassador', 'vietnam|culture|country|national', 'service|professional|refined', 'first impression|image|hospitality'],
      model: 'As the flag carrier, every crew member is an ambassador for Vietnam. For many foreign passengers, we are their first impression of our country. That is an honor and a responsibility: I would represent Vietnamese warmth, refinement and hospitality in how I speak, serve and carry myself. It is more than a job — it is showing the world the best of our culture.',
      minWords: 30,
    },
    {
      id: 'vna_know', section: 'airline', cat: 'self', airlines: ['vna'],
      q: 'What do you know about Vietnam Airlines?',
      qVi: 'Bạn biết gì về Vietnam Airlines?',
      keywords: ['national|flag carrier|1956', 'skyteam', '4-star|four star|quality|refined', 'lotus', 'long-haul|international|a350|787|wide-body', 'hub|noi bai|tan son nhat'],
      model: 'Vietnam Airlines is the national flag carrier, founded in 1956, a SkyTeam member and a certified 4-star airline. Its symbol is the golden lotus, representing Vietnamese elegance. It operates long-haul international routes with modern wide-body aircraft like the Airbus A350 and Boeing 787, hubbed at Noi Bai and Tan Son Nhat. It is known for refined, professional service.',
      minWords: 30,
    },
    {
      id: 'vna_abroad', section: 'airline', cat: 'self', airlines: ['vna'],
      q: 'Our long-haul routes mean days away from home in foreign countries. Are you ready for that?',
      qVi: 'Các chặng bay dài đồng nghĩa nhiều ngày xa nhà ở nước ngoài. Bạn đã sẵn sàng chưa?',
      keywords: ['ready|prepared|yes|understand', 'independent|take care|manage', 'family|support', 'culture|respect|adapt|professional', 'opportunity|experience'],
      model: 'Yes, I am ready and I see it as a privilege. I lived away from home during university, so I know how to take care of myself and stay disciplined. My family fully supports me. Working long-haul means meeting many cultures, and I enjoy adapting respectfully to each one. Rest management and professionalism keep me sharp even far from home.',
      minWords: 30,
    },

    // ===== SUN PHUQUOC airline-knowledge =====
    {
      id: 'sun_why', section: 'airline', cat: 'self', airlines: ['sunphuquoc'],
      q: 'Sun PhuQuoc Airways is Vietnam\'s first resort airline. Why do you want to be part of it?',
      qVi: 'Sun PhuQuoc Airways là hãng resort đầu tiên của Việt Nam. Vì sao bạn muốn tham gia?',
      keywords: ['resort|leisure|premium|luxury|relax', 'phu quoc|island|destination|tourism', 'first|new|pioneer|build', 'hospitality|experience|service', 'proud|excited|opportunity'],
      model: 'I want to help build something new and special. Sun PhuQuoc Airways is Vietnam\'s first resort airline, so the flight itself is part of the holiday, not just transport. I love the idea of creating a relaxing, premium experience from the moment passengers board. Being part of a pioneering brand connected to Phu Quoc\'s world-class resorts is a rare and exciting opportunity.',
      minWords: 30,
    },
    {
      id: 'sun_know', section: 'airline', cat: 'self', airlines: ['sunphuquoc'],
      q: 'What do you know about Sun PhuQuoc Airways?',
      qVi: 'Bạn biết gì về Sun PhuQuoc Airways?',
      keywords: ['sun group|sun world', 'resort airline|first|2025|new', 'phu quoc|hub|island', 'premium|luxury|relax|leisure|experience', 'tourism|ecosystem|connect', 'a321|airbus'],
      model: 'Sun PhuQuoc Airways is Vietnam\'s first resort airline, launched by Sun Group in November 2025, with Phu Quoc as its hub. It is designed to deliver a premium, relaxing travel experience and to connect Phu Quoc with domestic and international travelers as part of Sun Group\'s tourism ecosystem. It started with Airbus A321 aircraft and is expanding its fleet quickly.',
      minWords: 30,
    },
    {
      id: 'sun_premium', section: 'airline', cat: 'situation', airlines: ['sunphuquoc'],
      q: 'A passenger is starting their luxury holiday on your flight. How do you make the onboard experience feel premium and relaxing?',
      qVi: 'Một hành khách bắt đầu kỳ nghỉ dưỡng cao cấp trên chuyến bay của bạn. Làm sao để trải nghiệm trên máy bay sang trọng và thư giãn?',
      keywords: ['welcome|greeting|name|warm', 'anticipate|attentive|detail|personal', 'relax|calm|comfortable|atmosphere', 'premium|special|experience', 'destination|phu quoc|recommend'],
      model: 'The holiday should begin the moment they step on board. I greet them warmly, ideally by name in premium cabins, and set a calm, welcoming tone. I anticipate needs — a drink, a blanket, a quiet word for anyone tired — so service feels effortless and personal. I might share a warm recommendation about Phu Quoc to build excitement. Small, thoughtful details are what make an experience feel truly premium.',
      minWords: 30,
    },
  ];

  EXTRA.forEach((q) => INTERVIEW_BANK.questions.push(q));

  INTERVIEW_BANK.SECTIONS = SECTIONS;
  INTERVIEW_BANK.AIRLINES = AIRLINES;

  // How many questions to draw from each section for one interview.
  INTERVIEW_BANK.SECTION_PLAN = [
    { section: 'warmup', n: 1 },
    { section: 'self', n: 2 },
    { section: 'airline', n: 2 },
    { section: 'life', n: 1 },
    { section: 'situation', n: 2 },
    { section: 'star', n: 1 },
    { section: 'closing', n: 1 },
  ];
})(window);
