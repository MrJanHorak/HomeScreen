import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import { PRESET_CITIES } from '../../services/weatherLocationService';

export default function SettingsDetailView() {
  const theme = useTheme();
  const { user } = useAuth();
  const {
    isLive,
    refresh,
    savedLocations,
    activeLocation,
    setActiveLocation,
    setDefaultLocation,
    addLocation,
    removeLocation,
    getWeatherForLoc,
  } = useDashboard();

  const [customName, setCustomName] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCustom = async () => {
    if (!customQuery.trim()) return;
    await addLocation(customName.trim() || customQuery.trim(), customQuery.trim());
    setCustomName('');
    setCustomQuery('');
    setShowAddForm(false);
  };

  const handleAddPreset = async (city: { name: string; query: string }) => {
    // Check if already added
    if (savedLocations.some((l) => l.query.toLowerCase() === city.query.toLowerCase())) {
      return;
    }
    await addLocation(city.name, city.query);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Weather Locations Section */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderTitle}>
            <MaterialCommunityIcons name="map-marker-multiple" size={24} color={theme.colors.focusRing} />
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              Weather Locations
            </Text>
          </View>
          <Pressable
            onPress={() => setShowAddForm(!showAddForm)}
            style={[
              styles.smallActionBtn,
              { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
            ]}
          >
            <MaterialCommunityIcons
              name={showAddForm ? 'close' : 'plus'}
              size={18}
              color={theme.colors.focusRing}
            />
            <Text style={[styles.smallActionText, { color: theme.colors.focusRing }]}>
              {showAddForm ? 'Cancel' : 'Add Location'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
          Manage tracked cities. Switch active weather anytime from your dashboard or detail view.
        </Text>

        {/* Add Location Form / Presets */}
        {showAddForm && (
          <View style={styles.addFormContainer}>
            <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>
              Quick Add Popular Cities
            </Text>
            <View style={styles.presetsRow}>
              {PRESET_CITIES.map((city) => {
                const alreadyAdded = savedLocations.some(
                  (l) => l.query.toLowerCase() === city.query.toLowerCase()
                );
                return (
                  <Pressable
                    key={city.query}
                    disabled={alreadyAdded}
                    onPress={() => handleAddPreset(city)}
                    style={[
                      styles.presetChip,
                      alreadyAdded && styles.presetChipDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: alreadyAdded ? theme.colors.textSecondary : theme.colors.textPrimary },
                      ]}
                    >
                      {alreadyAdded ? `✓ ${city.name}` : `+ ${city.name}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.formLabel, { color: theme.colors.textPrimary, marginTop: 16 }]}>
              Or Enter Custom City
            </Text>
            <View style={styles.inputsRow}>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="Label (e.g. Vacation Cabin)"
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.textInput, { color: theme.colors.textPrimary }]}
              />
              <TextInput
                value={customQuery}
                onChangeText={setCustomQuery}
                placeholder="City, State/Country (e.g. Denver, CO)"
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.textInput, { color: theme.colors.textPrimary }]}
              />
              <Pressable
                onPress={handleAddCustom}
                disabled={!customQuery.trim()}
                style={[
                  styles.saveBtn,
                  { backgroundColor: customQuery.trim() ? theme.colors.focusRing : 'rgba(255, 255, 255, 0.1)' },
                ]}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Saved Locations List */}
        <View style={styles.locationsList}>
          {savedLocations.map((loc) => {
            const isActive = loc.id === activeLocation.id;
            const isDefault = Boolean(loc.isDefault);
            const locWeather = getWeatherForLoc(loc);

            return (
              <View
                key={loc.id}
                style={[
                  styles.locationRow,
                  isActive && [
                    styles.activeLocationRow,
                    { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.08)' },
                  ],
                ]}
              >
                <View style={styles.locLeftGroup}>
                  <View
                    style={[
                      styles.locIconCircle,
                      { backgroundColor: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={20}
                      color={isActive ? theme.colors.focusRing : theme.colors.textSecondary}
                    />
                  </View>

                  <View>
                    <View style={styles.locTitleRow}>
                      <Text style={[styles.locName, { color: theme.colors.textPrimary }]}>
                        {loc.name}
                      </Text>
                      {isActive && (
                        <View style={styles.activeTag}>
                          <Text style={styles.activeTagText}>ACTIVE</Text>
                        </View>
                      )}
                      {isDefault && (
                        <View style={styles.defaultTag}>
                          <Text style={styles.defaultTagText}>DEFAULT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.locQuery, { color: theme.colors.textSecondary }]}>
                      {loc.query} • {locWeather.temp} {locWeather.condition}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.locActions}>
                  {!isActive && (
                    <Pressable
                      onPress={() => setActiveLocation(loc)}
                      style={styles.pillActionBtn}
                    >
                      <Text style={[styles.pillActionText, { color: theme.colors.focusRing }]}>
                        Select
                      </Text>
                    </Pressable>
                  )}

                  {!isDefault && (
                    <Pressable
                      onPress={() => setDefaultLocation(loc.id)}
                      style={styles.pillActionBtn}
                    >
                      <Text style={[styles.pillActionText, { color: theme.colors.textSecondary }]}>
                        Make Default
                      </Text>
                    </Pressable>
                  )}

                  {savedLocations.length > 1 && (
                    <Pressable
                      onPress={() => removeLocation(loc.id)}
                      style={styles.deleteBtn}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Device & Account Card */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          Device & Connectivity
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <MaterialCommunityIcons name="television" size={20} color={theme.colors.focusRing} />
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Device Name</Text>
          </View>
          <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>Living Room Smart TV</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <MaterialCommunityIcons name="cloud-sync" size={20} color={isLive ? '#10B981' : '#F59E0B'} />
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Data Sync</Text>
          </View>
          <Text style={[styles.infoValue, { color: isLive ? '#10B981' : '#F59E0B' }]}>
            {isLive ? 'Connected & Live' : 'Unavailable'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <MaterialCommunityIcons name="account-circle-outline" size={20} color={theme.colors.focusRing} />
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Signed-in User</Text>
          </View>
          <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>
            {user?.email || 'Not signed in'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <MaterialCommunityIcons name="aspect-ratio" size={20} color={theme.colors.focusRing} />
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Display Canvas</Text>
          </View>
          <Text style={[styles.infoValue, { color: theme.colors.textPrimary }]}>1080p (16:9 10ft UI)</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => refresh()}
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
            pressed && { opacity: 0.8 },
          ]}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.focusRing} />
          <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>
            Refresh Live Data
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addFormContainer: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  presetChipDisabled: {
    opacity: 0.5,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    fontSize: 14,
    // outline: 'none',
  } as any,
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationsList: {
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  activeLocationRow: {
    borderWidth: 1.5,
  },
  locLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locName: {
    fontSize: 16,
    fontWeight: '700',
  },
  activeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#38BDF8',
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  defaultTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  defaultTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  locQuery: {
    fontSize: 13,
    marginTop: 2,
  },
  locActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  pillActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

