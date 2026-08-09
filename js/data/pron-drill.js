(function (global) {
  'use strict';

  // Pronunciation drill bank for the cabin-crew module.
  //
  // Each item is a short, real cabin-crew phrase with its British-RP IPA
  // (word-level, shown as the pronunciation target) and a Vietnamese gloss.
  // The drill shows the phrase + IPA, the student reads it aloud, and the
  // recognizer transcript is scored word-by-word against the target — words
  // the engine mishears are flagged as likely mispronunciations.
  //
  // Grouped by set so a learner can focus (greetings / announcements /
  // service / safety / interview lines).

  const SETS = [
    {
      id: 'greet', icon: '👋', label: { vi: 'Chào & Tiếp đón', en: 'Greetings & Welcome' },
      items: [
        { en: 'Good morning, welcome aboard.', ipa: 'ɡʊd ˈmɔːnɪŋ ˈwelkəm əˈbɔːd', vi: 'Chào buổi sáng, hoan nghênh quý khách lên máy bay.' },
        { en: 'May I see your boarding pass, please?', ipa: 'meɪ aɪ siː jɔː ˈbɔːdɪŋ pɑːs pliːz', vi: 'Cho tôi xem thẻ lên máy bay được không ạ?' },
        { en: 'Your seat is on the right, row twenty.', ipa: 'jɔː siːt ɪz ɒn ðə raɪt rəʊ ˈtwenti', vi: 'Ghế của quý khách ở bên phải, hàng hai mươi.' },
        { en: 'Please let me help you with your bag.', ipa: 'pliːz let miː help juː wɪð jɔː bæɡ', vi: 'Để tôi giúp quý khách với hành lý.' },
        { en: 'Enjoy your flight with us today.', ipa: 'ɪnˈdʒɔɪ jɔː flaɪt wɪð ʌs təˈdeɪ', vi: 'Chúc quý khách có chuyến bay vui vẻ hôm nay.' },
      ],
    },
    {
      id: 'announce', icon: '📢', label: { vi: 'Thông báo', en: 'Announcements' },
      items: [
        { en: 'Ladies and gentlemen, welcome on board.', ipa: 'ˈleɪdiz ənd ˈdʒentlmən ˈwelkəm ɒn bɔːd', vi: 'Kính thưa quý khách, hoan nghênh lên máy bay.' },
        { en: 'Please fasten your seatbelt.', ipa: 'pliːz ˈfɑːsn jɔː ˈsiːtbelt', vi: 'Xin vui lòng cài dây an toàn.' },
        { en: 'We are now ready for departure.', ipa: 'wiː ɑː naʊ ˈredi fə dɪˈpɑːtʃə', vi: 'Chúng ta đã sẵn sàng khởi hành.' },
        { en: 'Please return to your seat.', ipa: 'pliːz rɪˈtɜːn tə jɔː siːt', vi: 'Xin vui lòng trở về chỗ ngồi.' },
        { en: 'The captain has turned on the seatbelt sign.', ipa: 'ðə ˈkæptɪn həz tɜːnd ɒn ðə ˈsiːtbelt saɪn', vi: 'Cơ trưởng đã bật đèn báo thắt dây an toàn.' },
      ],
    },
    {
      id: 'service', icon: '🍽️', label: { vi: 'Phục vụ', en: 'Service' },
      items: [
        { en: 'Would you like chicken or beef?', ipa: 'wʊd juː laɪk ˈtʃɪkɪn ɔː biːf', vi: 'Quý khách dùng gà hay bò ạ?' },
        { en: 'Would you care for something to drink?', ipa: 'wʊd juː keə fə ˈsʌmθɪŋ tə drɪŋk', vi: 'Quý khách dùng gì để uống không ạ?' },
        { en: 'Here is your coffee. Be careful, it is hot.', ipa: 'hɪər ɪz jɔː ˈkɒfi biː ˈkeəfl ɪt ɪz hɒt', vi: 'Cà phê của quý khách đây. Cẩn thận, còn nóng ạ.' },
        { en: 'I am sorry, we have run out of fish.', ipa: 'aɪ əm ˈsɒri wiː həv rʌn aʊt əv fɪʃ', vi: 'Tôi xin lỗi, chúng tôi đã hết món cá.' },
        { en: 'Let me bring you a blanket.', ipa: 'let miː brɪŋ juː ə ˈblæŋkɪt', vi: 'Để tôi mang cho quý khách một chiếc chăn.' },
      ],
    },
    {
      id: 'safety', icon: '🛟', label: { vi: 'An toàn', en: 'Safety' },
      items: [
        { en: 'Please stow your baggage in the overhead locker.', ipa: 'pliːz stəʊ jɔː ˈbæɡɪdʒ ɪn ði ˌəʊvəˈhed ˈlɒkə', vi: 'Xin để hành lý vào khoang phía trên.' },
        { en: 'In case of emergency, remain calm.', ipa: 'ɪn keɪs əv ɪˈmɜːdʒənsi rɪˈmeɪn kɑːm', vi: 'Trong trường hợp khẩn cấp, hãy giữ bình tĩnh.' },
        { en: 'The nearest exit may be behind you.', ipa: 'ðə ˈnɪərɪst ˈeksɪt meɪ biː bɪˈhaɪnd juː', vi: 'Lối thoát gần nhất có thể ở phía sau quý khách.' },
        { en: 'Please put on your oxygen mask first.', ipa: 'pliːz pʊt ɒn jɔːr ˈɒksɪdʒən mɑːsk fɜːst', vi: 'Xin đeo mặt nạ dưỡng khí của mình trước.' },
        { en: 'Please keep the aisle clear.', ipa: 'pliːz kiːp ði aɪl klɪə', vi: 'Xin giữ lối đi thông thoáng.' },
      ],
    },
    {
      id: 'interview', icon: '🎤', label: { vi: 'Câu nói phỏng vấn', en: 'Interview Lines' },
      items: [
        { en: 'It is a pleasure to meet you.', ipa: 'ɪt ɪz ə ˈpleʒə tə miːt juː', vi: 'Rất hân hạnh được gặp anh/chị.' },
        { en: 'I am passionate about customer service.', ipa: 'aɪ əm ˈpæʃənət əˈbaʊt ˈkʌstəmə ˈsɜːvɪs', vi: 'Tôi đam mê công việc chăm sóc khách hàng.' },
        { en: 'I stay calm under pressure.', ipa: 'aɪ steɪ kɑːm ˈʌndə ˈpreʃə', vi: 'Tôi giữ bình tĩnh dưới áp lực.' },
        { en: 'Safety is always my first priority.', ipa: 'ˈseɪfti ɪz ˈɔːlweɪz maɪ fɜːst praɪˈɒrəti', vi: 'An toàn luôn là ưu tiên hàng đầu của tôi.' },
        { en: 'Thank you for this opportunity.', ipa: 'θæŋk juː fə ðɪs ˌɒpəˈtjuːnəti', vi: 'Cảm ơn vì cơ hội này.' },
      ],
    },
  ];

  global.PRON_DRILL = { SETS };
})(window);
