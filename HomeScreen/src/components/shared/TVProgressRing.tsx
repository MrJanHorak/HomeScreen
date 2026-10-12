import {View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import TVText from './TVText';
import {useTheme} from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import {GOAL_OVERFLOW_COLOR, goalProgressLayers} from '../../helpers/goalProgress';

interface TVProgressRingProps {
  progress?: number;
  size?: number;
  strokeWidth?: number;
}

export default function TVProgressRing({progress = 0, size = 90, strokeWidth = 8}: TVProgressRingProps) {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const {base, overflow, percent} = goalProgressLayers(progress);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const innerSize = size - strokeWidth * 2;
  const label = `${percent}% of daily step goal${overflow > 0 ? `, ${Math.round((progress - 1) * 100)}% over goal` : ''}`;

  return <View testID='activity-progress-ring' accessible accessibilityLabel={label}
    style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
    <Svg width={size} height={size} pointerEvents='none' style={{position: 'absolute'}}>
      <Circle cx={size / 2} cy={size / 2} r={radius} fill='none'
        stroke={theme.colors.glassChip} strokeWidth={strokeWidth} />
      {[{fraction: base, color: theme.colors.focusRing, id: 'goal'},
        {fraction: overflow, color: GOAL_OVERFLOW_COLOR, id: 'overflow'}].map(({fraction, color, id}) => fraction > 0 &&
        <Circle key={id} testID={`activity-ring-${id}`} cx={size / 2} cy={size / 2} r={radius}
          fill='none' stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />)}
    </Svg>
    <View style={{width: innerSize, height: innerSize, borderRadius: innerSize / 2,
      backgroundColor: theme.colors.glassSubtle, alignItems: 'center', justifyContent: 'center'}}>
      <TVText text={`${percent}%`} typography='body' color='textPrimary' numberOfLines={1}
        style={{fontSize: Math.min(compact ? 17 : 24, innerSize * 0.32),
          lineHeight: Math.min(compact ? 22 : 32, innerSize * 0.5)}} />
    </View>
  </View>;
}
