// The creator's working language: the assistant speaks it, post descriptions are written in it, transcription listens
// for it and the settings screen shows its own text in Arabic or English to match. Arabic dialects share the Arabic
// engine (right-to-left text, Arabic typography checks); English captions render left-to-right through the same engine.

export type LanguageCode = "ar-JO" | "ar-PS" | "ar-LB" | "ar-EG" | "ar-SA" | "ar-MA" | "ar" | "en";

export interface LanguageInfo {
  code: LanguageCode;
  /** The name in the language itself, as the picker shows it. */
  label: string;
  /** The English name, for English screens and logs. */
  labelEn: string;
  /** Where it is spoken, in the language itself. */
  region: string;
  /** The whisper.cpp language code for transcription. */
  whisper: "ar" | "en";
  /** The settings screen's own text: Arabic or English. */
  ui: "ar" | "en";
  /** Text direction of captions and copy. */
  dir: "rtl" | "ltr";
  /** One caption-sized line in this language, for previews. */
  sample: string;
  /** How the assistant should speak, written for the assistant (English). */
  voice: string;
}

export const LANGUAGES: readonly LanguageInfo[] = Object.freeze([
  {code: "ar-JO", label: "أردني", labelEn: "Jordanian Arabic", region: "الأردن", whisper: "ar", ui: "ar", dir: "rtl",
    sample: "فكرتك بتستاهل تنشاف", voice: "concise Jordanian Arabic (Amman everyday speech: هيك، شو، إشي، بدّي، كثير، هسّا، زي، منيح)"},
  {code: "ar-PS", label: "فلسطيني", labelEn: "Palestinian Arabic", region: "فلسطين", whisper: "ar", ui: "ar", dir: "rtl",
    sample: "فكرتك لازم تنشاف", voice: "concise Palestinian Arabic (everyday urban speech: هيك، إشي، بدّي، كمان، هلأ، منيح، ليش)"},
  {code: "ar-LB", label: "شامي", labelEn: "Syrian & Lebanese Arabic", region: "سوريا · لبنان", whisper: "ar", ui: "ar", dir: "rtl",
    sample: "فكرتك حرام تضلّ مخبّاية", voice: "concise Syrian/Lebanese Arabic (شو، هلّق، كتير، منيح، بدّي، هيك)"},
  {code: "ar-EG", label: "مصري", labelEn: "Egyptian Arabic", region: "مصر", whisper: "ar", ui: "ar", dir: "rtl",
    sample: "فكرتك تستاهل تتشاف", voice: "concise Egyptian Arabic"},
  {code: "ar-SA", label: "خليجي", labelEn: "Gulf Arabic", region: "السعودية · الإمارات · الكويت · قطر", whisper: "ar", ui: "ar", dir: "rtl",
    sample: "فكرتك تستاهل الكل يشوفها", voice: "concise Gulf Arabic (Saudi/Emirati everyday speech)"},
  {code: "ar-MA", label: "مغاربي", labelEn: "Maghrebi Arabic", region: "المغرب · الجزائر · تونس", whisper: "ar", ui: "ar", dir: "rtl",
    sample: "الفكرة ديالك خاصها تبان", voice: "concise Maghrebi Arabic (Darija), switching to simple White Arabic when a term would be unclear"},
  {code: "ar", label: "عربي أبيض", labelEn: "White Arabic", region: "مفهوم في كل العالم العربي", whisper: "ar", ui: "ar", dir: "rtl",
    sample: "فكرتك تستحق أن تُرى", voice: "concise White Arabic: simple, neutral Arabic understood across the Arab world, close to Modern Standard"},
  {code: "en", label: "English", labelEn: "English", region: "International", whisper: "en", ui: "en", dir: "ltr",
    sample: "Your idea deserves to be seen", voice: "concise, friendly English"},
] satisfies LanguageInfo[]);

export const LANGUAGE_CODES: readonly LanguageCode[] = Object.freeze(LANGUAGES.map((item) => item.code));
/** New profiles start in Jordanian Arabic, this edition's home market; the picker is the first step of setup. */
export const DEFAULT_LANGUAGE: LanguageCode = "ar-JO";
/** Profiles written before languages existed (schema 2 and 3 from the original studio) are Egyptian. */
export const LEGACY_LANGUAGE: LanguageCode = "ar-EG";

export const isLanguageCode = (value: unknown): value is LanguageCode =>
  typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);

export function languageInfo(code: unknown): LanguageInfo {
  return LANGUAGES.find((item) => item.code === code) ?? LANGUAGES.find((item) => item.code === LEGACY_LANGUAGE)!;
}
