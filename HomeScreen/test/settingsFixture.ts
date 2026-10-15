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
const state = {writes: [] as DashboardAppearance[], failLayouts: false, failPollCreate: false, losePollResponse: false, pollCreates: [] as {requestId: string; definition: {question: string}}[]};
Object.assign(window, {settingsFixture: state});
export const useAuth = () => ({user: {uid: 'settings-owner'}});
export const usePolls = () => ({rounds: {[roundId]: {id: roundId, question: 'Movie night?'}}});
export const getUserAppearance = async () => ({appearance: remote, seededFromWeb: true, updatedAtMs: 1});
export const saveUserAppearance = async (appearance: DashboardAppearance) => {remote = appearance; state.writes.push(appearance);};
export const getSavedGooglePhoto = async () => null;
export const getSavedGooglePhotos = async () => new URLSearchParams(location.search).has('photos') ? [
  {id: 'preview-photo', dataUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#16A085"/></svg>')},
  {id: 'preview-photo-2', dataUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#0477BF"/></svg>')},
] : [];
export const getGooglePhotosStatus = async () => false;
export const beginGooglePhotosConnection = async () => 'https://example.com/photos';
export const createGooglePhotosSession = async () => ({pickerUri: 'https://example.com/photos', pollIntervalMs: 3000});
export const pollGooglePhotosSession = async () => ({status: 'pending', pollIntervalMs: 3000});
export const getPeopleSettings = async () => ({people: [{id: personId, name: 'Alex'}, {id: 'd'.repeat(32), name: 'Sam'}]});
const polls = [{id: roundId, question: 'Movie night?'}, {id: 'e'.repeat(32), question: 'Dinner?'}];
export const getAvailableDashboardPolls = async () => [...polls];
export const createDashboardPoll = async (definition: {question: string}, requestId: string) => {
  state.pollCreates.push({requestId, definition});
  if (state.failPollCreate) throw new Error('Could not create the poll. Try again.');
  const poll = polls.find((item) => item.id === requestId) || {id: requestId, question: definition.question};
  if (!polls.some((item) => item.id === poll.id)) polls.unshift(poll);
  if (state.losePollResponse) {state.losePollResponse = false; throw new Error('Connection lost. Retry to check your poll.');}
  return poll;
};
export const getSavedDashboardLayouts = async () => {
  if (state.failLayouts) throw new Error('Could not load saved layouts');
  return [{id: 'garden', name: 'Garden', appearance: saved, updatedAtMs: 2},
    {id: 'classic', name: 'Classic', appearance: DEFAULT_APPEARANCE, updatedAtMs: 1}];
};
export default {getItem: async () => null, setItem: async () => undefined};
