import { useEffect, useState } from 'react';

export interface CurrentDateTime {
  rawDate: Date;
  formattedTime: string;
  formattedDate: string;
  currentHour: number;
}

export function useCurrentDateTime(): CurrentDateTime {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
     const updateTime = () => setCurrentTime(new Date());
    const intervalTimer: ReturnType<typeof setInterval> = setInterval(updateTime
    , 1000);

    return () => {
      clearInterval(intervalTimer);
    };
  }, []);

  const formattedDate: string = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime: string = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });

  return {
    rawDate: currentTime,
    formattedTime: formattedTime,
    formattedDate: formattedDate,
    currentHour: currentTime.getHours(),
  };
}
