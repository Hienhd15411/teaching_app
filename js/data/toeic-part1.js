(function () {
  'use strict';
  if (typeof TOEIC === 'undefined') return;

  // Part 1 · Photos — actions, positions, everyday/workplace objects.
  // Curated from public TOEIC prep materials (600 Essential Words for
  // TOEIC, Oxford/Longman TOEIC, onestopenglish, estudyme). Not ETS.

  // ---- 2023 edition ----
  TOEIC.setPart('2023', 'part1', 'keywords', [
    { en: 'reach for', vi: 'với tới', pos: 'phr', ipa: 'riːtʃ fɔː', example: 'A man is reaching for a book on the shelf.' },
    { en: 'face each other', vi: 'đối diện nhau', pos: 'phr', ipa: 'feɪs iːtʃ ˈʌðə', example: 'Two people are facing each other across a table.' },
    { en: 'lean against', vi: 'tựa vào', pos: 'phr', ipa: 'liːn əˈɡenst', example: 'A woman is leaning against the wall.' },
    { en: 'load', vi: 'chất (hàng)', pos: 'v', ipa: 'ləʊd', example: 'They are loading boxes into the truck.', ant: ['unload'] },
    { en: 'point at', vi: 'chỉ vào', pos: 'phr', ipa: 'pɔɪnt æt', example: 'The speaker is pointing at the screen.' },
    { en: 'carry', vi: 'mang, xách', pos: 'v', ipa: 'ˈkæri', example: 'He is carrying a large package.' },
    { en: 'arrange', vi: 'sắp xếp', pos: 'v', ipa: 'əˈreɪndʒ', example: 'The waiter is arranging glasses on the tray.', syn: ['organize'] },
    { en: 'examine', vi: 'kiểm tra', pos: 'v', ipa: 'ɪɡˈzæmɪn', example: 'The technician is examining the machine.', syn: ['inspect'] },
    { en: 'stack', vi: 'xếp chồng', pos: 'v', ipa: 'stæk', example: 'Crates are stacked near the wall.', syn: ['pile'] },
    { en: 'pedestrian', vi: 'người đi bộ', pos: 'n', ipa: 'pəˈdestriən', example: 'Pedestrians are crossing the street.' },
  ]);
  TOEIC.setPart('2023', 'part1', 'highFreq', [
    { en: 'desk', vi: 'bàn làm việc', pos: 'n', ipa: 'desk', example: 'Papers are spread across the desk.' },
    { en: 'shelf', vi: 'kệ', pos: 'n', ipa: 'ʃelf', example: 'The books are on the shelf.' },
    { en: 'aisle', vi: 'lối đi giữa kệ', pos: 'n', ipa: 'aɪl', example: 'A shopper is walking down the aisle.' },
    { en: 'counter', vi: 'quầy', pos: 'n', ipa: 'ˈkaʊntə', example: 'The cashier is at the counter.' },
    { en: 'crate', vi: 'thùng gỗ', pos: 'n', ipa: 'kreɪt', example: 'Crates are stacked on the pallet.', syn: ['box'] },
    { en: 'pallet', vi: 'pa-lét', pos: 'n', ipa: 'ˈpælət', example: 'A forklift is lifting a pallet.' },
    { en: 'vehicle', vi: 'phương tiện', pos: 'n', ipa: 'ˈviːəkl', example: 'Vehicles are parked along the street.' },
    { en: 'curb', vi: 'lề đường', pos: 'n', ipa: 'kɜːb', example: 'The taxi pulled up to the curb.' },
    { en: 'railing', vi: 'lan can', pos: 'n', ipa: 'ˈreɪlɪŋ', example: 'She is holding the railing.' },
    { en: 'corridor', vi: 'hành lang', pos: 'n', ipa: 'ˈkɒrɪdɔː', example: 'People are walking down the corridor.', syn: ['hallway'] },
    { en: 'pile', vi: 'chồng (đồ)', pos: 'n', ipa: 'paɪl', example: 'A pile of papers is on the desk.' },
    { en: 'row', vi: 'hàng', pos: 'n', ipa: 'rəʊ', example: 'Chairs are arranged in a row.' },
    { en: 'across from', vi: 'đối diện', pos: 'phr', ipa: 'əˈkrɒs frəm', example: 'She is sitting across from her colleague.', syn: ['opposite'] },
    { en: 'next to', vi: 'bên cạnh', pos: 'phr', ipa: 'nekst tuː', example: 'The lamp is next to the monitor.', syn: ['beside'] },
    { en: 'in front of', vi: 'phía trước', pos: 'phr', ipa: 'ɪn frʌnt əv', example: 'A bicycle is parked in front of the building.', ant: ['behind'] },
    { en: 'sweep', vi: 'quét', pos: 'v', ipa: 'swiːp', example: 'A worker is sweeping the floor.' },
    { en: 'unload', vi: 'dỡ (hàng)', pos: 'v', ipa: 'ˌʌnˈləʊd', example: 'Workers are unloading cargo.', ant: ['load'] },
    { en: 'gather', vi: 'tụ họp', pos: 'v', ipa: 'ˈɡæðə', example: 'A crowd is gathering on the sidewalk.' },
    { en: 'face', vi: 'quay mặt về', pos: 'v', ipa: 'feɪs', example: 'The seats face the stage.' },
    { en: 'install', vi: 'lắp đặt', pos: 'v', ipa: 'ɪnˈstɔːl', example: 'A worker is installing the sign.' },
    { en: 'display', vi: 'trưng bày', pos: 'v', ipa: 'dɪˈspleɪ', example: 'Flowers are displayed in the window.' },
    { en: 'occupy', vi: 'chiếm chỗ', pos: 'v', ipa: 'ˈɒkjəpaɪ', example: 'Every seat is occupied.' },
    { en: 'push', vi: 'đẩy', pos: 'v', ipa: 'pʊʃ', example: 'A man is pushing a cart.', ant: ['pull'] },
    { en: 'type', vi: 'gõ (phím)', pos: 'v', ipa: 'taɪp', example: 'She is typing on a keyboard.' },
    { en: 'pour', vi: 'rót', pos: 'v', ipa: 'pɔː', example: 'He is pouring water into a glass.' },
  ]);

  // ---- 2024 edition ----
  TOEIC.setPart('2024', 'part1', 'keywords', [
    { en: 'inspect', vi: 'thanh tra, kiểm tra', pos: 'v', ipa: 'ɪnˈspekt', example: 'An engineer is inspecting the equipment.', syn: ['examine'] },
    { en: 'overlook', vi: 'nhìn ra (hướng)', pos: 'v', ipa: 'ˌəʊvəˈlʊk', example: 'The balcony overlooks the park.' },
    { en: 'attend to', vi: 'để tâm, phục vụ', pos: 'phr', ipa: 'əˈtend tuː', example: 'A clerk is attending to a customer.' },
    { en: 'hand out', vi: 'phát tài liệu', pos: 'phr', ipa: 'hænd aʊt', example: 'He is handing out brochures.', syn: ['distribute'] },
    { en: 'set up', vi: 'thiết lập, bày', pos: 'phr', ipa: 'set ʌp', example: 'Workers are setting up chairs.' },
    { en: 'wear protective gear', vi: 'mặc đồ bảo hộ', pos: 'phr', ipa: 'weə prəˈtektɪv ɡɪə', example: 'The workers are wearing protective gear.' },
    { en: 'operate', vi: 'vận hành', pos: 'v', ipa: 'ˈɒpəreɪt', example: 'A technician is operating the machine.' },
    { en: 'gesture', vi: 'ra hiệu', pos: 'v', ipa: 'ˈdʒestʃə', example: 'The manager is gesturing toward the screen.' },
    { en: 'browse', vi: 'xem lướt', pos: 'v', ipa: 'braʊz', example: 'Customers are browsing through the shelves.' },
    { en: 'adjust', vi: 'điều chỉnh', pos: 'v', ipa: 'əˈdʒʌst', example: 'She is adjusting the microphone.' },
  ]);
  TOEIC.setPart('2024', 'part1', 'highFreq', [
    { en: 'podium', vi: 'bục phát biểu', pos: 'n', ipa: 'ˈpəʊdiəm', example: 'A speaker is standing at the podium.' },
    { en: 'workstation', vi: 'bàn làm việc', pos: 'n', ipa: 'ˈwɜːksteɪʃn', example: 'Each workstation has a monitor.' },
    { en: 'forklift', vi: 'xe nâng', pos: 'n', ipa: 'ˈfɔːklɪft', example: 'A forklift is lifting a crate.' },
    { en: 'warehouse', vi: 'kho hàng', pos: 'n', ipa: 'ˈweəhaʊs', example: 'Boxes are stored in the warehouse.' },
    { en: 'construction site', vi: 'công trường', pos: 'n', ipa: 'kənˈstrʌkʃn saɪt', example: 'Workers are at the construction site.' },
    { en: 'conveyor belt', vi: 'băng chuyền', pos: 'n', ipa: 'kənˈveɪə belt', example: 'Packages move along the conveyor belt.' },
    { en: 'platform', vi: 'sân ga', pos: 'n', ipa: 'ˈplætfɔːm', example: 'Passengers are waiting on the platform.' },
    { en: 'tray', vi: 'khay', pos: 'n', ipa: 'treɪ', example: 'A waiter is carrying a tray.' },
    { en: 'handrail', vi: 'tay vịn', pos: 'n', ipa: 'ˈhændreɪl', example: 'He is holding the handrail.' },
    { en: 'lamp', vi: 'đèn bàn', pos: 'n', ipa: 'læmp', example: 'A lamp is on the desk.' },
    { en: 'at the edge of', vi: 'ở mép', pos: 'phr', ipa: 'æt ði edʒ əv', example: 'Cups sit at the edge of the table.' },
    { en: 'on either side of', vi: 'hai bên', pos: 'phr', ipa: 'ɒn ˈaɪðə saɪd əv', example: 'Trees stand on either side of the road.' },
    { en: 'along the wall', vi: 'dọc theo tường', pos: 'phr', ipa: 'əˈlɒŋ ðə wɔːl', example: 'Shelves run along the wall.' },
    { en: 'bend down', vi: 'cúi xuống', pos: 'phr', ipa: 'bend daʊn', example: 'A worker is bending down to pick up a box.' },
    { en: 'assemble', vi: 'lắp ráp', pos: 'v', ipa: 'əˈsembl', example: 'Workers are assembling furniture.' },
    { en: 'demonstrate', vi: 'thị phạm', pos: 'v', ipa: 'ˈdemənstreɪt', example: 'The instructor is demonstrating the device.' },
    { en: 'face toward', vi: 'quay về phía', pos: 'phr', ipa: 'feɪs təˈwɔːd', example: 'Chairs face toward the projector.' },
    { en: 'water', vi: 'tưới', pos: 'v', ipa: 'ˈwɔːtə', example: 'A gardener is watering the plants.' },
    { en: 'sort', vi: 'phân loại', pos: 'v', ipa: 'sɔːt', example: 'She is sorting files into folders.' },
    { en: 'pack', vi: 'đóng gói', pos: 'v', ipa: 'pæk', example: 'Workers are packing items into boxes.' },
    { en: 'tie', vi: 'buộc', pos: 'v', ipa: 'taɪ', example: 'He is tying the rope to the pole.' },
    { en: 'paint', vi: 'sơn', pos: 'v', ipa: 'peɪnt', example: 'A worker is painting the wall.' },
    { en: 'vend', vi: 'bán', pos: 'v', ipa: 'vend', example: 'A street vendor is vending fresh fruit.', syn: ['sell'] },
    { en: 'wipe', vi: 'lau', pos: 'v', ipa: 'waɪp', example: 'A cleaner is wiping the counter.' },
    { en: 'clutch', vi: 'nắm chặt', pos: 'v', ipa: 'klʌtʃ', example: 'She is clutching a bag.' },
  ]);

  // ---- 2026 edition ----
  TOEIC.setPart('2026', 'part1', 'keywords', [
    { en: 'disembark', vi: 'xuống tàu/máy bay', pos: 'v', ipa: 'ˌdɪsɪmˈbɑːk', example: 'Passengers are disembarking from the ferry.', ant: ['board'] },
    { en: 'board', vi: 'lên tàu/xe/máy bay', pos: 'v', ipa: 'bɔːd', example: 'Passengers are boarding the train.', ant: ['disembark'] },
    { en: 'distribute', vi: 'phân phát', pos: 'v', ipa: 'dɪˈstrɪbjuːt', example: 'Staff are distributing meals.', syn: ['hand out'] },
    { en: 'bend over', vi: 'cúi người', pos: 'phr', ipa: 'bend ˈəʊvə', example: 'A worker is bending over a package.' },
    { en: 'kneel', vi: 'quỳ gối', pos: 'v', ipa: 'niːl', example: 'He is kneeling to tie his shoes.' },
    { en: 'be engaged in', vi: 'đang bận làm', pos: 'phr', ipa: 'bi ɪnˈɡeɪdʒd ɪn', example: 'Workers are engaged in a meeting.' },
    { en: 'cast a shadow', vi: 'in bóng', pos: 'phr', ipa: 'kɑːst ə ˈʃædəʊ', example: 'The tree casts a shadow on the lawn.' },
    { en: 'be mounted on', vi: 'gắn trên', pos: 'phr', ipa: 'bi ˈmaʊntɪd ɒn', example: 'A screen is mounted on the wall.' },
    { en: 'ascend', vi: 'đi lên', pos: 'v', ipa: 'əˈsend', example: 'People are ascending the staircase.', ant: ['descend'] },
    { en: 'descend', vi: 'đi xuống', pos: 'v', ipa: 'dɪˈsend', example: 'She is descending the stairs.', ant: ['ascend'] },
  ]);
  TOEIC.setPart('2026', 'part1', 'highFreq', [
    { en: 'loading dock', vi: 'bến bốc xếp', pos: 'n', ipa: 'ˈləʊdɪŋ dɒk', example: 'Trucks are parked at the loading dock.' },
    { en: 'passenger', vi: 'hành khách', pos: 'n', ipa: 'ˈpæsɪndʒə', example: 'Passengers are lining up to board.' },
    { en: 'sidewalk', vi: 'vỉa hè', pos: 'n', ipa: 'ˈsaɪdwɔːk', example: 'Pedestrians are walking on the sidewalk.', syn: ['pavement'] },
    { en: 'awning', vi: 'mái hiên', pos: 'n', ipa: 'ˈɔːnɪŋ', example: 'A red awning hangs over the café.' },
    { en: 'crosswalk', vi: 'vạch kẻ đường', pos: 'n', ipa: 'ˈkrɒswɔːk', example: 'People are using the crosswalk.' },
    { en: 'bench', vi: 'ghế dài', pos: 'n', ipa: 'bentʃ', example: 'A man is sitting on a bench.' },
    { en: 'fountain', vi: 'đài phun nước', pos: 'n', ipa: 'ˈfaʊntən', example: 'A fountain stands in the middle of the square.' },
    { en: 'ladder', vi: 'cái thang', pos: 'n', ipa: 'ˈlædə', example: 'A worker is climbing a ladder.' },
    { en: 'umbrella', vi: 'cái ô', pos: 'n', ipa: 'ʌmˈbrelə', example: 'A woman is holding an umbrella.' },
    { en: 'railing', vi: 'lan can', pos: 'n', ipa: 'ˈreɪlɪŋ', example: 'He is leaning on the railing.' },
    { en: 'overhead', vi: 'phía trên đầu', pos: 'adj', ipa: 'ˌəʊvəˈhed', example: 'An overhead sign marks the exit.' },
    { en: 'beside', vi: 'bên cạnh', pos: 'prep', ipa: 'bɪˈsaɪd', example: 'A bag is placed beside the chair.', syn: ['next to'] },
    { en: 'beneath', vi: 'phía dưới', pos: 'prep', ipa: 'bɪˈniːθ', example: 'A dog is resting beneath the table.', syn: ['under'] },
    { en: 'alongside', vi: 'song song, bên cạnh', pos: 'prep', ipa: 'əˈlɒŋˈsaɪd', example: 'Cars are parked alongside the road.' },
    { en: 'sign', vi: 'biển báo', pos: 'n', ipa: 'saɪn', example: 'A neon sign is above the shop.' },
    { en: 'hang', vi: 'treo', pos: 'v', ipa: 'hæŋ', example: 'A picture is hanging on the wall.' },
    { en: 'steer', vi: 'lái', pos: 'v', ipa: 'stɪə', example: 'He is steering the boat.' },
    { en: 'wheel', vi: 'đẩy (có bánh)', pos: 'v', ipa: 'wiːl', example: 'A porter is wheeling luggage.' },
    { en: 'vendor', vi: 'người bán rong', pos: 'n', ipa: 'ˈvendə', example: 'A vendor is selling fruit.' },
    { en: 'cart', vi: 'xe đẩy', pos: 'n', ipa: 'kɑːt', example: 'A shopping cart is blocking the aisle.' },
    { en: 'container', vi: 'thùng chứa', pos: 'n', ipa: 'kənˈteɪnə', example: 'Containers are stacked on the dock.' },
    { en: 'column', vi: 'cột', pos: 'n', ipa: 'ˈkɒləm', example: 'Stone columns line the hallway.' },
    { en: 'balcony', vi: 'ban công', pos: 'n', ipa: 'ˈbælkəni', example: 'People are standing on the balcony.' },
    { en: 'cabinet', vi: 'tủ có ngăn', pos: 'n', ipa: 'ˈkæbɪnət', example: 'Files are stored in the cabinet.' },
    { en: 'statue', vi: 'bức tượng', pos: 'n', ipa: 'ˈstætʃuː', example: 'A statue stands in the park.' },
  ]);
})();
