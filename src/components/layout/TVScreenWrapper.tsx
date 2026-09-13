import React from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  ImageSourcePropType,
  ViewStyle,
} from 'react-native';
import { TVTheme } from '../../theme/tvTheme';

interface TVScreenWrapperProps {
  children: React.ReactNode;
  backgroundImage?: ImageSourcePropType;
  style?: ViewStyle;
}

export default function TVScreenWrapper({
  children,
  backgroundImage,
  style,
}: TVScreenWrapperProps) {
  const content = <View style={[styles.container, style]}>{children}</View>;

  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode='cover'
      >
        {/* Dark overlay to preserve TV text legibility & contrast */}
        <View style={styles.overlay}>{content}</View>
      </ImageBackground>
    );
  }

  return <View style={styles.background}>{content}</View>;
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: TVTheme.colors.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  container: {
    flex: 1,
    paddingHorizontal: TVTheme.spacing.safeHorizontal,
    paddingVertical: TVTheme.spacing.safeVertical,
  },
});
