(function (global) {
  'use strict';

  // Each topic has bilingual title/desc so we can show it directly without i18n lookups.
  global.TOPICS = [
    {
      id: 'office',
      icon: '💼',
      title: { vi: 'Văn phòng', en: 'Office' },
      desc: {
        vi: 'Từ vựng cho công việc thường ngày: đồng nghiệp, họp, email…',
        en: 'Everyday work vocabulary: colleagues, meetings, emails…',
      },
    },
    {
      id: 'home',
      icon: '🏠',
      title: { vi: 'Nhà ở', en: 'Home & Living' },
      desc: {
        vi: 'Nội thất, phòng, đồ gia dụng và sinh hoạt ở nhà.',
        en: 'Furniture, rooms, appliances and home life.',
      },
    },
    {
      id: 'going_out',
      icon: '🎉',
      title: { vi: 'Đi chơi', en: 'Going out' },
      desc: {
        vi: 'Cuối tuần, công viên, rạp phim, cà phê với bạn bè.',
        en: 'Weekends, parks, cinema, coffee with friends.',
      },
    },
    {
      id: 'food',
      icon: '🍜',
      title: { vi: 'Ăn uống', en: 'Food & Drink' },
      desc: {
        vi: 'Gọi món, nhà hàng, hương vị và thanh toán.',
        en: 'Ordering, restaurants, flavors and paying the bill.',
      },
    },
    {
      id: 'travel',
      icon: '✈️',
      title: { vi: 'Du lịch', en: 'Travel' },
      desc: {
        vi: 'Sân bay, khách sạn, đặt vé và khám phá.',
        en: 'Airports, hotels, bookings and sightseeing.',
      },
    },
    {
      id: 'shopping',
      icon: '🛍️',
      title: { vi: 'Mua sắm', en: 'Shopping' },
      desc: {
        vi: 'Giảm giá, size, phòng thử, thanh toán.',
        en: 'Discounts, sizes, fitting rooms, checkout.',
      },
    },
  ];
})(window);
