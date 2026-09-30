import { useDashboard } from '../context/DashboardContext';
import type { CalendarEvent } from '../../../shared/src/types';

export type CalendarItem = CalendarEvent;

export function useSchedule(): {
  data: CalendarItem[] | null;
  upcoming: CalendarItem[];
  isLoading: boolean;
  error: string | null;
} {
  const { schedule, upcomingEvents, isLoading, error } = useDashboard();
  return { data: schedule, upcoming: upcomingEvents, isLoading, error };
}
