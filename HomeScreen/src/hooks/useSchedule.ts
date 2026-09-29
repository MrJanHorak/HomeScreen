import { useDashboard } from '../context/DashboardContext';

export type CalendarItem = {
  id: string;
  title: string;
  time: string;
  endTime: string;
  category: string;
  color: string;
};

export function useSchedule(): {
  data: CalendarItem[] | null;
  isLoading: boolean;
  error: string | null;
} {
  const { schedule, isLoading, error } = useDashboard();
  return { data: schedule as CalendarItem[], isLoading, error };
}
