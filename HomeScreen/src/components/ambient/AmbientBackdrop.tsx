import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import type { AmbientPreference } from '../../theme/appearance';
import type { SelectedPhoto } from '../../services/api';
import PlasmaBackdrop from './PlasmaBackdrop';

import galleryOne from '../../../assets/media/wp8860764-nasa-4k-wallpapers.jpg';
import galleryTwo from '../../../assets/media/wp8860783-nasa-4k-wallpapers.jpg';
import galleryThree from '../../../assets/media/wp8860799-nasa-4k-wallpapers.jpg';

const GALLERY: ImageSourcePropType[] = [galleryOne, galleryTwo, galleryThree];

/** Shared by ambient mode and its settings thumbnail. */
export default function AmbientBackdrop({
  preference,
  selectedPhotos,
}: {
  preference: AmbientPreference;
  selectedPhotos: SelectedPhoto[];
}) {
  const photos = useMemo<ImageSourcePropType[]>(() => {
    if (preference.photoSource === 'selected')
      return selectedPhotos.map((photo) => ({ uri: photo.dataUrl }));
    return preference.photoSource === 'gallery' ? GALLERY : [];
  }, [preference.photoSource, selectedPhotos]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [previousPhoto, setPreviousPhoto] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const motion = useRef(new Animated.Value(0)).current;
  const photoIntervalMs = preference.photoMinutes * 60_000;

  useEffect(() => {
    setPhotoIndex(0);
    setPreviousPhoto(null);
    motion.setValue(0);
  }, [photos, motion]);

  useEffect(() => {
    if (!photos.length) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: photoIntervalMs,
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: photoIntervalMs,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [motion, photoIntervalMs, photos.length]);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      setPreviousPhoto(photoIndex);
      setPhotoIndex((index) => (index + 1) % photos.length);
    }, photoIntervalMs);
    return () => clearInterval(timer);
  }, [photoIndex, photoIntervalMs, photos]);

  useEffect(() => {
    if (previousPhoto === null) return;
    photoOpacity.setValue(0);
    const transition = Animated.timing(photoOpacity, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: true,
    });
    transition.start(({ finished }) => {
      if (finished) setPreviousPhoto(null);
    });
    return () => transition.stop();
  }, [photoIndex, photoOpacity, previousPhoto]);

  const photoMotion = {
    transform: [
      {
        scale: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [1.06, 1.13],
        }),
      },
      {
        translateX: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [-width / 160, width / 160],
        }),
      },
    ],
  };

  return (
    <View
      pointerEvents='none'
      style={styles.root}
      onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}
    >
      {preference.photoSource === 'plasma' && (
        <PlasmaBackdrop colors={preference.plasmaColors} />
      )}
      {photos.length > 0 && (
        <>
          {previousPhoto !== null && photos[previousPhoto] && (
            <Animated.Image
              source={photos[previousPhoto]}
              resizeMode='cover'
              style={[styles.photo, photoMotion]}
            />
          )}
          <Animated.Image
            source={photos[photoIndex % photos.length]}
            resizeMode='cover'
            style={[
              styles.photo,
              photoMotion,
              { opacity: previousPhoto === null ? 1 : photoOpacity },
            ]}
          />
        </>
      )}
      <View
        style={[
          styles.dim,
          preference.photoSource === 'plasma' && styles.plasmaDim,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#05080D',
    overflow: 'hidden',
  },
  photo: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.57)' },
  plasmaDim: { backgroundColor: 'rgba(0, 0, 0, 0.22)' },
});
