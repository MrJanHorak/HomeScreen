import {useState} from 'react';

const apps = ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((label) => ({
  packageName: `tv.${label.toLowerCase()}`, label, imageUri: null,
}));

export function useFavoriteApps() {
  const [favoriteApps, setFavoriteApps] = useState(apps);
  return {
    availableApps: apps, favoriteApps, visible: true, status: 'ready', syncError: null,
    setVisible: () => {}, toggleFavorite: () => {}, refresh: async () => {},
    moveFavorite: (packageName: string, direction: -1 | 1) => {
      // The real provider commits the new order after saving it to the server.
      setTimeout(() => setFavoriteApps((current) => {
        const next = [...current];
        const index = next.findIndex((app) => app.packageName === packageName);
        const destination = index + direction;
        if (index < 0 || destination < 0 || destination >= next.length) return current;
        [next[index], next[destination]] = [next[destination], next[index]];
        return next;
      }), 25);
    },
  };
}
