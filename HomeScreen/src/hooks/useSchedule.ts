import { useDashboard } from '../context/DashboardContext';
import { mockCalendarEvents } from '../data/mockData';

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
  try {
    const { schedule, isLoading, error } = useDashboard();
    return {
      data: (schedule as unknown as CalendarItem[]) || (mockCalendarEvents as unknown as CalendarItem[]),
      isLoading,
      error,
    };
  } catch {
    return {
      data: mockCalendarEvents as unknown as CalendarItem[],
      isLoading: false,
      error: null,
    };
  }
}
