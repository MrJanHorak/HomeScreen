import type {Voice} from 'expo-speech';
import type {SpeechDriver} from './narration';

function synthesis() {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance)
    throw new Error('This browser does not support spoken navigation.');
  return window.speechSynthesis;
}

async function browserVoices(): Promise<SpeechSynthesisVoice[]> {
  const engine = synthesis();
  if (engine.getVoices().length) return engine.getVoices();
  // Some browsers populate voices after the page loads; others have no installed voices.
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      engine.removeEventListener('voiceschanged', finish);
      resolve(engine.getVoices());
    };
    const timer = setTimeout(finish, 1200);
    engine.addEventListener('voiceschanged', finish);
  });
}

export async function availableVoices(): Promise<Voice[]> {
  return (await browserVoices()).map((voice) => ({identifier: voice.voiceURI, name: voice.name,
    language: voice.lang, quality: 'Default' as Voice['quality']}));
}

export const speechDriver: SpeechDriver = {
  async stop() {if (typeof window !== 'undefined') window.speechSynthesis?.cancel();},
  async speak(text, preference, onError, isCurrent) {
    const voices = await browserVoices();
    if (!isCurrent()) return;
    const message = new SpeechSynthesisUtterance(text);
    message.rate = preference.rate;
    message.voice = voices.find((voice) => voice.voiceURI === preference.voice) || null;
    if (message.voice) message.lang = message.voice.lang;
    message.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted' && isCurrent()) onError();
    };
    synthesis().speak(message);
  },
};
