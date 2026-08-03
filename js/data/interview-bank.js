(function (global) {
  'use strict';

  // Cabin-crew interview question bank (Vietjet / Vietnam Airlines style).
  //
  // SOURCES — content curated from real interview-process documentation,
  // not invented:
  //  - VNA 5-round process & recorded questions (English 1-1, situational):
  //    mytour.vn/en/blog/bai-viet/new-insights-into-vietnam-airlines-flight-attendants.html
  //    skydreamacademy.com/quy-trinh-thi-tuyen-tiep-vien-hang-khong-vietnam-airlines-format-thi-tuyen/
  //    glassdoor.com Vietnam Airlines Flight Attendant interview questions
  //  - Vietjet AI-video-interview round + in-person round:
  //    skywings.vn/quy-trinh-thi-tiep-vien-hang-khong-vietjet-air/
  //    glassdoor.com Vietjet Air Cabin Crew interview questions
  //  - Standard in-flight situations & SOP-style answers:
  //    indeed.com/hire/interview-questions/cabin-crew,
  //    vervecopilot.com top-30 cabin-crew questions,
  //    airlinecareer.com flight-attendant STAR interview questions
  //
  // Schema per question:
  //   id        unique string
  //   cat       'self' | 'life' | 'situation' | 'star'
  //   q         English question (asked aloud via TTS + shown)
  //   qVi       Vietnamese gloss shown as a hint
  //   keywords  content words the answer is scored against
  //   follow    { triggerKeyword: { q, keywords } } — asked when the
  //             student's answer contains triggerKeyword
  //   model     model answer for after-answer review
  //   minWords  fluency target (default 25)

  const B = [];

  // ============ 🙋 SELF & MOTIVATION ============
  B.push(
    {
      id: 'self_intro', cat: 'self',
      q: 'Tell me about yourself.',
      qVi: 'Giới thiệu về bản thân bạn.',
      keywords: ['name', 'years old', 'graduated', 'study', 'experience', 'personality', 'passion', 'customer'],
      follow: {
        experience: { q: 'Tell me more about your work experience. What did you learn from it?', keywords: ['learned', 'customer', 'skill', 'team', 'responsible'] },
        travel: { q: 'You mentioned travelling. What was the most memorable place you have visited?', keywords: ['because', 'people', 'culture', 'food', 'beautiful'] },
        team: { q: 'You mentioned teamwork. What role do you usually take in a team?', keywords: ['leader', 'support', 'listen', 'organize', 'help'] },
      },
      model: 'Good morning. My name is Lan, I am 22 years old and I graduated from Hanoi University with a degree in English. I have two years of experience as a restaurant hostess, where I learned how to stay calm and friendly with all kinds of customers. People describe me as cheerful, careful and hard-working. Becoming a cabin crew member has been my dream because I love taking care of people and I enjoy travelling.',
      minWords: 40,
    },
    {
      id: 'self_three_words', cat: 'self',
      q: 'Describe yourself in three words and explain why.',
      qVi: 'Mô tả bản thân bằng 3 từ và giải thích.',
      keywords: ['friendly', 'patient', 'responsible', 'careful', 'positive', 'because', 'example'],
      follow: {
        patient: { q: 'Give me an example of a time your patience was tested.', keywords: ['situation', 'customer', 'stayed calm', 'result'] },
      },
      model: 'I would describe myself as friendly, patient and responsible. Friendly because I smile easily and people feel comfortable around me. Patient because in my part-time job I served many difficult customers without losing my temper. And responsible because I always finish what I start — my manager trusted me to close the store every weekend.',
      minWords: 30,
    },
    {
      id: 'self_why_fa', cat: 'self',
      q: 'Why do you want to become a flight attendant?',
      qVi: 'Vì sao bạn muốn trở thành tiếp viên hàng không?',
      keywords: ['passion', 'service', 'travel', 'people', 'challenge', 'dream', 'care'],
      follow: {
        travel: { q: 'But flying is hard work, not tourism. How would you handle a 14-hour duty day?', keywords: ['rest', 'prepare', 'health', 'professional', 'energy'] },
      },
      model: 'I want this job because I truly enjoy taking care of people. In my current job, the happiest moment of my day is when a customer leaves with a smile. Being a flight attendant lets me combine that passion for service with my love of new places and new people. I also want a career that challenges me to stay calm, professional and safe under pressure.',
      minWords: 35,
    },
    {
      id: 'self_why_airline', cat: 'self',
      q: 'Why do you want to work for our airline?',
      qVi: 'Vì sao bạn chọn hãng của chúng tôi?',
      keywords: ['brand', 'young', 'professional', 'growth', 'route', 'service', 'values', 'proud'],
      model: 'I chose your airline because it is growing fast and it gives young people real opportunities. I have flown with you several times and the crew always looked professional and warm at the same time. I want to be part of a team that represents Vietnam to millions of passengers, and I believe my service mindset matches your culture.',
      minWords: 30,
    },
    {
      id: 'self_strength', cat: 'self',
      q: 'What is your greatest strength?',
      qVi: 'Điểm mạnh lớn nhất của bạn là gì?',
      keywords: ['communication', 'calm', 'service', 'example', 'team', 'language'],
      model: 'My greatest strength is staying calm under pressure. Last year during a big promotion event, our store was overloaded and a customer shouted at me about waiting time. I kept my voice soft, apologized, gave her a clear time estimate and a small voucher. She calmed down and even thanked me later. I believe this calmness is essential in the cabin.',
      minWords: 30,
    },
    {
      id: 'self_weakness', cat: 'self',
      q: 'What is your weakness and what are you doing about it?',
      qVi: 'Điểm yếu của bạn và bạn đang khắc phục thế nào?',
      keywords: ['improve', 'learning', 'practice', 'better', 'feedback'],
      model: 'My weakness used to be saying yes to too many tasks at once, which sometimes made me rush. I am fixing it by planning my day each morning and asking my team for help earlier instead of at the last minute. My manager noticed I have become much more organized in the past six months.',
      minWords: 30,
    },
    {
      id: 'self_hire_you', cat: 'self',
      q: 'Why should we hire you instead of other candidates?',
      qVi: 'Vì sao chúng tôi nên chọn bạn thay vì ứng viên khác?',
      keywords: ['service', 'experience', 'attitude', 'learn', 'team', 'passenger', 'safety'],
      model: 'Many candidates have good English and a nice smile — what I add is real service experience under pressure and a safety-first attitude. I have handled angry customers, long shifts and emergencies at my restaurant job. I learn fast, I follow procedures seriously, and passengers will feel both safe and welcome with me.',
      minWords: 30,
    },
    {
      id: 'self_role_knowledge', cat: 'self',
      q: 'What do you think a flight attendant actually does? Is it just serving food?',
      qVi: 'Bạn nghĩ tiếp viên hàng không thực sự làm gì? Có phải chỉ phục vụ đồ ăn?',
      keywords: ['safety', 'first', 'security', 'emergency', 'service', 'procedure', 'passenger', 'comfort'],
      model: 'Serving meals is only the visible part. The first responsibility of a flight attendant is safety: checking equipment before the flight, demonstrating safety procedures, securing the cabin, and being ready to manage emergencies like fire, decompression or evacuation. Service and comfort matter, but they always come after safety.',
      minWords: 30,
    },
    {
      id: 'self_goal5y', cat: 'self',
      q: 'Where do you see yourself in five years?',
      qVi: 'Bạn thấy mình ở đâu sau 5 năm nữa?',
      keywords: ['senior', 'purser', 'experience', 'grow', 'train', 'improve'],
      model: 'In five years I hope to be a senior cabin crew member, maybe preparing to become a purser. I want to master the safety procedures, improve my Japanese as a third language, and help train new crew members the way seniors will train me.',
      minWords: 25,
    },
    {
      id: 'self_far_from_home', cat: 'self',
      q: 'This job means being away from your family many days each month. How do you feel about that?',
      qVi: 'Công việc này phải xa gia đình nhiều ngày mỗi tháng. Bạn nghĩ sao?',
      keywords: ['understand', 'family', 'support', 'prepared', 'balance', 'call'],
      model: 'I have discussed this with my family and they fully support my dream. I already lived away from home during university, so I know how to take care of myself. I will keep in touch with video calls, and honestly, the irregular schedule also gives me free weekdays to visit them when others are working.',
      minWords: 25,
    },
    {
      id: 'self_first_impression', cat: 'self',
      q: 'How important is appearance and grooming for a flight attendant?',
      qVi: 'Ngoại hình và tác phong quan trọng thế nào với tiếp viên?',
      keywords: ['professional', 'first impression', 'trust', 'uniform', 'standard', 'represent'],
      model: 'Very important — the crew is the face of the airline. A neat uniform and professional grooming create the first impression and build passenger trust, especially in an emergency when people look to us for confidence. But real professionalism is grooming plus attitude: a warm smile and respectful manner complete the picture.',
      minWords: 25,
    },
    {
      id: 'self_toeic', cat: 'self',
      q: 'How do you keep improving your English?',
      qVi: 'Bạn duy trì và cải thiện tiếng Anh thế nào?',
      keywords: ['practice', 'every day', 'listening', 'speaking', 'app', 'movies', 'course'],
      model: 'I practice a little every day instead of cramming. I listen to aviation podcasts on my commute, shadow English announcements, and use a vocabulary app my teacher gave us to review words with spaced repetition. Once a week I join a speaking club to practice real conversation.',
      minWords: 25,
    }
  );

  // ============ ☕ LIFE & OPINIONS ============
  B.push(
    {
      id: 'life_hobby', cat: 'life',
      q: 'What do you like to do in your free time?',
      qVi: 'Bạn thích làm gì lúc rảnh?',
      keywords: ['enjoy', 'relax', 'because', 'friends', 'learn', 'health'],
      follow: {
        cook: { q: 'You like cooking! If a passenger asked you to recommend a Vietnamese dish, what would you say?', keywords: ['pho', 'recommend', 'taste', 'famous', 'try'] },
        read: { q: 'What was the last book you read, and what did it teach you?', keywords: ['book', 'learned', 'author', 'story'] },
        sport: { q: 'How does playing sport help you in work life?', keywords: ['team', 'discipline', 'health', 'energy', 'goal'] },
      },
      model: 'In my free time I love cooking and jogging. Cooking relaxes me and makes my family happy — my specialty is bún chả. Jogging keeps me healthy and gives me energy for long working days. On weekends I also join an English speaking club to meet new people.',
      minWords: 25,
    },
    {
      id: 'life_stress', cat: 'life',
      q: 'How do you handle stress?',
      qVi: 'Bạn xử lý căng thẳng thế nào?',
      keywords: ['breathe', 'calm', 'exercise', 'plan', 'positive', 'talk', 'rest'],
      model: 'First I take a slow breath and remind myself that panic never solves anything. Then I break the problem into small steps and start with the most urgent one. After work I release stress by jogging or talking with my best friend. This routine kept me steady even during exam season and busy sale events at my job.',
      minWords: 25,
    },
    {
      id: 'life_team_alone', cat: 'life',
      q: 'Do you prefer working in a team or working alone?',
      qVi: 'Bạn thích làm việc nhóm hay làm một mình?',
      keywords: ['team', 'communicate', 'support', 'share', 'flexible', 'both'],
      model: 'I can do both, but I prefer a team, and cabin crew is the ultimate team job. On board, every task — boarding, service, safety checks — depends on clear communication between crew members. I like sharing information early, asking for help when needed, and supporting whoever is overloaded.',
      minWords: 25,
    },
    {
      id: 'life_criticism', cat: 'life',
      q: 'How do you react when someone criticizes you?',
      qVi: 'Bạn phản ứng thế nào khi bị phê bình?',
      keywords: ['listen', 'thank', 'improve', 'calm', 'feedback', 'learn'],
      model: 'I listen first without interrupting, because criticism usually contains something useful. If it is fair, I thank the person and fix the issue. If I think it is a misunderstanding, I explain my side politely after they finish. My previous manager said I was one of the easiest staff to coach because I never take feedback personally.',
      minWords: 25,
    },
    {
      id: 'life_new_city', cat: 'life',
      q: 'If you had 24 hours in a city you have never visited, what would you do?',
      qVi: 'Nếu có 24 giờ ở một thành phố chưa từng đến, bạn sẽ làm gì?',
      keywords: ['explore', 'food', 'local', 'walk', 'museum', 'people', 'plan'],
      model: 'I would start early with a walk through the local market to taste street food and watch daily life — that tells you more about a city than any museum. Then one famous landmark, lunch at a place full of locals, and in the evening I would find a viewpoint to watch the sunset. I always talk to local people; they give the best recommendations.',
      minWords: 25,
    },
    {
      id: 'life_difficult_people', cat: 'life',
      q: 'Have you ever worked with someone difficult? How did you manage?',
      qVi: 'Bạn từng làm việc với người khó tính chưa? Xử lý thế nào?',
      keywords: ['listen', 'respect', 'understand', 'communicate', 'compromise', 'result'],
      model: 'Yes — a colleague at my old job who criticized everything loudly. Instead of avoiding her, I asked her to teach me her way of arranging the stock room, which she was genuinely good at. Once she felt respected, she became much easier to work with. I learned that difficult people often just want to be heard.',
      minWords: 25,
    },
    {
      id: 'life_routine', cat: 'life',
      q: 'Describe your typical day.',
      qVi: 'Mô tả một ngày điển hình của bạn.',
      keywords: ['morning', 'work', 'study', 'exercise', 'evening', 'prepare'],
      model: 'I wake up at six, exercise for thirty minutes and prepare a simple breakfast. In the morning I study English, then I work my shift from noon to eight. Before bed I review new vocabulary and prepare my clothes and plan for tomorrow — I like starting the day already organized.',
      minWords: 25,
    },
    {
      id: 'life_service_meaning', cat: 'life',
      q: 'What does good customer service mean to you?',
      qVi: 'Dịch vụ khách hàng tốt nghĩa là gì với bạn?',
      keywords: ['listen', 'anticipate', 'smile', 'respect', 'solve', 'exceed', 'need'],
      follow: {
        anticipate: { q: 'Give me an example of anticipating a need before the customer asked.', keywords: ['noticed', 'before', 'offered', 'happy'] },
      },
      model: 'Good service is noticing what people need before they ask. A smile and politeness are the basics; the real skill is reading small signals — a cold passenger, a nervous flyer, a tired parent — and acting first. It also means solving problems without making the customer feel guilty for having them.',
      minWords: 25,
    },
    {
      id: 'life_uniform_pride', cat: 'life',
      q: 'Some people say this job is just a waitress in the sky. What would you tell them?',
      qVi: 'Có người nói nghề này chỉ là bồi bàn trên trời. Bạn trả lời sao?',
      keywords: ['safety', 'trained', 'emergency', 'first aid', 'professional', 'respect', 'proud'],
      model: 'I would smile and explain that cabin crew are trained safety professionals. We study evacuation, fire fighting, first aid and security procedures, and we are legally responsible for passenger safety. The service part is real, but if an emergency happens at 10,000 meters, the "waitress" becomes the person who saves your life.',
      minWords: 25,
    },
    {
      id: 'life_learn_fail', cat: 'life',
      q: 'Tell me about a failure and what you learned from it.',
      qVi: 'Kể về một lần thất bại và bài học rút ra.',
      keywords: ['mistake', 'learned', 'improve', 'responsibility', 'changed', 'result'],
      model: 'In my first month at work I promised a customer a delivery date without checking stock, and we missed it. I called to apologize personally, arranged priority shipping, and the customer stayed with us. Since then I never promise anything I have not verified — accuracy is kindness in disguise.',
      minWords: 25,
    }
  );

  // ============ ✈️ IN-FLIGHT SITUATIONS ============
  // SOP-style expectations distilled from cabin-crew interview guides:
  // stay calm → listen/empathize → follow procedure → involve crew →
  // escalate to captain when needed → keep other passengers safe/informed.
  B.push(
    {
      id: 'sit_unruly', cat: 'situation',
      q: 'A passenger is behaving aggressively and disturbing others. What do you do?',
      qVi: 'Một hành khách cư xử hung hăng, làm phiền người khác. Bạn xử lý thế nào?',
      keywords: ['calm', 'listen', 'reason', 'politely', 'solution', 'crew', 'report', 'captain', 'safety'],
      follow: {
        captain: { q: 'What happens after you report to the captain? What can the captain decide?', keywords: ['authority', 'warning', 'restrain', 'divert', 'police'] },
        calm: { q: 'And if the passenger still refuses to calm down after your first attempt?', keywords: ['crew', 'senior', 'warning', 'report', 'captain'] },
      },
      model: 'First I stay calm and approach politely, asking the reason for their frustration — many problems shrink when people feel heard. I apologize for any inconvenience and offer a solution within our procedures. If the behavior continues, I alert my senior crew so we handle it together, and as a last resort we report to the captain, who has legal authority to issue warnings or arrange authorities on landing. Throughout, my priority is the safety and comfort of the other passengers.',
      minWords: 40,
    },
    {
      id: 'sit_seat_dispute', cat: 'situation',
      q: 'Two passengers are arguing over the same seat. How do you resolve it?',
      qVi: 'Hai hành khách cãi nhau vì cùng một ghế. Bạn giải quyết thế nào?',
      keywords: ['boarding pass', 'check', 'calm', 'apologize', 'alternative', 'politely', 'both'],
      model: 'I would separate the tension first: greet both passengers politely and ask to see both boarding passes. Usually one has the wrong row or a duplicate seat from a system error. I apologize for the confusion, seat the correct passenger, and find the other an equivalent or better seat, involving the purser if the flight is full. The key is making both feel respected rather than judged.',
      minWords: 35,
    },
    {
      id: 'sit_medical', cat: 'situation',
      q: 'A passenger suddenly loses consciousness during the flight. What are your steps?',
      qVi: 'Một hành khách đột ngột bất tỉnh trong chuyến bay. Các bước của bạn?',
      keywords: ['first aid', 'check', 'breathing', 'crew', 'announce', 'doctor', 'captain', 'oxygen', 'calm'],
      follow: {
        doctor: { q: 'And if no doctor answers the announcement?', keywords: ['first aid', 'training', 'monitor', 'captain', 'divert', 'medlink'] },
      },
      model: 'I would check responsiveness and breathing immediately and call another crew member so one of us informs the purser and captain. We apply our first-aid training — recovery position, oxygen if needed — while making an announcement asking if a medical professional is on board. We keep monitoring vital signs, reassure nearby passengers, and the captain decides with ground medical support whether to divert. Everything is documented after the situation is stable.',
      minWords: 40,
    },
    {
      id: 'sit_turbulence', cat: 'situation',
      q: 'The aircraft hits strong turbulence during meal service. What do you do?',
      qVi: 'Máy bay vào vùng nhiễu động mạnh khi đang phục vụ suất ăn. Bạn làm gì?',
      keywords: ['secure', 'stop', 'seatbelt', 'announce', 'trolley', 'seat', 'calm', 'instruction'],
      model: 'Safety first: I stop the service immediately, secure the trolley and hot liquids, and instruct passengers to return to their seats and fasten seatbelts. If the turbulence is severe, crew must also take the nearest seat and strap in — from there we continue guiding passengers verbally with a calm voice. When the captain releases the seatbelt sign, we check the cabin, help anyone affected, and resume service.',
      minWords: 35,
    },
    {
      id: 'sit_afraid_flyer', cat: 'situation',
      q: 'You notice a passenger who is clearly terrified of flying. How do you help them?',
      qVi: 'Bạn thấy một hành khách rõ ràng đang rất sợ bay. Bạn giúp thế nào?',
      keywords: ['reassure', 'talk', 'explain', 'breathe', 'normal', 'check', 'smile', 'water'],
      model: 'I would kneel to their eye level, introduce myself and reassure them that the sounds and movements they feel are completely normal. I explain what turbulence is in simple words, suggest slow breathing, and offer water. During the flight I check on them regularly so they know someone is watching over them. Small, calm attention changes a terrified passenger into a loyal one.',
      minWords: 35,
    },
    {
      id: 'sit_drunk', cat: 'situation',
      q: 'A passenger appears drunk and keeps asking for more alcohol. What do you do?',
      qVi: 'Một hành khách có vẻ say và liên tục đòi thêm rượu. Bạn xử lý sao?',
      keywords: ['refuse', 'politely', 'water', 'food', 'explain', 'safety', 'crew', 'monitor'],
      model: 'I would politely refuse further alcohol — it is our responsibility and the regulations allow it. I soften the refusal by offering water, juice or a snack instead, and explain it is for their comfort and safety. I inform my colleagues so we all monitor the passenger discreetly, and if the behavior escalates, we follow the unruly-passenger procedure with the senior crew.',
      minWords: 35,
    },
    {
      id: 'sit_crying_baby', cat: 'situation',
      q: 'A baby has been crying for an hour and nearby passengers are complaining. What do you do?',
      qVi: 'Em bé khóc suốt một giờ, khách xung quanh phàn nàn. Bạn làm gì?',
      keywords: ['help', 'parent', 'offer', 'warm', 'milk', 'walk', 'apologize', 'empathy', 'passengers'],
      model: 'I help both sides. For the parent: offer to warm the milk, bring warm water, suggest a walk near the galley if the seatbelt sign is off, and reassure them — a stressed parent makes a stressed baby. For nearby passengers: apologize sincerely, offer earplugs or a seat change if available. Complaining passengers mostly calm down when they see the crew actively helping.',
      minWords: 35,
    },
    {
      id: 'sit_meal_out', cat: 'situation',
      q: 'The meal a passenger pre-ordered is not available. They are upset. How do you handle it?',
      qVi: 'Suất ăn khách đặt trước không còn. Khách bực bội. Bạn xử lý thế nào?',
      keywords: ['apologize', 'sincere', 'alternative', 'offer', 'explain', 'compensate', 'report', 'follow up'],
      model: 'I apologize sincerely without excuses, because the mistake is real for them regardless of the cause. I present every alternative we have — other meals, extra snacks, items from another class if permitted — and let them choose, which returns a feeling of control. I report the case so ground service can follow up, and I check on them again during the flight so the apology feels genuine, not procedural.',
      minWords: 35,
    },
    {
      id: 'sit_no_rules', cat: 'situation',
      q: 'A passenger refuses to fasten their seatbelt before takeoff. What do you do?',
      qVi: 'Hành khách từ chối cài dây an toàn trước khi cất cánh. Bạn làm gì?',
      keywords: ['explain', 'politely', 'safety', 'regulation', 'reason', 'senior', 'report', 'firm'],
      model: 'I ask politely and explain the reason: the seatbelt protects them during unexpected movement, and the aircraft cannot depart until the cabin is secured. Most people comply when they understand why, not just what. If they still refuse, I stay respectful but firm, involve the senior crew, and if necessary the captain — the flight simply will not take off, and regulations back us fully.',
      minWords: 35,
    },
    {
      id: 'sit_smoker', cat: 'situation',
      q: 'You smell cigarette smoke coming from a lavatory. What are your actions?',
      qVi: 'Bạn ngửi thấy mùi thuốc lá từ buồng vệ sinh. Hành động của bạn?',
      keywords: ['check', 'fire', 'smoke detector', 'report', 'extinguisher', 'captain', 'regulation', 'safety'],
      model: 'Smoke on an aircraft is treated as a potential fire until proven otherwise. I check the lavatory immediately, ready to use the extinguisher, and alert another crew member to inform the purser and captain. Once safe, I address the passenger: smoking is a serious violation of aviation law, the captain is informed, and authorities may meet the aircraft. I also make sure the trash bin has no smoldering material — that is a classic fire source.',
      minWords: 35,
    },
    {
      id: 'sit_language', cat: 'situation',
      q: 'A foreign passenger does not speak English or Vietnamese and looks confused. How do you assist?',
      qVi: 'Hành khách nước ngoài không nói được tiếng Anh/Việt và đang bối rối. Bạn hỗ trợ ra sao?',
      keywords: ['gesture', 'smile', 'picture', 'menu', 'patient', 'translate', 'crew', 'app'],
      model: 'A smile is the first universal language. I would use simple gestures, point to pictures on the menu and safety card, and speak slowly with basic words. I would check if any colleague speaks their language and use the translation app on the crew tablet if available. Patience matters most — I never show frustration, because being unable to communicate is already stressful for them.',
      minWords: 30,
    },
    {
      id: 'sit_vip_complain', cat: 'situation',
      q: 'A business-class passenger complains loudly that the service is slow and demands your name. How do you react?',
      qVi: 'Khách thương gia phàn nàn lớn tiếng dịch vụ chậm và đòi tên bạn. Bạn phản ứng thế nào?',
      keywords: ['calm', 'apologize', 'name', 'listen', 'fix', 'professional', 'not personal'],
      model: 'I give my name with a calm smile — hiding it would only escalate things. Then I apologize for the wait, listen to the specific complaint without interrupting, and fix what I can immediately. I do not take the anger personally; passengers are often stressed about things beyond the flight. Afterward I inform the purser so the service recovery is consistent, and I make a point of giving that passenger attentive service for the rest of the flight.',
      minWords: 35,
    },
    {
      id: 'sit_colleague_mistake', cat: 'situation',
      q: 'You see a fellow crew member skip a required safety check because the flight is late. What do you do?',
      qVi: 'Bạn thấy đồng nghiệp bỏ qua một bước kiểm tra an toàn vì chuyến bay trễ. Bạn làm gì?',
      keywords: ['safety', 'remind', 'directly', 'report', 'senior', 'procedure', 'never', 'compromise'],
      model: 'Safety is never traded for punctuality. I would remind my colleague directly and help them complete the check quickly — two people finish it faster. If they refused, I would inform the senior crew, because a skipped safety step risks every life on board, including theirs. A good team corrects each other without blame; I would want a colleague to do the same for me.',
      minWords: 35,
    },
    {
      id: 'sit_evacuation', cat: 'situation',
      q: 'After landing, an emergency evacuation is ordered. What are your priorities?',
      qVi: 'Sau khi hạ cánh, lệnh sơ tán khẩn cấp được ban hành. Ưu tiên của bạn?',
      keywords: ['command', 'shout', 'door', 'assess', 'outside', 'slide', 'leave belongings', 'fast', 'assist'],
      model: 'Speed with control. I assess my door and outside conditions before opening — fire or obstacles mean redirecting passengers. I shout clear, short commands: "Leave everything! Come this way! Jump and slide!" — bags kill time and block slides. I keep the flow moving, assist elderly, children and passengers with reduced mobility, and only leave the aircraft when my zone is clear, following the captain and purser procedure.',
      minWords: 35,
    }
  );

  // ============ ⭐ BEHAVIORAL (STAR) ============
  B.push(
    {
      id: 'star_difficult_customer', cat: 'star',
      q: 'Tell me about a time you dealt with a very difficult customer. What did you do and what was the result?',
      qVi: 'Kể về một lần bạn xử lý khách hàng rất khó tính. Bạn làm gì và kết quả ra sao?',
      keywords: ['situation', 'when', 'customer', 'action', 'listened', 'apologized', 'result', 'thanked'],
      model: 'When I worked at a coffee shop, a customer received the wrong drink twice during a rush hour and was furious. I took ownership although the mistake was not mine: I apologized, remade the drink myself, and gave her a voucher while explaining honestly that we were short-staffed. She returned the next week and asked for me by name. I learned that owning a problem quickly beats explaining it.',
      minWords: 40,
    },
    {
      id: 'star_pressure', cat: 'star',
      q: 'Describe a time you had to work under intense pressure. How did you cope?',
      qVi: 'Kể về một lần làm việc dưới áp lực lớn. Bạn vượt qua thế nào?',
      keywords: ['when', 'deadline', 'pressure', 'prioritize', 'calm', 'plan', 'result', 'finished'],
      model: 'During Tet season, half our staff was sick and I ran the store front alone for a full weekend. I prioritized ruthlessly: greeting and payment first, restocking between waves of customers, and I asked the kitchen team to help bag orders. We kept the queue under five minutes all weekend and hit the highest sales of the month. Pressure becomes manageable the moment you have an order of priorities.',
      minWords: 40,
    },
    {
      id: 'star_teamwork', cat: 'star',
      q: 'Give me an example of great teamwork you were part of. What was your role?',
      qVi: 'Kể một ví dụ về teamwork tuyệt vời mà bạn tham gia. Vai trò của bạn là gì?',
      keywords: ['team', 'project', 'role', 'communicate', 'together', 'support', 'result', 'success'],
      model: 'My university group had five days to prepare a market-research presentation when another team dropped out. My role was coordinator: I split the work by strengths, set two short check-ins per day, and covered a teammate\'s part when she fell ill. We scored the highest in class. I learned that clear roles and honest early communication matter more than individual brilliance.',
      minWords: 40,
    },
    {
      id: 'star_above_beyond', cat: 'star',
      q: 'Tell me about a time you went above and beyond for someone.',
      qVi: 'Kể về một lần bạn làm nhiều hơn cả trách nhiệm cho ai đó.',
      keywords: ['noticed', 'extra', 'helped', 'time', 'result', 'grateful'],
      model: 'An elderly customer at our store looked lost with a smartphone her son sent her. Officially my job was just selling accessories, but I spent my break teaching her video calls and wrote simple steps on paper. She came back a week later with homemade bánh to thank me. Going beyond rarely costs much — usually just attention and a little time.',
      minWords: 35,
    },
    {
      id: 'star_conflict', cat: 'star',
      q: 'Describe a conflict you had with a colleague and how you resolved it.',
      qVi: 'Kể về một mâu thuẫn với đồng nghiệp và cách bạn giải quyết.',
      keywords: ['disagreed', 'talked', 'directly', 'listened', 'understood', 'compromise', 'result'],
      model: 'A colleague and I disagreed about shift swaps — she felt I got the better schedule. Instead of letting it grow cold, I invited her for coffee and asked to hear her side fully. We built a rotation sheet together and showed it to the manager. The tension disappeared, and the whole team adopted our sheet. Most conflicts are just unspoken assumptions.',
      minWords: 35,
    },
    {
      id: 'star_quick_decision', cat: 'star',
      q: 'Tell me about a time you had to make a quick decision without your manager.',
      qVi: 'Kể về một lần bạn phải quyết định nhanh khi không có quản lý.',
      keywords: ['situation', 'decided', 'quickly', 'responsibility', 'informed', 'result'],
      model: 'A pipe burst near our electronics display on a Sunday when the manager was unreachable. I decided in seconds: cut power to that zone, moved customers away, covered products, and only then called maintenance and left a full report for the manager. We lost zero products and no one was hurt. I believe in deciding fast on safety and reporting honestly right after.',
      minWords: 35,
    },
    {
      id: 'star_adapt', cat: 'star',
      q: 'Give an example of a time you had to adapt to a sudden change.',
      qVi: 'Cho ví dụ về một lần bạn phải thích nghi với thay đổi đột ngột.',
      keywords: ['changed', 'suddenly', 'adjusted', 'flexible', 'learned', 'result'],
      model: 'Our store switched to a new payment system overnight with no training — it simply appeared one Monday. I came in an hour early, tested every function with small transactions, wrote a one-page cheat sheet, and shared it with the team. By noon we were faster than with the old system. Change stops being scary once you actively play with it instead of waiting for instructions.',
      minWords: 35,
    },
    {
      id: 'star_complaint_learn', cat: 'star',
      q: 'Tell me about a time you received a complaint about your own service. What happened afterward?',
      qVi: 'Kể về một lần chính bạn bị phàn nàn về dịch vụ. Sau đó thế nào?',
      keywords: ['complaint', 'my mistake', 'apologized', 'listened', 'changed', 'improved', 'result'],
      model: 'A customer complained that I sounded rushed on the phone. It stung, but she was right — it was a busy day and it leaked into my voice. I apologized and asked what would have felt better. Since then I pause one second before answering any call and smile while speaking, because a smile is audible. My call ratings improved and I now coach new staff on exactly this.',
      minWords: 35,
    }
  );

  // Aviation-flavored vocabulary rewarded by the scorer regardless of question.
  const AVIATION_VOCAB = [
    'safety', 'procedure', 'passenger', 'cabin', 'crew', 'captain', 'purser',
    'seatbelt', 'emergency', 'evacuation', 'first aid', 'boarding', 'turbulence',
    'announcement', 'regulation', 'service', 'professional', 'oxygen', 'briefing',
    'gallery', 'galley', 'aircraft', 'flight deck', 'security',
  ];

  // Filler words penalized by the fluency criterion.
  const FILLERS = ['um', 'uh', 'er', 'like', 'you know', 'actually', 'basically'];

  global.INTERVIEW_BANK = {
    questions: B,
    AVIATION_VOCAB,
    FILLERS,
    CATEGORIES: {
      self: { icon: '🙋', label: { vi: 'Bản thân & Động lực', en: 'Self & Motivation' } },
      life: { icon: '☕', label: { vi: 'Đời sống & Quan điểm', en: 'Life & Opinions' } },
      situation: { icon: '✈️', label: { vi: 'Tình huống trên máy bay', en: 'In-flight Situations' } },
      star: { icon: '⭐', label: { vi: 'Câu hỏi hành vi (STAR)', en: 'Behavioral (STAR)' } },
    },
  };
})(window);
