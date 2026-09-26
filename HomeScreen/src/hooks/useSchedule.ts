import { useState, useEffect } from 'react';
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
  const [schedule, setSchedule] = useState<CalendarItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const getCalendarData = async () => {
    try {
      setIsLoading(true);
      setSchedule(mockCalendarEvents);
      setIsLoading(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCalendarData();
  }, []);

  return {
    data: schedule,
    isLoading: isLoading,
    error: error,
  };
}
