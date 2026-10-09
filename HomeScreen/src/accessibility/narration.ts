export interface NarrationPreference {
  enabled: boolean;
  rate: number;
  voice: string | null;
}

export const NARRATION_STORAGE_KEY = '@tv_narration_v1';
export const DEFAULT_NARRATION: NarrationPreference = {enabled: false, rate: 1, voice: null};

export function normalizeNarration(value: unknown): NarrationPreference {
  const raw = value && typeof value === 'object' ? value as Partial<NarrationPreference> : {};
  return {
    enabled: raw.enabled === true,
    rate: typeof raw.rate === 'number' && Number.isFinite(raw.rate) ? Math.max(0.5, Math.min(1.5, raw.rate)) : 1,
    voice: typeof raw.voice === 'string' && raw.voice.trim() ? raw.voice : null,
  };
}

export interface SpokenState {
  selected?: boolean;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  expanded?: boolean;
  busy?: boolean;
}

export function selectionAnnouncement(label: string, state: SpokenState = {}, value?: string): string {
  const parts = [label.trim(), value];
  if (state.checked !== undefined) parts.push(state.checked === 'mixed' ? 'Partially checked' : state.checked ? 'On' : 'Off');
  if (state.selected) parts.push('Selected');
  if (state.expanded !== undefined) parts.push(state.expanded ? 'Expanded' : 'Collapsed');
  if (state.disabled) parts.push('Unavailable');
  if (state.busy) parts.push('Loading');
  return parts.filter(Boolean).join('. ');
}

export interface SpeechDriver {
  stop: () => Promise<void>;
  speak: (text: string, preference: NarrationPreference, onError: () => void, isCurrent: () => boolean) => Promise<void>;
}

/** One shared queue: moving focus invalidates pending speech, including async engine work. */
export class NarrationController {
  private version = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private allowed = false;
  private preference = DEFAULT_NARRATION;
  private owner: object | undefined;

  constructor(private driver: SpeechDriver, private onError: () => void, private delay = 180) {}

  configure(preference: NarrationPreference, allowed: boolean) {
    if (this.allowed === allowed && this.preference.enabled === preference.enabled &&
      this.preference.rate === preference.rate && this.preference.voice === preference.voice) return;
    this.preference = preference;
    this.allowed = allowed;
    this.stop();
  }

  private invalidate() {
    ++this.version;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private enqueue(task: () => Promise<void>) {
    this.queue = this.queue.then(task).catch(() => this.onError());
  }

  stop = () => {
    this.invalidate();
    this.owner = undefined;
    this.enqueue(() => this.driver.stop());
  };

  blur = (owner: object) => {
    if (this.owner === owner) this.stop();
  };

  announce = (text: string, owner?: object, preview = false) => {
    this.invalidate();
    this.owner = owner;
    const version = this.version;
    this.enqueue(() => this.driver.stop());
    if (!this.allowed || (!preview && !this.preference.enabled) || !text.trim()) return;
    const preference = {...this.preference};
    const speak = () => this.enqueue(async () => {
      if (version !== this.version || !this.allowed) return;
      await this.driver.speak(text, preference, () => {
        if (version === this.version) this.onError();
      }, () => version === this.version && this.allowed);
      // A stop/focus event may arrive while the engine is loading.
      if (version !== this.version || !this.allowed) await this.driver.stop();
    });
    if (preview) speak();
    else this.timer = setTimeout(speak, this.delay);
  };
}
