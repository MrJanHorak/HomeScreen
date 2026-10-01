import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, ImageSourcePropType, StyleSheet, Text, View,
} from 'react-native';
import { useDashboard } from '../../context/DashboardContext';
import type { AmbientPreference } from '../../theme/appearance';
import type { CalendarEvent } from '../../../../shared/src/types';

import galleryOne from '../../../assets/media/wp8860764-nasa-4k-wallpapers.jpg';
import galleryTwo from '../../../assets/media/wp8860783-nasa-4k-wallpapers.jpg';
import galleryThree from '../../../assets/media/wp8860799-nasa-4k-wallpapers.jpg';

const GALLERY: ImageSourcePropType[] = [galleryOne, galleryTwo, galleryThree];
const PHOTO_INTERVAL_MS = 180_000;
const INFO_INTERVAL_MS = 90_000;

function minutesFromMidnight(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time);
  if (!match) return null;
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

function nextEvent(today: CalendarEvent[], upcoming: CalendarEvent[], now: Date): string {
  const minute = now.getHours() * 60 + now.getMinutes();
  const event = today.find((item) => {
    const end = minutesFromMidnight(item.endTime);
    return end === null || end >= minute;
  });
  if (event) return `${event.time}  ·  ${event.title}`;
  const later = upcoming[0];
  if (!later) return 'Nothing coming up';
  const date = later.date
    ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${later.date}T12:00:00Z`))
    : 'Coming up';
  return `${date}  ·  ${later.time}  ·  ${later.title}`;
}

interface Props {
  preference: AmbientPreference;
  selectedPhoto: string | null;
}

export default function AmbientScreen({ preference, selectedPhoto }: Props) {
  const { weather, schedule, upcomingEvents } = useDashboard();
  const [now, setNow] = useState(() => new Date());
  const [slot, setSlot] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [previousPhoto, setPreviousPhoto] = useState<number | null>(null);
  const infoOpacity = useRef(new Animated.Value(1)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const motion = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  const photos = useMemo<ImageSourcePropType[]>(() => {
    if (preference.photoSource === 'none') return [];
    if (preference.photoSource === 'selected' && selectedPhoto) return [{ uri: selectedPhoto }];
    return GALLERY;
  }, [preference.photoSource, selectedPhoto]);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
    return () => entrance.stopAnimation();
  }, [entrance]);

  useEffect(() => {
    if (!photos.length) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: PHOTO_INTERVAL_MS, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: PHOTO_INTERVAL_MS, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion, photos.length]);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      setPreviousPhoto(photoIndex);
      setPhotoIndex((index) => (index + 1) % photos.length);
    }, PHOTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [photoIndex, photos.length]);

  useEffect(() => {
    if (previousPhoto === null) return;
    photoOpacity.setValue(0);
    const transition = Animated.timing(photoOpacity, { toValue: 1, duration: 2200, useNativeDriver: true });
    transition.start(({ finished }) => { if (finished) setPreviousPhoto(null); });
    return () => transition.stop();
  }, [photoIndex, photoOpacity, previousPhoto]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(infoOpacity, { toValue: 0, duration: 900, useNativeDriver: true }).start(
        ({ finished }) => {
          if (!finished) return;
          setSlot((current) => (current + 1) % 4);
          Animated.timing(infoOpacity, { toValue: 1, duration: 1100, useNativeDriver: true }).start();
        }
      );
    }, INFO_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      infoOpacity.stopAnimation();
    };
  }, [infoOpacity]);

  const photoMotion = {
    transform: [
      { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1.13] }) },
      { translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) },
    ],
  };
  const weatherText = weather && weather.temp !== '--'
    ? `${weather.temp}°  ·  ${weather.condition}` : 'Weather unavailable';

  return (
    <Animated.View style={[styles.root, { opacity: entrance }]} accessibilityLabel="Ambient mode">
      {photos.length > 0 && <>
        {previousPhoto !== null && (
          <Animated.Image source={photos[previousPhoto]} resizeMode="cover"
            style={[styles.photo, photoMotion]} />
        )}
        <Animated.Image source={photos[photoIndex]} resizeMode="cover"
          style={[styles.photo, photoMotion,
            { opacity: previousPhoto === null ? 1 : photoOpacity }]} />
      </>}
      <View style={styles.dim} />
      <Animated.View style={[styles.info,
        [styles.slot0, styles.slot1, styles.slot2, styles.slot3][slot],
        { opacity: infoOpacity }]}>
        <Text style={styles.date} numberOfLines={1}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.time} numberOfLines={1}>
          {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
        <Text style={styles.weather} numberOfLines={1}>{weatherText}</Text>
        <Text style={styles.eventLabel}>NEXT UP</Text>
        <Text style={styles.event} numberOfLines={2}>
          {nextEvent(schedule, upcomingEvents, now)}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#05080D', overflow: 'hidden' },
  photo: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.57)' },
  info: { position: 'absolute', width: '42%', maxWidth: 690, minWidth: 280, padding: 24 },
  slot0: { left: '7%', top: '12%' },
  slot1: { right: '7%', top: '12%' },
  slot2: { right: '7%', bottom: '12%' },
  slot3: { left: '7%', bottom: '12%' },
  date: { color: '#D0D7DF', fontSize: 24, fontWeight: '500' },
  time: { color: '#F4F7FA', fontSize: 82, fontWeight: '300', fontVariant: ['tabular-nums'], marginTop: 5 },
  weather: { color: '#E7EDF3', fontSize: 26, fontWeight: '500', marginTop: 5 },
  eventLabel: { color: '#B4C2CF', fontSize: 15, fontWeight: '700', letterSpacing: 2, marginTop: 38 },
  event: { color: '#F4F7FA', fontSize: 25, lineHeight: 34, fontWeight: '500', marginTop: 8 },
});
