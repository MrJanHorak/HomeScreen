import { HttpFunction } from '@google-cloud/functions-framework';
import { getStoredUserTokens } from './utils/db';
import { fetchCalendarEvents } from './services/googleCalendar';
import { fetchActiveTasks } from './services/googleTasks';
import { fetchHealthData } from './services/googleFit';
import { fetchLocalWeather } from '../../functions/services/weatherService';

export const getDashboardSummary: HttpFunction = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Authorization');
    res.status(204).send('');
    return;
  }

  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    // 1. Fetch user credentials from Firestore
    const tokens = await getStoredUserTokens(userId);

    // 2. Execute all upstream Google API requests in parallel safely
    const [calendarResult, tasksResult, healthResult, weatherResult] =
      await Promise.allSettled([
        fetchCalendarEvents(tokens.google),
        fetchActiveTasks(tokens.google),
        fetchHealthData(tokens.google),
        fetchLocalWeather(tokens.location),
      ]);

    // 3. Assemble response gracefully regardless of individual API failures
    res.status(200).json({
      schedule:
        calendarResult.status === 'fulfilled' ? calendarResult.value : [],
      tasks: tasksResult.status === 'fulfilled' ? tasksResult.value : [],
      health:
        healthResult.status === 'fulfilled'
          ? healthResult.value
          : { steps: 0, goal: 10000 },
      weather:
        weatherResult.status === 'fulfilled'
          ? weatherResult.value
          : { temp: '--', condition: 'Unknown' },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error handling summary request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};