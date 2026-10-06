import useTVClock from '../../../hooks/useTVClock';

export interface CurrentDateTime {
  rawDate: Date;
  formattedTime: string;
  formattedDate: string;
  currentHour: number;
}

export function useCurrentDateTime(): CurrentDateTime {
  const currentTime = new Date(useTVClock());

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
