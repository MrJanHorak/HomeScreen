import {createApiClient} from '../../shared/apiClient';
import type {PollTemplate, PollView} from '../../../../functions/src/utils/polls';

export interface RoundSummary extends PollView {templateId: string; referenceDeviceId: string; linked: boolean; displayed: boolean}
export interface PollLibrary {templates: PollTemplate[]; rounds: RoundSummary[]; devices: {id: string; name: string; timeZone: string | null; pollCapable: boolean; lastSeenAtMs: number}[]}
export interface RoundReview {round: PollView; revision: number; ballots: {id: string; name: string; answer: string | null; optionId: string | null; receivedAtMs: number}[]; next: string | null; answers: {id: string; label: string; count: number; status: string}[]}
export const pollApi = (url: string, getToken: () => Promise<string | null>) => createApiClient(url, getToken,
  {signIn: 'Sign in with the Google account linked to your TV.', failure: 'Could not update polls.'});
export type PollRequest = ReturnType<typeof pollApi>;
