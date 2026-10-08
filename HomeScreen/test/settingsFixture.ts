import {DEFAULT_APPEARANCE} from '../src/theme/appearance';
import {legacyWidgetProjection, widgetGridFromRows} from '../../server/functions/src/utils/widgets';
import type {WidgetLayout} from '../../server/functions/src/utils/widgets';
import type {DashboardAppearance} from '../src/theme/appearance';

const personId = 'c'.repeat(32);
const roundId = 'b'.repeat(32);
const widgetLayout: WidgetLayout = {version: 1, grid: null, widgets: [
  {id: 'weather', kind: 'weather', visible: true, size: 'standard'},
  {id: `activity_${personId}`, kind: 'activity', personId, visible: true, size: 'standard'},
  {id: `poll_${'a'.repeat(32)}`, kind: 'poll', roundId, visible: true, size: 'standard', presentation: 'join'},
]};
const initial: DashboardAppearance = {...DEFAULT_APPEARANCE, layout: 'custom', widgetLayout, ...legacyWidgetProjection(widgetLayout)};
const savedGrid: WidgetLayout = {...widgetLayout, grid: widgetGridFromRows(widgetLayout.widgets)};
const saved = {...initial, palette: 'forest', widgetLayout: savedGrid, ...legacyWidgetProjection(savedGrid)};
let remote = initial;
const state = {writes: [] as DashboardAppearance[], failLayouts: false};
Object.assign(window, {settingsFixture: state});
export const useAuth = () => ({user: {uid: 'settings-owner'}});
export const usePolls = () => ({rounds: {[roundId]: {id: roundId, question: 'Movie night?'}}});
export const getUserAppearance = async () => ({appearance: remote, seededFromWeb: true, updatedAtMs: 1});
export const saveUserAppearance = async (appearance: DashboardAppearance) => {remote = appearance; state.writes.push(appearance);};
export const getSavedGooglePhoto = async () => null;
export const getSavedGooglePhotos = async () => [];
export const getPeopleSettings = async () => ({people: [{id: personId, name: 'Alex'}, {id: 'd'.repeat(32), name: 'Sam'}]});
export const getAvailableDashboardPolls = async () => [{id: roundId, question: 'Movie night?'}, {id: 'e'.repeat(32), question: 'Dinner?'}];
export const getSavedDashboardLayouts = async () => {
  if (state.failLayouts) throw new Error('Could not load saved layouts');
  return [{id: 'garden', name: 'Garden', appearance: saved, updatedAtMs: 2},
    {id: 'classic', name: 'Classic', appearance: DEFAULT_APPEARANCE, updatedAtMs: 1}];
};
export default {getItem: async () => null, setItem: async () => undefined};
