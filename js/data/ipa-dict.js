(function (global) {
  'use strict';

  // Base IPA dictionary (British RP) of common English words — function
  // words and high-frequency words that are NOT in the topical vocabulary.
  // Used together with VOCAB to annotate custom sentences in the
  // pronunciation drill so common words like "to / our / the / sales" show
  // IPA instead of appearing bare. Standard reference pronunciations.

  global.IPA_DICT = {
    // articles / determiners
    a: 'ə', an: 'æn', the: 'ðə', this: 'ðɪs', that: 'ðæt', these: 'ðiːz', those: 'ðəʊz',
    some: 'sʌm', any: 'ˈeni', each: 'iːtʃ', every: 'ˈevri', all: 'ɔːl', both: 'bəʊθ',
    no: 'nəʊ', none: 'nʌn', much: 'mʌtʃ', many: 'ˈmeni', more: 'mɔː', most: 'məʊst',
    // pronouns
    i: 'aɪ', you: 'juː', he: 'hiː', she: 'ʃiː', it: 'ɪt', we: 'wiː', they: 'ðeɪ',
    me: 'miː', him: 'hɪm', her: 'hɜː', us: 'ʌs', them: 'ðem',
    my: 'maɪ', your: 'jɔː', his: 'hɪz', its: 'ɪts', our: 'ˈaʊə', their: 'ðeə',
    mine: 'maɪn', yours: 'jɔːz', myself: 'maɪˈself', yourself: 'jɔːˈself',
    who: 'huː', whom: 'huːm', whose: 'huːz', which: 'wɪtʃ', what: 'wɒt',
    // be / have / do / modals
    am: 'æm', is: 'ɪz', are: 'ɑː', was: 'wɒz', were: 'wɜː', be: 'biː', been: 'biːn', being: 'ˈbiːɪŋ',
    have: 'hæv', has: 'hæz', had: 'hæd', having: 'ˈhævɪŋ',
    do: 'duː', does: 'dʌz', did: 'dɪd', done: 'dʌn', doing: 'ˈduːɪŋ',
    will: 'wɪl', would: 'wʊd', shall: 'ʃæl', should: 'ʃʊd', can: 'kæn', could: 'kʊd',
    may: 'meɪ', might: 'maɪt', must: 'mʌst', ought: 'ɔːt', need: 'niːd', let: 'let',
    // prepositions / conjunctions
    to: 'tuː', of: 'ɒv', in: 'ɪn', on: 'ɒn', at: 'æt', by: 'baɪ', for: 'fɔː', from: 'frɒm',
    with: 'wɪð', without: 'wɪˈðaʊt', about: 'əˈbaʊt', into: 'ˈɪntuː', onto: 'ˈɒntuː',
    over: 'ˈəʊvə', under: 'ˈʌndə', above: 'əˈbʌv', below: 'bɪˈləʊ', between: 'bɪˈtwiːn',
    through: 'θruː', during: 'ˈdjʊərɪŋ', before: 'bɪˈfɔː', after: 'ˈɑːftə', until: 'ənˈtɪl',
    up: 'ʌp', down: 'daʊn', out: 'aʊt', off: 'ɒf', near: 'nɪə', around: 'əˈraʊnd',
    and: 'ænd', or: 'ɔː', but: 'bʌt', so: 'səʊ', because: 'bɪˈkɒz', if: 'ɪf', then: 'ðen',
    than: 'ðæn', as: 'æz', while: 'waɪl', when: 'wen', where: 'weə', why: 'waɪ', how: 'haʊ',
    also: 'ˈɔːlsəʊ', too: 'tuː', very: 'ˈveri', just: 'dʒʌst', only: 'ˈəʊnli', even: 'ˈiːvn',
    // common verbs
    go: 'ɡəʊ', going: 'ˈɡəʊɪŋ', get: 'ɡet', got: 'ɡɒt', make: 'meɪk', made: 'meɪd',
    take: 'teɪk', took: 'tʊk', come: 'kʌm', came: 'keɪm', see: 'siː', saw: 'sɔː', seen: 'siːn',
    know: 'nəʊ', knew: 'njuː', think: 'θɪŋk', want: 'wɒnt', give: 'ɡɪv', gave: 'ɡeɪv',
    find: 'faɪnd', tell: 'tel', told: 'təʊld', say: 'seɪ', said: 'sed', ask: 'ɑːsk',
    work: 'wɜːk', call: 'kɔːl', try: 'traɪ', use: 'juːz', feel: 'fiːl', felt: 'felt',
    keep: 'kiːp', put: 'pʊt', mean: 'miːn', show: 'ʃəʊ', help: 'help', turn: 'tɜːn',
    start: 'stɑːt', bring: 'brɪŋ', begin: 'bɪˈɡɪn', wait: 'weɪt', stop: 'stɒp', hold: 'həʊld',
    check: 'tʃek', follow: 'ˈfɒləʊ', return: 'rɪˈtɜːn', please: 'pliːz', thank: 'θæŋk', thanks: 'θæŋks',
    welcome: 'ˈwelkəm', sorry: 'ˈsɒri', enjoy: 'ɪnˈdʒɔɪ', remain: 'rɪˈmeɪn', fasten: 'ˈfɑːsn',
    // common nouns
    time: 'taɪm', day: 'deɪ', year: 'jɪə', people: 'ˈpiːpl', way: 'weɪ', man: 'mæn', woman: 'ˈwʊmən',
    thing: 'θɪŋ', life: 'laɪf', hand: 'hænd', part: 'pɑːt', place: 'pleɪs', week: 'wiːk',
    company: 'ˈkʌmpəni', number: 'ˈnʌmbə', group: 'ɡruːp', problem: 'ˈprɒbləm', name: 'neɪm',
    home: 'həʊm', water: 'ˈwɔːtə', room: 'ruːm', seat: 'siːt', flight: 'flaɪt', plane: 'pleɪn',
    sales: 'seɪlz', sale: 'seɪl', team: 'tiːm', staff: 'stɑːf', customer: 'ˈkʌstəmə',
    morning: 'ˈmɔːnɪŋ', evening: 'ˈiːvnɪŋ', afternoon: 'ˌɑːftəˈnuːn', night: 'naɪt', today: 'təˈdeɪ',
    // adjectives / adverbs
    good: 'ɡʊd', great: 'ɡreɪt', new: 'njuː', old: 'əʊld', first: 'fɜːst', last: 'lɑːst',
    long: 'lɒŋ', little: 'ˈlɪtl', own: 'əʊn', right: 'raɪt', left: 'left', big: 'bɪɡ',
    high: 'haɪ', small: 'smɔːl', large: 'lɑːdʒ', next: 'nekst', early: 'ˈɜːli', young: 'jʌŋ',
    important: 'ɪmˈpɔːtnt', few: 'fjuː', public: 'ˈpʌblɪk', bad: 'bæd', same: 'seɪm', able: 'ˈeɪbl',
    here: 'hɪə', there: 'ðeə', now: 'naʊ', well: 'wel', back: 'bæk', again: 'əˈɡen',
    always: 'ˈɔːlweɪz', never: 'ˈnevə', really: 'ˈrɪəli', still: 'stɪl', hot: 'hɒt', cold: 'kəʊld',
    // numbers
    one: 'wʌn', two: 'tuː', three: 'θriː', four: 'fɔː', five: 'faɪv', six: 'sɪks',
    seven: 'ˈsevn', eight: 'eɪt', nine: 'naɪn', ten: 'ten', hundred: 'ˈhʌndrəd', thousand: 'ˈθaʊznd',
    // polite / interview fillers
    hello: 'həˈləʊ', hi: 'haɪ', goodbye: 'ɡʊdˈbaɪ', okay: 'ˌəʊˈkeɪ', yes: 'jes', not: 'nɒt',
    excuse: 'ɪkˈskjuːs', pardon: 'ˈpɑːdn', certainly: 'ˈsɜːtnli', absolutely: 'ˌæbsəˈluːtli',
    ready: 'ˈredi', sure: 'ʃʊə', fine: 'faɪn', nice: 'naɪs', happy: 'ˈhæpi', glad: 'ɡlæd',
    love: 'lʌv', like: 'laɪk', hope: 'həʊp', wish: 'wɪʃ', best: 'best', better: 'ˈbetə',
    every: 'ˈevri', everything: 'ˈevriθɪŋ', anything: 'ˈeniθɪŋ', something: 'ˈsʌmθɪŋ', nothing: 'ˈnʌθɪŋ',
    someone: 'ˈsʌmwʌn', everyone: 'ˈevriwʌn', anyone: 'ˈeniwʌn', myself: 'maɪˈself',
    airline: 'ˈeəlaɪn', airport: 'ˈeəpɔːt', ticket: 'ˈtɪkɪt', luggage: 'ˈlʌɡɪdʒ', baggage: 'ˈbæɡɪdʒ',
    journey: 'ˈdʒɜːni', trip: 'trɪp', travel: 'ˈtrævl', arrive: 'əˈraɪv', depart: 'dɪˈpɑːt',
    experience: 'ɪkˈspɪəriəns', confident: 'ˈkɒnfɪdənt', friendly: 'ˈfrendli', person: 'ˈpɜːsn',
    people: 'ˈpiːpl', pleasure: 'ˈpleʒə', comfortable: 'ˈkʌmftəbl', pleasant: 'ˈpleznt',
  };
})(window);
