import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, ImageSourcePropType, StyleSheet, Text, View,
} from 'react-native';
import { useDashboard } from '../../context/DashboardContext';
import type { AmbientPreference } from '../../theme/appearance';
import type { SelectedPhoto } from '../../services/api';
import type { CalendarEvent } from '../../../../shared/src/types';
import PlasmaBackdrop from './PlasmaBackdrop';

import galleryOne from '../../../assets/media/wp8860764-nasa-4k-wallpapers.jpg';
import galleryTwo from '../../../assets/media/wp8860783-nasa-4k-wallpapers.jpg';
import galleryThree from '../../../assets/media/wp8860799-nasa-4k-wallpapers.jpg';

const GALLERY: ImageSourcePropType[] = [galleryOne, galleryTwo, galleryThree];
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
  selectedPhotos: SelectedPhoto[];
}

export default function AmbientScreen({ preference, selectedPhotos }: Props) {
  const { weather, schedule, upcomingEvents, health, tasks, meals } = useDashboard();
  const [now, setNow] = useState(() => new Date());
  const [slot, setSlot] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [previousPhoto, setPreviousPhoto] = useState<number | null>(null);
  const [infoIndex, setInfoIndex] = useState(0);
  const infoOpacity = useRef(new Animated.Value(1)).current;
  const detailOpacity = useRef(new Animated.Value(1)).current;
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const motion = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  const photos = useMemo<ImageSourcePropType[]>(() => {
    if (preference.photoSource === 'none') return [];
    if (preference.photoSource === 'plasma') return [];
    if (preference.photoSource === 'selected') return selectedPhotos.map((photo) => ({ uri: photo.dataUrl }));
    return GALLERY;
  }, [preference.photoSource, selectedPhotos]);

  const photoIntervalMs = preference.photoMinutes * 60_000;

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
      Animated.timing(motion, { toValue: 1, duration: photoIntervalMs, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: photoIntervalMs, useNativeDriver: true }),
    ]));
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
  }, [photoIndex, photoIntervalMs, photos.length]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(detailOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start(
        ({ finished }) => {
          if (!finished) return;
          setInfoIndex((current) => current + 1);
          Animated.timing(detailOpacity, { toValue: 1, duration: 900, useNativeDriver: true }).start();
        }
      );
    }, preference.infoCycleSeconds * 1000);
    return () => {
      clearInterval(timer);
      detailOpacity.stopAnimation();
    };
  }, [detailOpacity, preference.infoCycleSeconds]);

  const photoMotion = {
    transform: [
      { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1.13] }) },
      { translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) },
    ],
  };
  const weatherText = weather && weather.temp !== '--'
    ? `${weather.temp}°  ·  ${weather.condition}` : 'Weather unavailable';
  const details: Array<{ label: string; value: string }> = [];
  if (preference.info.weather) details.push({ label: 'WEATHER', value: weatherText });
  if (preference.info.calendar) details.push({
    label: 'NEXT UP', value: nextEvent(schedule, upcomingEvents, now),
  });
  if (preference.info.activity && health?.status !== 'not_connected' && health?.steps !== undefined) {
    details.push({ label: 'ACTIVITY', value: `${health.steps.toLocaleString()} steps today` });
  }
  if (preference.info.tasks) details.push({
    label: 'TASKS', value: tasks.length
      ? `${tasks.length} to do  ·  ${tasks[0].title}` : 'All caught up',
  });
  if (preference.info.meals && meals.status === 'ok' && meals.items.length) {
    details.push({ label: 'MEAL PLAN', value: meals.items[0].title });
  }
  const detail = details.length ? details[infoIndex % details.length] : null;

  return (
    <Animated.View style={[styles.root, { opacity: entrance }]} accessibilityLabel="Ambient mode">
      {preference.photoSource === 'plasma' && <PlasmaBackdrop colors={preference.plasmaColors} />}
      {photos.length > 0 && <>
        {previousPhoto !== null && (
          <Animated.Image source={photos[previousPhoto]} resizeMode="cover"
            style={[styles.photo, photoMotion]} />
        )}
        <Animated.Image source={photos[photoIndex]} resizeMode="cover"
          style={[styles.photo, photoMotion,
            { opacity: previousPhoto === null ? 1 : photoOpacity }]} />
      </>}
      <View style={[styles.dim, preference.photoSource === 'plasma' && styles.plasmaDim]} />
      <Animated.View style={[styles.info,
        [styles.slot0, styles.slot1, styles.slot2, styles.slot3][slot],
        { opacity: infoOpacity }]}>
        <Text style={styles.date} numberOfLines={1}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.time} numberOfLines={1}>
          {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
        {detail && <Animated.View style={{ opacity: detailOpacity }}>
          <Text style={styles.eventLabel}>{detail.label}</Text>
          <Text style={styles.event} numberOfLines={2}>{detail.value}</Text>
        </Animated.View>}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#05080D', overflow: 'hidden' },
  photo: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.57)' },
  plasmaDim: { backgroundColor: 'rgba(0, 0, 0, 0.22)' },
  info: { position: 'absolute', width: '42%', maxWidth: 690, minWidth: 280, padding: 24 },
  slot0: { left: '7%', top: '12%' },
  slot1: { right: '7%', top: '12%' },
  slot2: { right: '7%', bottom: '12%' },
  slot3: { left: '7%', bottom: '12%' },
  date: { color: '#D0D7DF', fontSize: 24, fontWeight: '500' },
  time: { color: '#F4F7FA', fontSize: 82, fontWeight: '300', fontVariant: ['tabular-nums'], marginTop: 5 },
  eventLabel: { color: '#B4C2CF', fontSize: 15, fontWeight: '700', letterSpacing: 2, marginTop: 38 },
  event: { color: '#F4F7FA', fontSize: 25, lineHeight: 34, fontWeight: '500', marginTop: 8 },
});
