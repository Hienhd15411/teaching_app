(function (global) {
  'use strict';

  // Schema (each entry):
  //   en:      English word / phrase
  //   vi:      Vietnamese meaning
  //   pos:     part of speech — n, v, adj, adv, phr
  //   ipa:     IPA transcription (American/General) without slashes: bɪˈɡɪn
  //   example: natural sentence using the word
  //   syn:     array of synonyms (English), optional
  //   ant:     array of antonyms (English), optional
  //
  // Content curated from / aligned with:
  //   - English Vocabulary in Use Pre-Intermediate (Stuart Redman, Cambridge 4e)
  //   - Business Result Pre-Intermediate (Oxford)

  global.VOCAB = {
    intro_people: [
      { en: 'introduce', vi: 'giới thiệu', pos: 'v', ipa: 'ˌɪntrəˈdjuːs', example: "Let me introduce myself — I'm Minh.", syn: ['present'] },
      { en: 'nice to meet you', vi: 'rất vui được gặp bạn', pos: 'phr', ipa: 'naɪs tə ˈmiːt ju', example: "Nice to meet you. I'm from Vietnam.", syn: ['pleased to meet you'] },
      { en: 'colleague', vi: 'đồng nghiệp', pos: 'n', ipa: 'ˈkɒliːɡ', example: 'Sarah is a colleague of mine from marketing.', syn: ['coworker'] },
      { en: 'nationality', vi: 'quốc tịch', pos: 'n', ipa: 'ˌnæʃəˈnæləti', example: 'What nationality are you?', syn: ['citizenship'] },
      { en: 'foreign', vi: 'nước ngoài', pos: 'adj', ipa: 'ˈfɒrən', example: 'She speaks three foreign languages.', syn: ['overseas'], ant: ['local', 'native'] },
      { en: 'career', vi: 'sự nghiệp', pos: 'n', ipa: 'kəˈrɪə', example: 'He has had a long career in banking.', syn: ['profession'] },
      { en: 'customer', vi: 'khách hàng', pos: 'n', ipa: 'ˈkʌstəmə', example: 'Our customers expect quick responses.', syn: ['client', 'buyer'], ant: ['seller'] },
      { en: 'employee', vi: 'nhân viên', pos: 'n', ipa: 'ɪmˈplɔɪiː', example: 'The company has 200 employees.', syn: ['staff member', 'worker'], ant: ['employer'] },
      { en: 'employer', vi: 'người sử dụng lao động', pos: 'n', ipa: 'ɪmˈplɔɪə', example: 'My employer offers flexible hours.', syn: ['boss'], ant: ['employee'] },
      { en: 'business', vi: 'công việc kinh doanh', pos: 'n', ipa: 'ˈbɪznəs', example: 'She runs a small online business.', syn: ['company', 'firm'] },
      { en: 'industry', vi: 'ngành công nghiệp', pos: 'n', ipa: 'ˈɪndəstri', example: 'The tech industry is growing fast.', syn: ['sector', 'field'] },
      { en: 'specialize in', vi: 'chuyên về', pos: 'phr', ipa: 'ˈspeʃəlaɪz ɪn', example: 'We specialize in mobile software.', syn: ['focus on'] },
      { en: 'manufacture', vi: 'sản xuất', pos: 'v', ipa: 'ˌmænjəˈfæktʃə', example: 'They manufacture car parts in Hanoi.', syn: ['produce', 'make'] },
      { en: 'competitor', vi: 'đối thủ cạnh tranh', pos: 'n', ipa: 'kəmˈpetɪtə', example: 'Our main competitor just lowered their prices.', syn: ['rival'], ant: ['partner'] },
      { en: 'spell', vi: 'đánh vần', pos: 'v', ipa: 'spel', example: 'Could you spell your last name, please?', syn: [] },
      { en: 'pronounce', vi: 'phát âm', pos: 'v', ipa: 'prəˈnaʊns', example: 'How do you pronounce this word?', syn: ['say'] },
      { en: 'abroad', vi: 'ở nước ngoài', pos: 'adv', ipa: 'əˈbrɔːd', example: 'He has lived abroad for five years.', syn: ['overseas'], ant: ['at home'] },
      { en: 'greet', vi: 'chào hỏi', pos: 'v', ipa: 'ɡriːt', example: 'She greeted the guests with a smile.', syn: ['welcome'], ant: ['ignore'] },
    ],
    family_home: [
      { en: 'parents', vi: 'bố mẹ', pos: 'n', ipa: 'ˈpeərənts', example: 'My parents live in Da Nang.', syn: ['mother and father'] },
      { en: 'relative', vi: 'họ hàng', pos: 'n', ipa: 'ˈrelətɪv', example: 'We visit our relatives every Tet.', syn: ['family member'] },
      { en: 'husband', vi: 'chồng', pos: 'n', ipa: 'ˈhʌzbənd', example: 'Her husband is a teacher.', ant: ['wife'] },
      { en: 'wife', vi: 'vợ', pos: 'n', ipa: 'waɪf', example: 'His wife works at the hospital.', ant: ['husband'] },
      { en: 'neighbour', vi: 'hàng xóm', pos: 'n', ipa: 'ˈneɪbə', example: 'Our neighbours are very friendly.', syn: ['neighbor'] },
      { en: 'flat', vi: 'căn hộ', pos: 'n', ipa: 'flæt', example: 'They live in a small flat on the third floor.', syn: ['apartment'] },
      { en: 'cottage', vi: 'nhà nhỏ ở quê', pos: 'n', ipa: 'ˈkɒtɪdʒ', example: 'We rented a cottage for the weekend.', syn: ['cabin'] },
      { en: 'bedroom', vi: 'phòng ngủ', pos: 'n', ipa: 'ˈbedruːm', example: 'Our flat has two bedrooms.', syn: [] },
      { en: 'kitchen', vi: 'bếp', pos: 'n', ipa: 'ˈkɪtʃən', example: 'She is cooking in the kitchen.', syn: [] },
      { en: 'bathroom', vi: 'phòng tắm', pos: 'n', ipa: 'ˈbɑːθruːm', example: 'The bathroom is at the end of the hall.', syn: [] },
      { en: 'furniture', vi: 'đồ nội thất', pos: 'n', ipa: 'ˈfɜːnɪtʃə', example: 'We need to buy new furniture for the living room.', syn: [] },
      { en: 'wardrobe', vi: 'tủ quần áo', pos: 'n', ipa: 'ˈwɔːdrəʊb', example: 'Hang your coat in the wardrobe.', syn: ['closet'] },
      { en: 'fridge', vi: 'tủ lạnh', pos: 'n', ipa: 'frɪdʒ', example: "There's some juice in the fridge.", syn: ['refrigerator'] },
      { en: 'cupboard', vi: 'tủ đựng đồ', pos: 'n', ipa: 'ˈkʌbəd', example: 'The plates are in the cupboard above the sink.', syn: ['cabinet'] },
      { en: 'rent', vi: 'tiền thuê / thuê', pos: 'n', ipa: 'rent', example: 'We pay the rent on the first of every month.', syn: ['lease'], ant: ['own'] },
      { en: 'share', vi: 'dùng chung', pos: 'v', ipa: 'ʃeə', example: 'I share a flat with two friends.', syn: ['split'], ant: ['keep'] },
      { en: 'move in', vi: 'dọn vào', pos: 'phr', ipa: 'muːv ɪn', example: 'We moved in last Saturday.', ant: ['move out'] },
      { en: 'cosy', vi: 'ấm cúng', pos: 'adj', ipa: 'ˈkəʊzi', example: 'Their living room is small but cosy.', syn: ['snug', 'cozy'], ant: ['bleak'] },
    ],
    daily_routines: [
      { en: 'wake up', vi: 'thức dậy', pos: 'phr', ipa: 'weɪk ʌp', example: 'I wake up at 6:30 every morning.', ant: ['fall asleep'] },
      { en: 'get up', vi: 'ra khỏi giường', pos: 'phr', ipa: 'ɡet ʌp', example: 'I get up as soon as the alarm rings.', ant: ['go to bed'] },
      { en: 'have a shower', vi: 'tắm vòi sen', pos: 'phr', ipa: 'hæv ə ˈʃaʊə', example: 'I have a shower before breakfast.', syn: ['take a shower'] },
      { en: 'brush teeth', vi: 'đánh răng', pos: 'phr', ipa: 'brʌʃ tiːθ', example: 'He brushes his teeth twice a day.', syn: [] },
      { en: 'get dressed', vi: 'mặc quần áo', pos: 'phr', ipa: 'ɡet drest', example: 'She gets dressed and leaves for work.', ant: ['undress'] },
      { en: 'have breakfast', vi: 'ăn sáng', pos: 'phr', ipa: 'hæv ˈbrekfəst', example: 'I usually have breakfast at 7.', syn: [] },
      { en: 'commute', vi: 'đi làm/đi học', pos: 'v', ipa: 'kəˈmjuːt', example: 'I commute to work by bus.', syn: ['travel'] },
      { en: 'leave home', vi: 'rời khỏi nhà', pos: 'phr', ipa: 'liːv həʊm', example: 'I leave home at 7:30.', ant: ['arrive home'] },
      { en: 'arrive', vi: 'đến nơi', pos: 'v', ipa: 'əˈraɪv', example: 'We arrived at the office early.', syn: ['reach'], ant: ['leave', 'depart'] },
      { en: 'have lunch', vi: 'ăn trưa', pos: 'phr', ipa: 'hæv lʌntʃ', example: 'We have lunch at the canteen.', syn: [] },
      { en: 'take a break', vi: 'nghỉ giải lao', pos: 'phr', ipa: 'teɪk ə breɪk', example: "Let's take a short break.", syn: ['rest'] },
      { en: 'finish work', vi: 'hết giờ làm', pos: 'phr', ipa: 'ˈfɪnɪʃ wɜːk', example: 'I finish work at 6 p.m.', syn: ['clock off'], ant: ['start work'] },
      { en: 'go home', vi: 'về nhà', pos: 'phr', ipa: 'ɡəʊ həʊm', example: 'I usually go home by motorbike.', syn: [] },
      { en: 'do the housework', vi: 'làm việc nhà', pos: 'phr', ipa: 'duː ðə ˈhaʊswɜːk', example: 'I do the housework on weekends.', syn: ['clean up'] },
      { en: 'have dinner', vi: 'ăn tối', pos: 'phr', ipa: 'hæv ˈdɪnə', example: 'We have dinner together at 7.', syn: [] },
      { en: 'relax', vi: 'thư giãn', pos: 'v', ipa: 'rɪˈlæks', example: 'I like to relax with a book.', syn: ['chill', 'unwind'], ant: ['stress'] },
      { en: 'go to bed', vi: 'đi ngủ', pos: 'phr', ipa: 'ɡəʊ tə bed', example: 'I go to bed around 11.', ant: ['get up'] },
      { en: 'fall asleep', vi: 'ngủ thiếp đi', pos: 'phr', ipa: 'fɔːl əˈsliːp', example: 'I fall asleep very quickly.', ant: ['wake up'] },
    ],
    describing_people: [],
    food_restaurants: [],
    shopping_money: [],
    travel_hotels: [],
    health_feelings: [],
    weather_leisure: [],
    office_jobs: [],
    meetings_phone: [],
    social_expressions: [],
  };
})(window);
