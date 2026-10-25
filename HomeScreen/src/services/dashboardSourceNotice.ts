import type {DashboardSourceState} from '../../../shared/src/types';

export function dashboardSourceNotice(label: string, source?: DashboardSourceState, cached = false, updatedAt?: string | null): string | null {
  if (source?.status === 'not_connected') return `Connect Google to show ${label.toLowerCase()}.`;
  const savedAt = source ? source.updatedAt : updatedAt;
  const saved = savedAt ? `Saved ${new Date(savedAt).toLocaleString()}` : '';
  if (source?.status === 'unavailable') return `${label} refresh unavailable${saved ? ` · ${saved}` : ' · Try refreshing later'}`;
  return cached && saved ? `${saved} · Updating ${label.toLowerCase()}…` : null;
}
