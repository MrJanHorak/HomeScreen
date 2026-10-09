import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import TVDetailModal from '../src/components/shared/TVDetailModal';
import WeatherDetailView from '../src/components/details/weather/WeatherDetailView';
import ActivityDetailView from '../src/components/details/activity/ActivityDetailView';
import MealDetailView from '../src/components/details/meals/MealDetailView';
import ScheduleDetailView from '../src/components/details/schedule/ScheduleDetailView';
import ToDoDetailView from '../src/components/details/tasks/ToDoDetailView';
import {AndroidWatchDetail} from '../src/components/details/media/MediaDetailView';
import PollDetailView from '../src/components/details/polls/PollDetailView';
import SettingsDetailView from '../src/components/settings/SettingsDetailView';
import {NarrationProvider} from '../src/accessibility/NarrationContext';
const topics = {weather: WeatherDetailView, activity: ActivityDetailView, meal: MealDetailView, schedule: ScheduleDetailView,
  todo: ToDoDetailView, media: AndroidWatchDetail, poll: () => <PollDetailView roundId='test-poll'/>, settings: SettingsDetailView};
function Fixture() {
  const [visible, setVisible] = useState(true);
  const topic = new URLSearchParams(location.search).get('topic') || 'settings';
  const Content = topics[topic as keyof typeof topics];
  return <NarrationProvider><button onClick={() => setVisible(true)}>Open detail</button>
    <TVDetailModal visible={visible} title={topic === 'settings' ? 'Settings' : `${topic[0].toUpperCase()}${topic.slice(1)}`}
      subtitle='Details for the household' icon='view-dashboard-outline' spacious={topic === 'settings'} onClose={() => setVisible(false)}>
      <Content/>
    </TVDetailModal></NarrationProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
