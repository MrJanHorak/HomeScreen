import {
  View,
  StyleSheet,
  ImageBackground,
  ImageSourcePropType,
  ViewStyle,
  Platform,
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

  // This is the functional core of the UI layout
  const renderInnerContent = () => {
    if (backgroundImage) {
      return (
        <ImageBackground
          source={backgroundImage}
          style={styles.background}
          imageStyle={styles.backgroundImageStyle} 
          resizeMode='cover'
        >
          <View style={styles.overlay}>{content}</View>
        </ImageBackground>
      );
    }
    return <View style={styles.background}>{content}</View>;
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

// const styles = StyleSheet.create({
//   // Centers our simulated TV screen in the web browser
//   webViewportCenterer: {
//     flex: 1,
//     width: '100%',
//     height: '100%',
//     backgroundColor: '#000000', 
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   // Simulates a hardware TV screen using a fixed standard aspect ratio
//   webTvFrame: {
//     width: '100%',
//     height: '100%',
//     maxWidth: '100%',
//     maxHeight: '100%',
//     ...Platform.select({
//       web: {
//         aspectRatio: '16 / 9', 
//       },
//     }),
//   },
//   background: {
//     flex: 1,
//     backgroundColor: TVTheme.colors.background,
//     height: '100%',
//     width: '100%',
//   },
//   backgroundImageStyle: {
//     width: '100%',
//     height: '100%',
//   },
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(15, 23, 42, 0.6)',
//     height: '100%', 
//     width: '100%',
//   },
//   container: {
//     flex: 1,
//     paddingHorizontal: TVTheme.spacing.safeHorizontal,
//     paddingVertical: TVTheme.spacing.safeVertical,
//     ...Platform.select({
//       web: {
//         boxSizing: 'border-box', 
//       },
//     }),
//   },
// });


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
    backgroundColor: TVTheme.colors.background,
    height: '100%',
    width: '100%',
  },
  backgroundImageStyle: {
    width: '100%',
    height: '100%',
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
});
