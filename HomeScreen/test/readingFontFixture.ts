import {useEffect, useState} from 'react';
import {readingFonts} from '../src/theme/readingFonts.web';

let loading: Promise<void> | undefined;
/** Vite fixture loader. The Expo app uses expo-font on every platform. */
export default function useReadingFonts(): [boolean, Error | null] {
  const [ready, setReady] = useState(false), [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    loading ??= Promise.all(Object.entries(readingFonts).map(async ([name, source]) => {
      const face = await new FontFace(name, `url("${source}")`).load();
      document.fonts.add(face);
    })).then(() => undefined);
    void loading.then(() => {if (active) setReady(true);}).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason : new Error('Font could not load'));
    });
    return () => {active = false;};
  }, []);
  return [ready, error];
}
