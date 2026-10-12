import {useState} from 'react';
import type {ComponentType} from 'react';
import {Platform, ScrollView, TVTextScrollView} from 'react-native';
import type {ScrollViewProps, TVTextScrollViewProps} from 'react-native';
import {useTheme} from '../../../theme/ThemeContext';

// TVTextScrollView allows remote scrolling even without actionable event rows.
const NativeScroller: ComponentType<TVTextScrollViewProps> = TVTextScrollView;
export default function ScheduleScrollView(props: Omit<ScrollViewProps, 'onFocus' | 'onBlur'>) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return Platform.isTV ? <NativeScroller {...props} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={[props.style, {borderWidth: 2, borderRadius: 10, borderColor: focused ? theme.colors.focusRing : 'transparent'}]} />
    : <ScrollView {...props} />;
}
