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
        { en: 'Good afternoon, how are you today?', ipa: 'ɡʊd ˌɑːftəˈnuːn haʊ ɑː juː təˈdeɪ', vi: 'Chào buổi chiều, hôm nay quý khách thế nào ạ?' },
        { en: 'Welcome, please come this way.', ipa: 'ˈwelkəm pliːz kʌm ðɪs weɪ', vi: 'Xin mời quý khách đi lối này.' },
        { en: 'Your seat is just down the aisle.', ipa: 'jɔː siːt ɪz dʒʌst daʊn ði aɪl', vi: 'Ghế của quý khách ở phía cuối lối đi.' },
        { en: 'Let me show you to your seat.', ipa: 'let miː ʃəʊ juː tə jɔː siːt', vi: 'Để tôi dẫn quý khách tới chỗ ngồi.' },
        { en: 'Is this your first time flying with us?', ipa: 'ɪz ðɪs jɔː fɜːst taɪm ˈflaɪɪŋ wɪð ʌs', vi: 'Đây có phải lần đầu quý khách bay với chúng tôi?' },
        { en: 'It is a pleasure to have you on board.', ipa: 'ɪt ɪz ə ˈpleʒə tə hæv juː ɒn bɔːd', vi: 'Rất hân hạnh được đón quý khách.' },
        { en: 'Please take your time.', ipa: 'pliːz teɪk jɔː taɪm', vi: 'Quý khách cứ thong thả ạ.' },
        { en: 'Can I help you find your seat?', ipa: 'kæn aɪ help juː faɪnd jɔː siːt', vi: 'Tôi giúp quý khách tìm ghế nhé?' },
        { en: 'Your seat number is fifteen C.', ipa: 'jɔː siːt ˈnʌmbər ɪz ˌfɪfˈtiːn siː', vi: 'Số ghế của quý khách là 15C.' },
        { en: 'Watch your step, please.', ipa: 'wɒtʃ jɔː step pliːz', vi: 'Quý khách chú ý bước chân ạ.' },
        { en: 'May I take your coat?', ipa: 'meɪ aɪ teɪk jɔː kəʊt', vi: 'Tôi cầm áo khoác giúp quý khách nhé?' },
        { en: 'We hope you have a pleasant journey.', ipa: 'wiː həʊp juː hæv ə ˈpleznt ˈdʒɜːni', vi: 'Chúc quý khách một hành trình dễ chịu.' },
        { en: 'Please make yourself comfortable.', ipa: 'pliːz meɪk jɔːˈself ˈkʌmftəbl', vi: 'Xin quý khách cứ tự nhiên.' },
        { en: 'Thank you for choosing our airline.', ipa: 'θæŋk juː fə ˈtʃuːzɪŋ ˈaʊər ˈeəlaɪn', vi: 'Cảm ơn quý khách đã chọn hãng của chúng tôi.' },
        { en: 'Have a wonderful trip.', ipa: 'hæv ə ˈwʌndəfl trɪp', vi: 'Chúc quý khách chuyến đi tuyệt vời.' },
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
        { en: 'Please switch off your mobile phone.', ipa: 'pliːz swɪtʃ ɒf jɔː ˈməʊbaɪl fəʊn', vi: 'Xin tắt điện thoại di động.' },
        { en: 'Cabin crew, prepare for take-off.', ipa: 'ˈkæbɪn kruː prɪˈpeə fə ˈteɪkɒf', vi: 'Tổ tiếp viên chuẩn bị cất cánh.' },
        { en: 'We will be landing shortly.', ipa: 'wiː wɪl biː ˈlændɪŋ ˈʃɔːtli', vi: 'Chúng ta sắp hạ cánh.' },
        { en: 'The local time is ten o clock.', ipa: 'ðə ˈləʊkl taɪm ɪz ten əˈklɒk', vi: 'Giờ địa phương là mười giờ.' },
        { en: 'Please keep your seatbelt fastened.', ipa: 'pliːz kiːp jɔː ˈsiːtbelt ˈfɑːsnd', vi: 'Xin giữ dây an toàn luôn cài.' },
        { en: 'We are experiencing some turbulence.', ipa: 'wiː ɑːr ɪkˈspɪəriənsɪŋ sʌm ˈtɜːbjələns', vi: 'Chúng ta đang gặp nhiễu động.' },
        { en: 'Please return your seat to the upright position.', ipa: 'pliːz rɪˈtɜːn jɔː siːt tə ði ˈʌpraɪt pəˈzɪʃn', vi: 'Xin dựng thẳng lưng ghế.' },
        { en: 'Thank you for your attention.', ipa: 'θæŋk juː fə jɔːr əˈtenʃn', vi: 'Cảm ơn quý khách đã chú ý.' },
        { en: 'We will begin our service shortly.', ipa: 'wiː wɪl bɪˈɡɪn ˈaʊə ˈsɜːvɪs ˈʃɔːtli', vi: 'Chúng tôi sẽ bắt đầu phục vụ ngay.' },
        { en: 'The weather at our destination is sunny.', ipa: 'ðə ˈweðər ət ˈaʊə ˌdestɪˈneɪʃn ɪz ˈsʌni', vi: 'Thời tiết ở điểm đến nắng đẹp.' },
        { en: 'Please remain seated until the sign is off.', ipa: 'pliːz rɪˈmeɪn ˈsiːtɪd ənˈtɪl ðə saɪn ɪz ɒf', vi: 'Xin ngồi yên đến khi đèn báo tắt.' },
        { en: 'On behalf of the crew, welcome aboard.', ipa: 'ɒn bɪˈhɑːf əv ðə kruː ˈwelkəm əˈbɔːd', vi: 'Thay mặt tổ bay, hoan nghênh quý khách.' },
        { en: 'We are now beginning our descent.', ipa: 'wiː ɑː naʊ bɪˈɡɪnɪŋ ˈaʊə dɪˈsent', vi: 'Chúng ta bắt đầu hạ độ cao.' },
        { en: 'Please stow your tray table.', ipa: 'pliːz stəʊ jɔː treɪ ˈteɪbl', vi: 'Xin gấp bàn ăn lại.' },
        { en: 'Thank you for flying with us.', ipa: 'θæŋk juː fə ˈflaɪɪŋ wɪð ʌs', vi: 'Cảm ơn quý khách đã bay cùng chúng tôi.' },
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
        { en: 'Would you like tea or coffee?', ipa: 'wʊd juː laɪk tiː ɔː ˈkɒfi', vi: 'Quý khách dùng trà hay cà phê ạ?' },
        { en: 'How would you like your steak?', ipa: 'haʊ wʊd juː laɪk jɔː steɪk', vi: 'Quý khách dùng bò tái hay chín ạ?' },
        { en: 'Here is your meal. Enjoy.', ipa: 'hɪər ɪz jɔː miːl ɪnˈdʒɔɪ', vi: 'Suất ăn của quý khách đây. Chúc ngon miệng.' },
        { en: 'Can I get you anything else?', ipa: 'kæn aɪ ɡet juː ˈeniθɪŋ els', vi: 'Quý khách cần thêm gì nữa không ạ?' },
        { en: 'Would you like some water?', ipa: 'wʊd juː laɪk sʌm ˈwɔːtə', vi: 'Quý khách dùng nước không ạ?' },
        { en: 'I will be right back with your order.', ipa: 'aɪ wɪl biː raɪt bæk wɪð jɔːr ˈɔːdə', vi: 'Tôi sẽ mang đồ quý khách gọi ngay.' },
        { en: 'Please let me know if you need anything.', ipa: 'pliːz let miː nəʊ ɪf juː niːd ˈeniθɪŋ', vi: 'Cần gì quý khách cứ gọi tôi ạ.' },
        { en: 'Would you like a newspaper?', ipa: 'wʊd juː laɪk ə ˈnjuːzpeɪpə', vi: 'Quý khách dùng báo không ạ?' },
        { en: 'May I clear your tray?', ipa: 'meɪ aɪ klɪə jɔː treɪ', vi: 'Tôi dọn khay giúp quý khách nhé?' },
        { en: 'The duty-free trolley is coming.', ipa: 'ðə ˈdjuːti friː ˈtrɒli ɪz ˈkʌmɪŋ', vi: 'Xe hàng miễn thuế sắp tới ạ.' },
        { en: 'Would you like ice with your drink?', ipa: 'wʊd juː laɪk aɪs wɪð jɔː drɪŋk', vi: 'Quý khách dùng đá với đồ uống không ạ?' },
        { en: 'I am afraid we only have juice.', ipa: 'aɪ əm əˈfreɪd wiː ˈəʊnli hæv dʒuːs', vi: 'Rất tiếc chúng tôi chỉ còn nước ép ạ.' },
        { en: 'Please pass this to the passenger beside you.', ipa: 'pliːz pɑːs ðɪs tə ðə ˈpæsɪndʒə bɪˈsaɪd juː', vi: 'Xin chuyển giúp cho khách bên cạnh ạ.' },
        { en: 'Your special meal is ready.', ipa: 'jɔː ˈspeʃl miːl ɪz ˈredi', vi: 'Suất ăn đặc biệt của quý khách đã sẵn sàng.' },
        { en: 'Enjoy your meal.', ipa: 'ɪnˈdʒɔɪ jɔː miːl', vi: 'Chúc quý khách ngon miệng.' },
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
        { en: 'Please read the safety card.', ipa: 'pliːz riːd ðə ˈseɪfti kɑːd', vi: 'Xin đọc thẻ hướng dẫn an toàn.' },
        { en: 'There are eight emergency exits.', ipa: 'ðeər ɑːr eɪt ɪˈmɜːdʒənsi ˈeksɪts', vi: 'Có tám cửa thoát hiểm.' },
        { en: 'Your life jacket is under your seat.', ipa: 'jɔː laɪf ˈdʒækɪt ɪz ˈʌndə jɔː siːt', vi: 'Áo phao ở dưới ghế của quý khách.' },
        { en: 'Please do not inflate it inside the cabin.', ipa: 'pliːz duː nɒt ɪnˈfleɪt ɪt ɪnˈsaɪd ðə ˈkæbɪn', vi: 'Xin đừng bơm phao trong khoang.' },
        { en: 'Pull the tab to inflate the jacket.', ipa: 'pʊl ðə tæb tuː ɪnˈfleɪt ðə ˈdʒækɪt', vi: 'Kéo dây để bơm phao.' },
        { en: 'Please fasten your seatbelt low and tight.', ipa: 'pliːz ˈfɑːsn jɔː ˈsiːtbelt ləʊ ənd taɪt', vi: 'Xin cài dây an toàn thấp và chặt.' },
        { en: 'Smoking is not allowed on this flight.', ipa: 'ˈsməʊkɪŋ ɪz nɒt əˈlaʊd ɒn ðɪs flaɪt', vi: 'Không được hút thuốc trên chuyến bay này.' },
        { en: 'Please keep your seatbelt on while seated.', ipa: 'pliːz kiːp jɔː ˈsiːtbelt ɒn waɪl ˈsiːtɪd', vi: 'Xin luôn cài dây khi ngồi.' },
        { en: 'In an emergency, follow the floor lights.', ipa: 'ɪn ən ɪˈmɜːdʒənsi ˈfɒləʊ ðə flɔː laɪts', vi: 'Khi khẩn cấp, đi theo đèn sàn.' },
        { en: 'Leave your belongings behind.', ipa: 'liːv jɔː bɪˈlɒŋɪŋz bɪˈhaɪnd', vi: 'Hãy bỏ lại hành lý.' },
        { en: 'Remove your high heels before using the slide.', ipa: 'rɪˈmuːv jɔː haɪ hiːlz bɪˈfɔː ˈjuːzɪŋ ðə slaɪd', vi: 'Cởi giày cao gót trước khi dùng phao trượt.' },
        { en: 'Brace for impact.', ipa: 'breɪs fər ˈɪmpækt', vi: 'Chuẩn bị tư thế va chạm.' },
        { en: 'Oxygen masks will drop automatically.', ipa: 'ˈɒksɪdʒən mɑːsks wɪl drɒp ˌɔːtəˈmætɪkli', vi: 'Mặt nạ dưỡng khí sẽ tự rơi xuống.' },
        { en: 'Secure your own mask first, then help others.', ipa: 'sɪˈkjʊə jɔːr əʊn mɑːsk fɜːst ðen help ˈʌðəz', vi: 'Đeo mặt nạ của mình trước, rồi giúp người khác.' },
        { en: 'Please stay calm and listen to the crew.', ipa: 'pliːz steɪ kɑːm ənd ˈlɪsn tə ðə kruː', vi: 'Xin giữ bình tĩnh và nghe theo tổ bay.' },
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
        { en: 'Good morning, my name is Linh.', ipa: 'ɡʊd ˈmɔːnɪŋ maɪ neɪm ɪz lɪŋ', vi: 'Chào buổi sáng, tên tôi là Linh.' },
        { en: 'I am a friendly and hard-working person.', ipa: 'aɪ əm ə ˈfrendli ənd ˈhɑːdˌwɜːkɪŋ ˈpɜːsn', vi: 'Tôi là người thân thiện và chăm chỉ.' },
        { en: 'I love working with people.', ipa: 'aɪ lʌv ˈwɜːkɪŋ wɪð ˈpiːpl', vi: 'Tôi thích làm việc với mọi người.' },
        { en: 'I have three years of experience.', ipa: 'aɪ hæv θriː jɪəz əv ɪkˈspɪəriəns', vi: 'Tôi có ba năm kinh nghiệm.' },
        { en: 'I always put the customer first.', ipa: 'aɪ ˈɔːlweɪz pʊt ðə ˈkʌstəmə fɜːst', vi: 'Tôi luôn đặt khách hàng lên hàng đầu.' },
        { en: 'I work well in a team.', ipa: 'aɪ wɜːk wel ɪn ə tiːm', vi: 'Tôi làm việc nhóm tốt.' },
        { en: 'I can handle difficult situations.', ipa: 'aɪ kæn ˈhændl ˈdɪfɪkəlt ˌsɪtʃuˈeɪʃnz', vi: 'Tôi có thể xử lý tình huống khó.' },
        { en: 'I would love to work for your airline.', ipa: 'aɪ wʊd lʌv tə wɜːk fə jɔːr ˈeəlaɪn', vi: 'Tôi rất muốn làm việc cho hãng của quý vị.' },
        { en: 'I am confident and well organized.', ipa: 'aɪ əm ˈkɒnfɪdənt ənd wel ˈɔːɡənaɪzd', vi: 'Tôi tự tin và ngăn nắp.' },
        { en: 'I am ready to learn and grow.', ipa: 'aɪ əm ˈredi tə lɜːn ənd ɡrəʊ', vi: 'Tôi sẵn sàng học hỏi và phát triển.' },
        { en: 'I graduated from university last year.', ipa: 'aɪ ˈɡrædʒueɪtɪd frəm ˌjuːnɪˈvɜːsəti lɑːst jɪə', vi: 'Tôi tốt nghiệp đại học năm ngoái.' },
        { en: 'I enjoy meeting new people every day.', ipa: 'aɪ ɪnˈdʒɔɪ ˈmiːtɪŋ njuː ˈpiːpl ˈevri deɪ', vi: 'Tôi thích gặp gỡ người mới mỗi ngày.' },
        { en: 'I believe I am the right person for this job.', ipa: 'aɪ bɪˈliːv aɪ əm ðə raɪt ˈpɜːsn fə ðɪs dʒɒb', vi: 'Tôi tin mình phù hợp với công việc này.' },
        { en: 'I speak English and a little Japanese.', ipa: 'aɪ spiːk ˈɪŋɡlɪʃ ənd ə ˈlɪtl ˌdʒæpəˈniːz', vi: 'Tôi nói tiếng Anh và một chút tiếng Nhật.' },
        { en: 'Thank you very much for your time.', ipa: 'θæŋk juː ˈveri mʌtʃ fə jɔː taɪm', vi: 'Cảm ơn quý vị đã dành thời gian.' },
      ],
    },
  ];

  global.PRON_DRILL = { SETS };
})(window);
