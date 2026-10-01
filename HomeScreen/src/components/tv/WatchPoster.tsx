import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface WatchPosterProps {
  uri?: string | null;
  width: number;
  height: number;
}

export default function WatchPoster({ uri, width, height }: WatchPosterProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  if (uri && !failed) {
    return <Image source={{ uri }} onError={() => setFailed(true)} resizeMode="cover" style={{ width, height, borderRadius: 10 }} />;
  }
  return (
    <View style={[styles.placeholder, { width, height }]}>
      <MaterialCommunityIcons name="movie-open-play-outline" size={Math.min(width, height) * 0.45} color="#38BDF8" />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
