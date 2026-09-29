import { Platform, useWindowDimensions } from 'react-native';

/** Android TV often reports a 960×540 dp layout area on a 4K display. */
export default function useCompactTVLayout(): boolean {
  const { height } = useWindowDimensions();
  return Platform.OS !== 'web' && height < 700;
}
