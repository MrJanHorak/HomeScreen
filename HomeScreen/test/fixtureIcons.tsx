import React from 'react';
import {Text} from 'react-native';
import glyphs from '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';
import fontUrl from '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf?url';

// Use the production glyph/font asset without Expo's native font-loading runtime.
const font = new FontFace('FixtureWeatherIcons', `url(${fontUrl})`);
document.fonts.add(font);
font.load();

export function MaterialCommunityIcons({name, size, color, style}: {size: number; color: string; style?: object; name: string}) {
  const code = (glyphs as Record<string, number>)[name] ?? glyphs['help-circle-outline'];
  return <Text aria-hidden style={[{fontFamily: 'FixtureWeatherIcons', fontSize: size, lineHeight: size, width: size, color}, style]}>{String.fromCodePoint(code)}</Text>;
}
