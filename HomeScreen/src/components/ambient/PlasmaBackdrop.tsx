import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

function PlasmaBlob({
  color,
  index,
  width,
  height,
}: {
  color: string;
  index: number;
  width: number;
  height: number;
}) {
  const motion = useRef(new Animated.Value(0)).current;
  const size = Math.max(width, height) * (index === 1 ? 0.95 : 0.8);
  const positions = [
    { left: -size * 0.25, top: -size * 0.35 },
    { left: width - size * 0.7, top: -size * 0.05 },
    { left: width * 0.2, top: height - size * 0.55 },
  ];

  useEffect(() => {
    const duration = 38_000 + index * 11_000;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [index, motion]);

  return (
    <Animated.View
      pointerEvents='none'
      style={[
        styles.blob,
        positions[index],
        {
          width: size,
          height: size,
          transform: [
            {
              translateX: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [-width * 0.08, width * 0.1],
              }),
            },
            {
              translateY: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [height * 0.07, -height * 0.08],
              }),
            },
            {
              scale: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.13],
              }),
            },
          ],
        },
      ]}
    >
      <Svg width='100%' height='100%' viewBox='0 0 100 100'>
        <Defs>
          <RadialGradient
            id={`plasma-${index}`}
            cx='50%'
            cy='50%'
            rx='50%'
            ry='50%'
          >
            <Stop offset='0%' stopColor={color} stopOpacity={0.7} />
            <Stop offset='42%' stopColor={color} stopOpacity={0.32} />
            <Stop offset='100%' stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx='50' cy='50' r='50' fill={`url(#plasma-${index})`} />
      </Svg>
    </Animated.View>
  );
}

export default function PlasmaBackdrop({
  colors,
}: {
  colors: [string, string, string];
}) {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents='none' style={styles.root}>
      {colors.map((color, index) => (
        <PlasmaBlob
          key={index}
          color={color}
          index={index}
          width={width}
          height={height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#05070E',
    overflow: 'hidden',
  },
  blob: { position: 'absolute' },
});
