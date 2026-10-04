import React, {createContext, useContext} from 'react';
import {TVTheme} from '../src/theme/tvTheme';
const Fixture = createContext<any>(null);
export const FixtureProvider = Fixture.Provider;
export function useDashboard() {return useContext(Fixture).data;}
export function useWatchNext() {return useContext(Fixture).watch;}
export function useTheme() {return TVTheme;}
export default function useCompactTVLayout() {return useContext(Fixture).compact;}
