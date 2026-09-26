import { CurrentDateTime } from './useCurrentDateTime';

type HourType = CurrentDateTime['currentHour'];

export function useGreeting(currentHour: HourType, userName: string = 'Jan') {
  let timeOfDay = 'night';
  let salutation = 'Good night';

  if (currentHour >= 5 && currentHour < 12) {
    timeOfDay = 'morning';
    salutation = 'Good morning';
  } else if (currentHour >= 12 && currentHour < 17) {
    timeOfDay = 'afternoon';
    salutation = 'Good afternoon';
  } else if (currentHour >= 17 && currentHour < 22) {
    timeOfDay = 'evening';
    salutation = 'Good evening';
  }

  const fullGreeting = `${salutation}, ${userName}`;

  return {
    greeting: fullGreeting,
    salutation,
    timeOfDay,
  };
}
