import React, {createContext, useContext} from 'react';
import {TVTheme} from '../src/theme/tvTheme';
import type {useDashboard as useDashboardContract} from '../src/context/DashboardContext';
import type {useWatchNext as useWatchNextContract} from '../src/hooks/useWatchNext';

export type FixtureDashboard = Pick<ReturnType<typeof useDashboardContract>,
  'isLoading' | 'activeLocation' | 'savedLocations' | 'getWeatherForLoc' | 'setActiveLocation' |
  'meals' | 'schedule' | 'upcomingEvents' | 'tasks' | 'weather' | 'health'>;
export type FixtureWatch = Pick<ReturnType<typeof useWatchNextContract>, 'status' | 'items'>;

interface FixtureState {
  data: FixtureDashboard;
  watch: FixtureWatch;
  compact: boolean;
}

const Fixture = createContext<FixtureState | null>(null);
export const FixtureProvider = Fixture.Provider;

function useFixture(): FixtureState {
  const value = useContext(Fixture);
  if (!value) throw new Error('Card tests need a FixtureProvider.');
  return value;
}

export function useDashboard() {return useFixture().data;}
export function useWatchNext() {return useFixture().watch;}
export function useTheme() {return TVTheme;}
export default function useCompactTVLayout() {return useFixture().compact;}
