import {
  View,
  StyleSheet,
  Image,
  ImageSourcePropType,
  ViewStyle,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { TVTheme } from '../../theme/tvTheme';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';
import { DEFAULT_PHOTO_ZOOM, normalizePhotoZoom } from '../../../../server/functions/src/utils/photoFraming';

interface TVScreenWrapperProps {
  children: React.ReactNode;
  backgroundImage?: ImageSourcePropType;
  backgroundZoom?: number;
  style?: ViewStyle;
}

export default function TVScreenWrapper({
  children,
  backgroundImage,
  backgroundZoom = DEFAULT_PHOTO_ZOOM,
  style,
}: TVScreenWrapperProps) {
  const theme = useTheme();
  const compact = useCompactTVLayout();
  const [size, setSize] = useState({width: 0, height: 0});
  const content = <View style={[styles.container, compact && styles.compactContainer, style]}>{children}</View>;

  // This is the functional core of the UI layout
  const renderInnerContent = () => {
    if (backgroundImage) {
      return (
        <View
          onLayout={({nativeEvent: {layout}}) => setSize((current) =>
            current.width === layout.width && current.height === layout.height ? current : {width: layout.width, height: layout.height})}
          style={[styles.background, { backgroundColor: theme.colors.background }]}
        >
          {size.width > 0 && size.height > 0 && <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Image source={backgroundImage} resizeMode="cover" accessible={false}
              style={{width: size.width, height: size.height, transform: [{scale: normalizePhotoZoom(backgroundZoom)}]}} />
          </View>}
          <View style={[styles.overlay, { backgroundColor: theme.colors.backgroundOverlay }]}>{content}</View>
        </View>
      );
    }
    return <View style={[styles.background, { backgroundColor: theme.colors.background }]}>{content}</View>;
  };

  // On TV/Mobile, render normally. On Web, wrap it in a strict 16:9 aspect box.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webViewportCenterer}>
        <View style={styles.webTvFrame}>
          {renderInnerContent()}
        </View>
      </View>
    );
  }

  return renderInnerContent();
}

const styles = StyleSheet.create({
  // Centers our simulated TV screen in the web browser
  webViewportCenterer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000', // Black bars (letterboxing) like a real TV video feed
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Simulates an exact hardware TV screen resolution box
  webTvFrame: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        // Enforces structural 16:9 resolution
        aspectRatio: '16 / 9', 
        // Locks the web container max size to standard TV design base canvas limits
        maxWidth: 1920,
        maxHeight: 1080,
        // Optional: Adds a thin outline so you can see exactly where the TV borders end
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
      },
    }),
  },
  background: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: TVTheme.colors.background,
    height: '100%',
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    height: '100%', 
    width: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: TVTheme.spacing.safeHorizontal,
    paddingVertical: TVTheme.spacing.safeVertical,
    ...Platform.select({
      web: {
        boxSizing: 'border-box', 
      },
    }),
  },
  compactContainer: {
    paddingHorizontal: 30,
    paddingVertical: 16,
  },
});
