import { View, StyleSheet } from 'react-native';
import TVText from '../tv/TVText';
import { useTheme } from '../../theme/ThemeContext';
import useCompactTVLayout from '../../hooks/useCompactTVLayout';

interface TVProgressRingProps {
  progress?: number;
  size?: number;
  strokeWidth?: number;
}

export default function TVProgressRing({
  progress = 0,
  size = 90,
  strokeWidth = 8,
}: TVProgressRingProps) {
  const theme = useTheme();
  const compact = useCompactTVLayout();

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const percentage = Math.round(clampedProgress * 100);

  const half = size / 2;

  /*
   * The first half of the progress is drawn on the RIGHT.
   *
   * 0%   = nothing
   * 25%  = quarter circle
   * 50%  = right semicircle
   *
   * The second half is then drawn on the LEFT.
   *
   * 50%  = right semicircle
   * 75%  = right + 1/2 left
   * 100% = complete circle
   */

  const rightProgress = Math.min(clampedProgress * 2, 1);
  const leftProgress = Math.max((clampedProgress - 0.5) * 2, 0);

  /*
   * Convert progress into degrees.
   *
   * Right side:
   *   0%  -> 0°
   *   50% -> 180°
   *
   * Left side:
   *   50%  -> 0°
   *   100% -> 180°
   */
  const rightRotation = rightProgress * 180;
  const leftRotation = leftProgress * 180;

  const innerSize = size - strokeWidth * 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      {/* Background ring */}
      <View
        pointerEvents="none"
        style={[
          styles.backgroundRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'rgba(255, 255, 255, 0.12)',
          },
        ]}
      />

      {/* ============================================================
          RIGHT HALF
          ============================================================ */}

      {clampedProgress > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.half,
            {
              width: half,
              height: size,
              left: half,
            },
          ]}
        >
          <View
            style={[
              styles.arc,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,

                /*
                 * Only the right side of this circle is visible.
                 */
                borderColor: 'transparent',
                borderTopColor: theme.colors.focusRing,
                borderRightColor: theme.colors.focusRing,

                left: -half,

                transform: [
                  {
                    rotate: `${rightRotation - 135}deg`,
                  },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* ============================================================
          LEFT HALF
          ============================================================ */}

      {clampedProgress > 0.5 && (
        <View
          pointerEvents="none"
          style={[
            styles.half,
            {
              width: half,
              height: size,
              left: 0,
            },
          ]}
        >
          <View
            style={[
              styles.arc,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,

                borderColor: 'transparent',
                borderBottomColor: theme.colors.focusRing,   
                borderLeftColor: theme.colors.focusRing,

                left: 0,

                transform: [
                  {
                    rotate: `${leftRotation - 135}deg`,
                  },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* Center */}
      <View
        style={[
          styles.centerLabelContainer,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
          },
        ]}
      >
        <TVText
          text={`${percentage}%`}
          typography="body"
          color="textPrimary"
          style={compact ? { fontSize: 17, lineHeight: 22 } : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backgroundRing: {
    position: 'absolute',
  },

  half: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },

  arc: {
    position: 'absolute',
  },

  centerLabelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
