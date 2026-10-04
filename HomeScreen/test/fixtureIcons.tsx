import React from 'react';
import {Text} from 'react-native';
export function MaterialCommunityIcons({size, color, style}: {size: number; color: string; style?: object; name: string}) {
  return <Text style={[{fontSize: size, lineHeight: size, width: size, color}, style]}>●</Text>;
}
