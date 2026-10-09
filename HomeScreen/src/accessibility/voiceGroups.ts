import type {Voice} from 'expo-speech';

const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'Arabic', bn: 'Bengali', cs: 'Czech', da: 'Danish', de: 'German', el: 'Greek', en: 'English',
  es: 'Spanish', fi: 'Finnish', fr: 'French', he: 'Hebrew', hi: 'Hindi', hu: 'Hungarian', id: 'Indonesian',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', ms: 'Malay', nb: 'Norwegian', nl: 'Dutch', no: 'Norwegian',
  pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', ru: 'Russian', sk: 'Slovak', sv: 'Swedish', ta: 'Tamil',
  te: 'Telugu', th: 'Thai', tr: 'Turkish', uk: 'Ukrainian', ur: 'Urdu', vi: 'Vietnamese', zh: 'Chinese',
};

export function voiceLanguage(voice: Pick<Voice, 'language'>): string {
  const base = (voice.language || '').replace(/_/g, '-').split('-')[0].toLowerCase();
  return /^[a-z]{2,3}$/.test(base) && base !== 'und' ? base : 'other';
}

export function languageName(language: string): string {
  if (language === 'other') return 'Other languages';
  try {
    // DisplayNames is optional on TV engines; the fallback keeps common languages readable.
    const DisplayNames = (Intl as unknown as {DisplayNames?: new (locales: string[], options: {type: string}) => {of: (code: string) => string | undefined}}).DisplayNames;
    const label = DisplayNames && new DisplayNames(['en'], {type: 'language'}).of(language);
    if (label && label !== language) return label;
  } catch {}
  return LANGUAGE_NAMES[language] || language.toUpperCase();
}

export function groupVoices(voices: Voice[]) {
  const groups = new Map<string, Voice[]>();
  // Some engines report duplicate identifiers. Keep each selectable voice once.
  for (const voice of new Map(voices.map((voice) => [voice.identifier, voice])).values()) {
    const language = voiceLanguage(voice);
    if (!groups.has(language)) groups.set(language, []);
    groups.get(language)!.push(voice);
  }
  return [...groups].map(([id, entries]) => ({id, label: languageName(id),
    voices: entries.sort((a, b) => a.language.localeCompare(b.language) || a.name.localeCompare(b.name) || a.identifier.localeCompare(b.identifier)),
  })).sort((a, b) => a.id === 'other' ? 1 : b.id === 'other' ? -1 : a.label.localeCompare(b.label));
}

export function voiceDisplay(voice: Voice, index: number) {
  const technical = /-x-|^(?:[a-z]{2,3}[-_])|^[a-z]{2,3} language$/i.test(voice.name);
  const kind = /(?:^|[-_])network(?:$|[-_])/i.test(voice.name) ? 'Network' :
    /(?:^|[-_])local(?:$|[-_])/i.test(voice.name) ? 'Local' : '';
  return {
    label: technical ? `Voice ${index + 1}` : voice.name,
    subtitle: [voice.language.replace(/_/g, '-'), kind].filter(Boolean).join(' · '),
  };
}
