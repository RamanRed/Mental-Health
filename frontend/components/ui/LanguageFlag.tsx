export type LanguageOption = { code: "en" | "hi" | "kn" | "ta" | "mr"; flag: string; nativeName: string; englishName: string };

export const languageOptions: LanguageOption[] = [
  { code: "en", flag: "🇮🇳", nativeName: "English", englishName: "English" },
  { code: "hi", flag: "🇮🇳", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "kn", flag: "🇮🇳", nativeName: "ಕನ್ನಡ", englishName: "Kannada" },
  { code: "ta", flag: "🇮🇳", nativeName: "தமிழ்", englishName: "Tamil" },
  { code: "mr", flag: "🇮🇳", nativeName: "मराठी", englishName: "Marathi" },
];

export function LanguageFlag({ option }: { option: LanguageOption }) {
  return (
    <span className="flex items-center gap-3">
      <span className="text-2xl" aria-hidden="true">{option.flag}</span>
      <span>
        <span className="block font-semibold">{option.nativeName}</span>
        <span className="block text-xs text-muted-foreground">{option.englishName}</span>
      </span>
    </span>
  );
}
