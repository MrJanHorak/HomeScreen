import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEY_ACTIVE_LOC, STORAGE_KEY_LOCATIONS} from './weatherLocationService';

/** Remove TV-local preferences when an account is signed out or revoked. */
export async function clearLocalUserData(uid: string): Promise<void> {
  await AsyncStorage.multiRemove([
    `@tv_appearance_v1:${uid}`,
    `@tv_favorite_apps_v1:${uid}`,
    `tv-watch-next-preferences-v1:${uid}`,
    `${STORAGE_KEY_LOCATIONS}:${uid}`,
    `${STORAGE_KEY_ACTIVE_LOC}:${uid}`,
    // Old releases used keys shared by every person on the TV.
    STORAGE_KEY_LOCATIONS,
    STORAGE_KEY_ACTIVE_LOC,
    'tv-watch-next-preferences-v1',
  ]);
}
