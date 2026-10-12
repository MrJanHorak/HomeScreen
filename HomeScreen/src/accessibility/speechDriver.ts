import type {NarrationPreference, SpeechDriver} from './narration';
import type {Voice} from 'expo-speech';

// Older installed TV builds can still open the dashboard and explain the missing module.
let engine: Promise<typeof import('expo-speech')> | undefined;
const loadEngine = () => engine ??= import('expo-speech').catch((error) => {engine = undefined; throw error;});
let loaded: typeof import('expo-speech') | undefined;
let voices: Voice[] | undefined;
let voicesRequest: Promise<Voice[]> | undefined;

export function availableVoices(refresh = false): Promise<Voice[]> {
  if (!refresh && voices?.length) return Promise.resolve(voices);
  if (voicesRequest) return voicesRequest;
  const request = new Promise<Voice[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The TV speech engine did not load its voices.')), 8000);
    void loadEngine().then((module) => {
      loaded = module;
      return module.getAvailableVoicesAsync();
    }).then(resolve, reject).finally(() => clearTimeout(timer));
  }).then((items) => {
    voices = items;
    return items;
  }).finally(() => {if (voicesRequest === request) voicesRequest = undefined;});
  voicesRequest = request;
  return request;
}

export const speechDriver: SpeechDriver = {
  async stop() {if (loaded) await loaded.stop();},
  async speak(text: string, preference: NarrationPreference, onError: () => void, isCurrent: () => boolean, playback) {
    // An unavailable saved voice falls back to the device's default voice.
    const items = await availableVoices();
    const module = loaded!;
    const voice = items.find((item) => item.identifier === preference.voice);
    if (!isCurrent()) return;
    module.speak(text.slice(0, module.maxSpeechInputLength), {
      rate: preference.rate,
      voice: voice?.identifier,
      language: voice?.language,
      onError,
      onStart: playback?.onStart,
      onDone: playback?.onDone,
      onStopped: playback?.onDone,
    });
  },
};
