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
    {
      id: 'body_parts',
      icon: '🧍',
      title: { vi: 'Cơ thể & Cử động', en: 'Body & Movement' },
      desc: {
        vi: 'Bộ phận cơ thể, cử động, ngôn ngữ cơ thể.',
        en: 'Body parts, movement, body language.',
      },
      sources: ['Vocab in Use U9'],
    },
    {
      id: 'clothes_fashion',
      icon: '👗',
      title: { vi: 'Quần áo & Thời trang', en: 'Clothes & Fashion' },
      desc: {
        vi: 'Trang phục, phụ kiện, phong cách, kích cỡ.',
        en: 'Outfits, accessories, styles, sizes.',
      },
      sources: ['Vocab in Use U21'],
    },
    {
      id: 'education',
      icon: '🎓',
      title: { vi: 'Học hành & Trường lớp', en: 'Education & Study' },
      desc: {
        vi: 'Lớp học, môn học, thi cử, đại học.',
        en: 'Classroom, subjects, exams, university.',
      },
      sources: ['Vocab in Use U30-34'],
    },
    {
      id: 'transport',
      icon: '🚌',
      title: { vi: 'Giao thông & Đường phố', en: 'Transport & the Road' },
      desc: {
        vi: 'Phương tiện, lái xe, biển báo, giao thông.',
        en: 'Vehicles, driving, road signs, traffic.',
      },
      sources: ['Vocab in Use U27-29'],
    },
    {
      id: 'city_life',
      icon: '🏙️',
      title: { vi: 'Đời sống thành phố', en: 'City Life' },
      desc: {
        vi: 'Tiện ích, địa điểm, hướng đi, trải nghiệm đô thị.',
        en: 'Amenities, places, directions, urban life.',
      },
      sources: ['Vocab in Use U26'],
    },
    {
      id: 'tech_internet',
      icon: '💻',
      title: { vi: 'Công nghệ & Internet', en: 'Technology & Internet' },
      desc: {
        vi: 'Máy tính, điện thoại, mạng xã hội, email.',
        en: 'Computers, phones, social media, email.',
      },
      sources: ['Vocab in Use U51, U53, U55'],
    },
    {
      id: 'events_festivals',
      icon: '🎉',
      title: { vi: 'Sự kiện & Lễ hội', en: 'Special Events & Festivals' },
      desc: {
        vi: 'Sinh nhật, đám cưới, Tết, lễ kỷ niệm.',
        en: 'Birthdays, weddings, Tet, anniversaries.',
      },
      sources: ['Vocab in Use U45'],
    },
    {
      id: 'relationships',
      icon: '💕',
      title: { vi: 'Tình cảm & Mối quan hệ', en: 'Relationships' },
      desc: {
        vi: 'Bạn bè, hẹn hò, tình yêu, gia đình mở rộng.',
        en: 'Friends, dating, love, extended family.',
      },
      sources: ['Vocab in Use U13, U15'],
    },
    {
      id: 'sales_marketing',
      icon: '📢',
      title: { vi: 'Bán hàng & Marketing', en: 'Sales & Marketing' },
      desc: {
        vi: 'Quảng cáo, khuyến mãi, thị trường, khách hàng.',
        en: 'Advertising, promotions, markets, clients.',
      },
      sources: ['Business Result U9'],
    },
    {
      id: 'presentations',
      icon: '🎤',
      title: { vi: 'Thuyết trình & Đào tạo', en: 'Presentations & Training' },
      desc: {
        vi: 'Slide, số liệu, mô tả biểu đồ, hỏi đáp.',
        en: 'Slides, figures, describing charts, Q&A.',
      },
      sources: ['Business Result U4, U12, U15, U16'],
    },
  ];
})(window);
