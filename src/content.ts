import type { Lang } from './i18n/strings';

export type GameId = 'runner' | 'glider' | 'rocket' | 'kart' | 'hoops' | 'blaster' | 'reef' | 'garden';

type L = Record<Lang, string>;

export const GAMES: { id: GameId; name: L; blurb: L }[] = [
  {
    id: 'runner',
    name: { en: 'Rail Rush', ta: 'ரயில் ஓட்டம்', hi: 'रेल रश' },
    blurb: { en: 'Sprint the tracks and grab every coin.', ta: 'தண்டவாளத்தில் ஓடி நாணயங்களைச் சேகரியுங்கள்.', hi: 'पटरियों पर दौड़ें, हर सिक्का पकड़ें।' },
  },
  {
    id: 'glider',
    name: { en: 'Sky Glider', ta: 'வான் சறுக்கி', hi: 'स्काई ग्लाइडर' },
    blurb: { en: 'Soar up and fly through golden rings.', ta: 'உயரப் பறந்து தங்க வளையங்களைக் கடங்கள்.', hi: 'ऊँचा उड़ें, सुनहरे छल्लों से गुज़रें।' },
  },
  {
    id: 'rocket',
    name: { en: 'Rocket Climb', ta: 'ராக்கெட் ஏற்றம்', hi: 'रॉकेट उड़ान' },
    blurb: { en: 'Blast off from Earth to the stars.', ta: 'பூமியிலிருந்து நட்சத்திரங்கள் வரை பறங்கள்.', hi: 'धरती से तारों तक उड़ान भरें।' },
  },
  {
    id: 'kart',
    name: { en: 'Turbo Kart', ta: 'டர்போ கார்ட்', hi: 'टर्बो कार्ट' },
    blurb: { en: 'Attention is your turbo — pass the rival!', ta: 'கவனமே டர்போ — போட்டியாளரை முந்துங்கள்!', hi: 'ध्यान ही टर्बो है — आगे निकलें!' },
  },
  {
    id: 'hoops',
    name: { en: 'Hoop Shot', ta: 'கூடைப்பந்து', hi: 'हूप शॉट' },
    blurb: { en: 'Charge your power and sink the shot.', ta: 'சக்தியை நிரப்பி பந்தைக் கூடையில் போடுங்கள்.', hi: 'ताक़त भरें, गेंद बास्केट में डालें।' },
  },
  {
    id: 'blaster',
    name: { en: 'Star Blaster', ta: 'நட்சத்திர வீரன்', hi: 'स्टार ब्लास्टर' },
    blurb: { en: 'Hold your attention to clear the asteroids.', ta: 'கவனத்தால் விண்கற்களை அழியுங்கள்.', hi: 'ध्यान से उल्कापिंड हटाएँ।' },
  },
  {
    id: 'reef',
    name: { en: 'Reef Friends', ta: 'பவள நண்பர்கள்', hi: 'रीफ़ दोस्त' },
    blurb: { en: 'Swim, eat bubbles, build a school.', ta: 'நீந்துங்கள், குமிழ்களை உண்டு நண்பர்களைச் சேருங்கள்.', hi: 'तैरें, बुलबुले खाएँ, दोस्त जोड़ें।' },
  },
  {
    id: 'garden',
    name: { en: 'Magic Garden', ta: 'மாய தோட்டம்', hi: 'जादुई बगीचा' },
    blurb: { en: 'Grow a garden, flower by flower.', ta: 'பூ பூவாகத் தோட்டத்தை வளருங்கள்.', hi: 'फूल-फूल करके बगीचा उगाएँ।' },
  },
];

export const gameName = (id: string, lang: Lang) => GAMES.find((g) => g.id === id)?.name[lang] ?? id;

export type Stage = { id: string; name: L; sessions: number };

export const JOURNEY = {
  id: 'journey',
  name: { en: 'The Focus Journey', ta: 'கவனப் பயணம்', hi: 'ध्यान यात्रा' } as L,
  stages: [
    { id: 'first-steps', name: { en: 'First Steps', ta: 'முதல் அடிகள்', hi: 'पहले क़दम' }, sessions: 10 },
    { id: 'steady-mind', name: { en: 'Steady Mind', ta: 'நிலையான மனம்', hi: 'स्थिर मन' }, sessions: 20 },
  ] as Stage[],
};

export const TOTAL_SESSIONS = JOURNEY.stages.reduce((s, x) => s + x.sessions, 0);
export const ACTIVITIES_PER_SESSION = 10;
export const ACTIVITY_SECONDS = 120;
export const PAUSE_LIMIT_SECONDS = 120;

export const SURVEY: L[] = [
  { en: 'I lose track of what I was doing when something else catches my eye.', ta: 'வேறு ஏதாவது கண்ணில் பட்டால் செய்துகொண்டிருந்ததை மறந்துவிடுகிறேன்.', hi: 'कुछ और दिखते ही मैं भूल जाता/जाती हूँ कि क्या कर रहा/रही था/थी।' },
  { en: 'Reading a page twice before it sinks in.', ta: 'ஒரு பக்கம் புரிய இருமுறை படிக்க வேண்டியிருக்கிறது.', hi: 'समझने के लिए एक पन्ना दो बार पढ़ना पड़ता है।' },
  { en: 'Leaving tasks unfinished when they get boring.', ta: 'சலிப்பானதும் வேலைகளைப் பாதியில் விடுகிறேன்.', hi: 'ऊब होने पर काम अधूरा छोड़ देता/देती हूँ।' },
  { en: 'Forgetting instructions soon after hearing them.', ta: 'கேட்ட சிறிது நேரத்தில் அறிவுறுத்தல்களை மறந்துவிடுகிறேன்.', hi: 'सुनने के कुछ देर बाद निर्देश भूल जाता/जाती हूँ।' },
  { en: 'Daydreaming during lessons, meetings or conversations.', ta: 'பாடங்கள், கூட்டங்கள், உரையாடல்களின் போது கனவு காண்கிறேன்.', hi: 'पाठ, मीटिंग या बातचीत के दौरान खोया/खोई रहता/रहती हूँ।' },
  { en: 'Making careless mistakes in homework or work.', ta: 'வீட்டுப்பாடம் அல்லது வேலையில் கவனக்குறைவான தவறுகள் செய்கிறேன்.', hi: 'होमवर्क या काम में लापरवाही की ग़लतियाँ करता/करती हूँ।' },
  { en: 'Struggling to start tasks that need a lot of thinking.', ta: 'அதிகம் சிந்திக்க வேண்டிய வேலைகளைத் தொடங்கச் சிரமப்படுகிறேன்.', hi: 'ज़्यादा सोचने वाले काम शुरू करने में मुश्किल होती है।' },
  { en: 'Misplacing things I need every day.', ta: 'தினமும் தேவையான பொருட்களைத் தொலைத்துவிடுகிறேன்.', hi: 'रोज़ की ज़रूरी चीज़ें इधर-उधर रख देता/देती हूँ।' },
  { en: 'Fidgeting or getting up when I should stay seated.', ta: 'அமர்ந்திருக்க வேண்டியபோது நெளிகிறேன் அல்லது எழுந்துவிடுகிறேன்.', hi: 'बैठे रहना चाहिए तब भी हिलता-डुलता या उठ जाता/जाती हूँ।' },
  { en: 'Jumping between activities without finishing any.', ta: 'எதையும் முடிக்காமல் ஒரு செயலிலிருந்து மற்றொன்றுக்குத் தாவுகிறேன்.', hi: 'कुछ पूरा किए बिना एक काम से दूसरे पर कूद जाता/जाती हूँ।' },
  { en: 'Finding it hard to listen when someone talks to me directly.', ta: 'யாராவது என்னிடம் நேரடியாகப் பேசும்போது கேட்பது கடினமாக இருக்கிறது.', hi: 'कोई सीधे बात करे तब भी सुनना कठिन लगता है।' },
  { en: 'Getting distracted by small noises.', ta: 'சிறிய சத்தங்களால் கவனம் சிதறுகிறது.', hi: 'छोटी आवाज़ों से ध्यान भटक जाता है।' },
  { en: 'Losing focus halfway through a game or film.', ta: 'விளையாட்டு அல்லது படத்தின் பாதியில் கவனம் இழக்கிறேன்.', hi: 'खेल या फ़िल्म के बीच में ध्यान खो देता/देती हूँ।' },
  { en: 'Having trouble organising my day or my bag.', ta: 'என் நாளையோ பையையோ ஒழுங்குபடுத்தச் சிரமப்படுகிறேன்.', hi: 'दिन या बस्ता व्यवस्थित करने में दिक़्क़त होती है।' },
  { en: 'Interrupting others or answering before the question ends.', ta: 'மற்றவர்களை இடைமறிக்கிறேன் அல்லது கேள்வி முடியும் முன் பதில் சொல்கிறேன்.', hi: 'दूसरों को टोकता/टोकती हूँ या सवाल पूरा होने से पहले जवाब देता/देती हूँ।' },
  { en: 'Feeling restless or "on the go" inside.', ta: 'உள்ளுக்குள் அமைதியின்றி பரபரப்பாக உணர்கிறேன்.', hi: 'अंदर से बेचैनी या हड़बड़ी महसूस होती है।' },
  { en: 'Putting off homework or chores until the last minute.', ta: 'வீட்டுப்பாடம் அல்லது வேலைகளைக் கடைசி நிமிடம் வரை தள்ளிப்போடுகிறேன்.', hi: 'होमवर्क या काम आख़िरी मिनट तक टालता/टालती हूँ।' },
  { en: 'Finding it hard to wait for my turn.', ta: 'என் முறைக்குக் காத்திருப்பது கடினமாக இருக்கிறது.', hi: 'अपनी बारी का इंतज़ार करना कठिन लगता है।' },
  { en: 'Feeling mentally tired after a short time of concentrating.', ta: 'சிறிது நேரம் கவனம் செலுத்தியதும் மனச்சோர்வு அடைகிறேன்.', hi: 'थोड़ी देर ध्यान लगाने के बाद मानसिक थकान होती है।' },
  { en: 'Struggling to calm down after getting upset or excited.', ta: 'வருத்தம் அல்லது உற்சாகத்திற்குப் பின் அமைதியடையச் சிரமப்படுகிறேன்.', hi: 'परेशान या उत्साहित होने के बाद शांत होने में मुश्किल होती है।' },
];

export const COUNTRIES = ['India', 'Sri Lanka', 'Singapore', 'Malaysia', 'United Arab Emirates', 'United Kingdom', 'United States', 'Other'];
