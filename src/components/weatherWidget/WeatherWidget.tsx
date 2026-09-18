import { useWeather } from '../../hooks/useWeather';
import { ActivityIndicator, View } from 'react-native';
import {
  formatTemperature,
  getWeatherIconName,
} from '../../helpers/weatherHelpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TVTheme } from '../../theme/tvTheme';

import TVText from '../tv/TVText';

export default function WeatherWidget() {
  const { data, isLoading } = useWeather();

  if (isLoading) return <ActivityIndicator />;

  const formattedTemp = formatTemperature(data!.temperature);
  const conditionIcon = getWeatherIconName(data!.conditionIcon);

  return (
    <View>
      <TVText text={formattedTemp} typography='headerLg' />
      <TVText text={data!.condition} typography='body' />
      <MaterialCommunityIcons
        icon={conditionIcon.name}
        size={48}
        color={TVTheme.colors.textPrimary}
      />
    </View>
  );
}
