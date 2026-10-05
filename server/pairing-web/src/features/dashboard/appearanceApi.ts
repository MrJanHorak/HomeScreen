import {isRecord} from '../../../../../shared/src/validation';
import {MAX_DESIGNS, MAX_REVISIONS, validRevision} from '../../../../functions/src/utils/appearanceLibrary';
import type {AppearanceLibrary, PublishedRevision} from '../../../../functions/src/utils/appearanceLibrary';
import {createApiClient} from '../../shared/apiClient';
import type {Appearance} from './appearanceModel';

export interface StudioResponse {
  appearance: Record<string, unknown> | null;
  updatedAtMs: number;
  library: AppearanceLibrary;
  history: PublishedRevision[];
}

export type LibraryChange =
  | {action: 'draft'; draft: {appearance: Appearance; baseUpdatedAtMs: number} | null}
  | {action: 'saveDesign'; id?: string; name: string; appearance: Appearance}
  | {action: 'deleteDesign'; id: string};

export interface AppearanceApi {
  loadStudio: () => Promise<StudioResponse>;
  changeLibrary: (change: LibraryChange, expectedRevision: number) => Promise<AppearanceLibrary>;
  publish: (appearance: Appearance, expectedRevision: number) => Promise<number>;
}

function validLibrary(value: unknown): value is AppearanceLibrary {
  if (!isRecord(value) || !validRevision(value.updatedAtMs)) return false;
  if (value.draft !== null && (!isRecord(value.draft) || !isRecord(value.draft.appearance) ||
      !validRevision(value.draft.baseUpdatedAtMs))) return false;
  return Array.isArray(value.designs) && value.designs.length <= MAX_DESIGNS && value.designs.every((design) =>
    isRecord(design) && typeof design.id === 'string' && typeof design.name === 'string' &&
    isRecord(design.appearance) && validRevision(design.updatedAtMs));
}

function validHistory(value: unknown): value is PublishedRevision[] {
  return Array.isArray(value) && value.length <= MAX_REVISIONS && value.every((entry) =>
    isRecord(entry) && isRecord(entry.appearance) && validRevision(entry.updatedAtMs) &&
    typeof entry.changedBy === 'string' && typeof entry.source === 'string' && ['web', 'tv', 'previous'].includes(entry.source));
}

/** Validate response metadata before it can affect draft state or concurrency checks. */
export function createAppearanceApi(apiUrl: string, getToken: () => Promise<string | null>): AppearanceApi {
  const request = createApiClient(apiUrl, getToken, {
    signIn: 'Sign in to edit your dashboard.',
    failure: 'Could not update dashboard settings.',
  });

  async function loadStudio(): Promise<StudioResponse> {
    const result = await request<unknown>('appearanceStudio');
    if (!isRecord(result) || (result.appearance !== null && !isRecord(result.appearance)) ||
        !validRevision(result.updatedAtMs) || !validLibrary(result.library) || !validHistory(result.history)) {
      throw new Error('The server returned invalid dashboard settings. Reload to try again.');
    }
    return {appearance: result.appearance, updatedAtMs: result.updatedAtMs, library: result.library, history: result.history};
  }

  async function changeLibrary(change: LibraryChange, expectedRevision: number): Promise<AppearanceLibrary> {
    const result = await request<unknown>('appearanceStudio', 'PUT', {...change, expectedUpdatedAtMs: expectedRevision});
    if (!isRecord(result) || !validLibrary(result.library)) {
      throw new Error('The server returned an invalid design library. Refresh designs and history before retrying.');
    }
    return result.library;
  }

  async function publish(appearance: Appearance, expectedRevision: number): Promise<number> {
    const result = await request<unknown>('userAppearance', 'PUT', {appearance, source: 'web', expectedUpdatedAtMs: expectedRevision});
    if (!isRecord(result) || !validRevision(result.updatedAtMs)) {
      throw new Error('The server returned an invalid publish revision. Reload to check your TV settings.');
    }
    return result.updatedAtMs;
  }

  return {loadStudio, changeLibrary, publish};
}
