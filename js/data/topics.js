(function (global) {
  'use strict';

  // 12 topics balancing daily conversation (English Vocabulary in Use Pre-Int)
  // and workplace communication (Business Result Pre-Int).
  global.TOPICS = [
    {
      id: 'intro_people',
      icon: '👋',
      title: { vi: 'Giới thiệu & Mọi người', en: 'Introductions & People' },
      desc: {
        vi: 'Chào hỏi, giới thiệu bản thân, nghề nghiệp, quốc tịch.',
        en: 'Greetings, self-introduction, jobs, nationalities.',
      },
      sources: ['Vocab in Use U5, U9', 'Business Result U1'],
    },
    {
      id: 'family_home',
      icon: '🏠',
      title: { vi: 'Gia đình & Nhà ở', en: 'Family & Home' },
      desc: {
        vi: 'Thành viên gia đình, phòng ốc, đồ gia dụng.',
        en: 'Family members, rooms, household things.',
      },
      sources: ['Vocab in Use U14, U17, U18'],
    },
    {
      id: 'daily_routines',
      icon: '⏰',
      title: { vi: 'Sinh hoạt hằng ngày', en: 'Daily Routines' },
      desc: {
        vi: 'Thức dậy, đi làm, nghỉ ngơi, các thói quen mỗi ngày.',
        en: 'Waking up, commuting, resting — every-day habits.',
      },
      sources: ['Vocab in Use U16'],
    },
    {
      id: 'describing_people',
      icon: '🧑‍🎨',
      title: { vi: 'Miêu tả người', en: 'Describing People' },
      desc: {
        vi: 'Ngoại hình, tính cách, cảm xúc.',
        en: 'Appearance, character, feelings.',
      },
      sources: ['Vocab in Use U10, U11, U12'],
    },
    {
      id: 'food_restaurants',
      icon: '🍜',
      title: { vi: 'Ăn uống & Nhà hàng', en: 'Food & Restaurants' },
      desc: {
        vi: 'Gọi món, hương vị, thanh toán ở nhà hàng.',
        en: 'Ordering, flavors, paying at restaurants.',
      },
      sources: ['Vocab in Use U23, U24, U49'],
    },
    {
      id: 'shopping_money',
      icon: '🛍️',
      title: { vi: 'Mua sắm & Tiền bạc', en: 'Shopping & Money' },
      desc: {
        vi: 'Quần áo, giảm giá, thanh toán, ngân hàng.',
        en: 'Clothes, discounts, paying, banking basics.',
      },
      sources: ['Vocab in Use U19, U22'],
    },
    {
      id: 'travel_hotels',
      icon: '✈️',
      title: { vi: 'Du lịch & Khách sạn', en: 'Travel & Hotels' },
      desc: {
        vi: 'Đặt vé, sân bay, nhận/trả phòng, tham quan.',
        en: 'Booking, airports, check-in, sightseeing.',
      },
      sources: ['Vocab in Use U46-50', 'Business Result U7'],
    },
    {
      id: 'health_feelings',
      icon: '🩺',
      title: { vi: 'Sức khoẻ & Cảm xúc', en: 'Health & Feelings' },
      desc: {
        vi: 'Cơ thể, triệu chứng, cảm xúc tích cực & tiêu cực.',
        en: 'Body, symptoms, positive & negative feelings.',
      },
      sources: ['Vocab in Use U12, U20'],
    },
    {
      id: 'weather_leisure',
      icon: '⛅',
      title: { vi: 'Thời tiết & Giải trí', en: 'Weather & Leisure' },
      desc: {
        vi: 'Trời mưa nắng, thể thao, âm nhạc, sở thích.',
        en: 'Rain or shine, sports, music, hobbies.',
      },
      sources: ['Vocab in Use U7, U40, U42, U44'],
    },
    {
      id: 'office_jobs',
      icon: '💼',
      title: { vi: 'Văn phòng & Công việc', en: 'Office & Jobs' },
      desc: {
        vi: 'Nghề nghiệp, đồ dùng văn phòng, cấp bậc.',
        en: 'Jobs, office items, roles.',
      },
      sources: ['Vocab in Use U35-38', 'Business Result U1, U3'],
    },
    {
      id: 'meetings_phone',
      icon: '📞',
      title: { vi: 'Họp & Gọi điện', en: 'Meetings & Phoning' },
      desc: {
        vi: 'Cuộc họp, điện thoại, email trong công sở.',
        en: 'Meetings, phone calls, business emails.',
      },
      sources: ['Business Result U2, U3, U4', 'Vocab in Use U54'],
    },
    {
      id: 'social_expressions',
      icon: '💬',
      title: { vi: 'Giao tiếp xã hội', en: 'Social Expressions' },
      desc: {
        vi: 'Xin lỗi, đồng ý, từ chối, đưa ra lời mời.',
        en: 'Apologies, agreeing, declining, invitations.',
      },
      sources: ['Vocab in Use U65-69', 'Business Result U11'],
    },
  ];
})(window);
