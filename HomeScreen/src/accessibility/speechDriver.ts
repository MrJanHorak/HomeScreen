import type {NarrationPreference, SpeechDriver} from './narration';
import type {Voice} from 'expo-speech';

// Older installed TV builds can still open the dashboard and explain the missing module.
let engine: Promise<typeof import('expo-speech')> | undefined;
const loadEngine = () => engine ??= import('expo-speech').catch((error) => {engine = undefined; throw error;});
let loaded: typeof import('expo-speech') | undefined;

export async function availableVoices(): Promise<Voice[]> {
  loaded = await loadEngine();
  return loaded.getAvailableVoicesAsync();
}

export const speechDriver: SpeechDriver = {
  async stop() {if (loaded) await loaded.stop();},
  async speak(text: string, preference: NarrationPreference, onError: () => void, isCurrent: () => boolean) {
    loaded = await loadEngine();
    // An unavailable saved voice falls back to the device's default voice.
    const voices = await loaded.getAvailableVoicesAsync();
    const voice = voices.find((item) => item.identifier === preference.voice);
    if (!isCurrent()) return;
    loaded.speak(text.slice(0, loaded.maxSpeechInputLength), {
      rate: preference.rate,
      voice: voice?.identifier,
      language: voice?.language,
      onError,
    });
  },
};
