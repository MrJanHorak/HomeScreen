import {TVTheme} from '../src/theme/tvTheme';
export const useTheme = () => ({...TVTheme, fontsReady: true, fontError: null});
