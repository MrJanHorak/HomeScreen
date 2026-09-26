import { View } from 'react-native';
import TVText from '../tv/TVText';

import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { Ionicons } from '../../hooks/useHealthData';


//theme
import { useTheme } from '../../theme/ThemeContext';
// // types
interface ActivityStatsProps {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
}

export default function ActivityStats({
  steps,
  calories,
  distance,
  activeMinutes,
}: ActivityStatsProps) {

  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'column' }}>
      <View style={{ flexDirection: 'row' , gap: 8}}>
        <MaterialCommunityIcons name='walk' size={24} color={theme.colors.textPrimary} />
        {/* <Ionicons name="footsteps" size={24} color="black" /> */}
        <TVText
          text={`${steps}`}
          typography='caption'
          color='textPrimary'
          marginBottom='xs'
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MaterialCommunityIcons
          name='map-marker-distance'
          size={24}
          color={theme.colors.textPrimary}
        />
        <TVText
          text={`${distance} km`}
          typography='caption'
          color='textPrimary'
          marginBottom='xs'
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MaterialCommunityIcons name='timer-outline' size={24} color={theme.colors.textPrimary} />
        <TVText
          text={`${activeMinutes} min`}
          typography='caption'
          color='textPrimary'
          marginBottom='xs'
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MaterialCommunityIcons name='lightning-bolt' size={24} color={theme.colors.textPrimary} />
        <TVText
          text={`${calories} cal`}
          typography='caption'
          color='textPrimary'
          marginBottom='xs'
        />
      </View>
    </View>
  );
}
