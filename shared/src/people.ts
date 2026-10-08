import type {Activity} from './types';

export interface DashboardPerson {id: string; name: string}
export interface ActivitySharing {
  id: string;
  dashboardName: string;
  name: string;
}
export interface PeopleSettings {
  people: DashboardPerson[];
  sharing: ActivitySharing[];
  connection: {connected: boolean; name?: string; stepGoal: number; distanceGoal: number} | null;
}
export interface PeopleActivityFeed {
  people: (DashboardPerson & {health: Activity})[];
  updatedAt: string;
}
export interface PeopleInvitation {url: string; expiresAtMs: number; id: string}
