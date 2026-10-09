import Pressable from '../../shared/NarratedPressable';
import TextInput from '../../shared/NarratedTextInput';
import Text from '../../shared/ReadingText';
import { useRef, useState } from 'react';
import {View, StyleSheet, Platform} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useDashboard } from '../../../context/DashboardContext';
import { useControlFocus } from '../../../hooks/useControlFocus';
import { PRESET_CITIES } from '../../../services/weatherLocationService';
import SettingsPanel from '../shared/SettingsPanel';

export default function WeatherSettings() {
  const theme = useTheme();
  const {
    locationError,
    savedLocations,
    activeLocation,
    setActiveLocation,
    setDefaultLocation,
    addLocation,
    removeLocation,
    getWeatherForLoc,
  } = useDashboard();
  const { focusedControl, focusProps, focusStyle } = useControlFocus();
  const [customName, setCustomName] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const cityInputRef = useRef<TextInput>(null);

  const handleAddCustom = async () => {
    if (!customQuery.trim()) return;
    if (
      !(await addLocation(
        customName.trim() || customQuery.trim(),
        customQuery.trim(),
      ))
    )
      return;
    setCustomName('');
    setCustomQuery('');
    setShowAddForm(false);
  };

  const handleAddPreset = async (city: { name: string; query: string }) => {
    // Check if already added
    if (
      savedLocations.some(
        (l) => l.query.toLowerCase() === city.query.toLowerCase(),
      )
    ) {
      return;
    }
    await addLocation(city.name, city.query);
  };

  return (
    <>
      {locationError && (
        <Text
          accessibilityRole='alert'
          style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}
        >
          {locationError}
        </Text>
      )}
      {/* Weather Locations Section */}
      <SettingsPanel>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderTitle}>
            <MaterialCommunityIcons
              name='map-marker-multiple'
              size={24}
              color={theme.colors.focusRing}
            />
            <Text
              style={[styles.cardTitle, { color: theme.colors.textPrimary }]}
            >
              Weather Locations
            </Text>
          </View>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={
              showAddForm ? 'Close add location' : 'Add weather location'
            }
            {...focusProps('add-location')}
            onPress={() => setShowAddForm(!showAddForm)}
            style={[
              styles.smallActionBtn,
              {
                borderColor: theme.colors.focusRing,
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
              },
              focusStyle('add-location'),
            ]}
          >
            <MaterialCommunityIcons
              name={showAddForm ? 'close' : 'plus'}
              size={18}
              color={theme.colors.focusRing}
            />
            <Text
              style={[
                styles.smallActionText,
                { color: theme.colors.focusRing },
              ]}
            >
              {showAddForm ? 'Cancel' : 'Add Location'}
            </Text>
          </Pressable>
        </View>

        {/* Add Location Form / Presets */}
        {showAddForm && (
          <View style={styles.addFormContainer}>
            <Text
              style={[styles.formLabel, { color: theme.colors.textPrimary }]}
            >
              Quick Add Popular Cities
            </Text>
            <View style={styles.presetsRow}>
              {PRESET_CITIES.map((city) => {
                const alreadyAdded = savedLocations.some(
                  (l) => l.query.toLowerCase() === city.query.toLowerCase(),
                );
                return (
                  <Pressable
                    key={city.query}
                    accessibilityRole='button'
                    accessibilityLabel={`Add ${city.name}`}
                    {...focusProps(`preset-${city.query}`)}
                    disabled={alreadyAdded}
                    onPress={() => handleAddPreset(city)}
                    style={[
                      styles.presetChip,
                      alreadyAdded && styles.presetChipDisabled,
                      focusStyle(`preset-${city.query}`),
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: alreadyAdded
                            ? theme.colors.textSecondary
                            : theme.colors.textPrimary,
                        },
                      ]}
                    >
                      {alreadyAdded ? `✓ ${city.name}` : `+ ${city.name}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.formLabel,
                { color: theme.colors.textPrimary, marginTop: 16 },
              ]}
            >
              Or Enter Custom City
            </Text>
            <View style={styles.inputsRow}>
              <Text
                style={[styles.inputLabel, { color: theme.colors.textPrimary }]}
              >
                Label (optional)
              </Text>
              <TextInput
                accessibilityLabel='Location label, optional'
                {...focusProps('custom-name')}
                value={customName}
                onChangeText={setCustomName}
                placeholder='Label (e.g. Vacation Cabin)'
                returnKeyType='next'
                onSubmitEditing={() => cityInputRef.current?.focus()}
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.textInput,
                  { color: theme.colors.textPrimary },
                  focusStyle('custom-name'),
                ]}
              />
              <Text
                style={[styles.inputLabel, { color: theme.colors.textPrimary }]}
              >
                City, state or country
              </Text>
              <TextInput
                ref={cityInputRef}
                accessibilityLabel='City, state or country'
                {...focusProps('custom-query')}
                value={customQuery}
                onChangeText={setCustomQuery}
                placeholder='City, State/Country (e.g. Denver, CO)'
                returnKeyType='done'
                onSubmitEditing={() => void handleAddCustom()}
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.textInput,
                  { color: theme.colors.textPrimary },
                  focusStyle('custom-query'),
                ]}
              />
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Save custom weather location'
                {...focusProps('save-location')}
                onPress={handleAddCustom}
                disabled={!customQuery.trim()}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      focusedControl === 'save-location'
                        ? theme.colors.focusRing
                        : theme.colors.glassSurface,
                    borderColor:
                      focusedControl === 'save-location'
                        ? '#FFFFFF'
                        : theme.colors.focusRing,
                    opacity: customQuery.trim() ? 1 : 0.45,
                  },
                  focusedControl === 'save-location' && styles.saveBtnFocused,
                ]}
              >
                <Text
                  style={[
                    styles.saveBtnText,
                    {
                      color:
                        focusedControl === 'save-location'
                          ? '#0F172A'
                          : theme.colors.focusRing,
                    },
                  ]}
                >
                  Save city
                </Text>
              </Pressable>
            </View>
            <Text
              style={[styles.formHint, { color: theme.colors.textSecondary }]}
            >
              Press Done on the keyboard to save the city.
            </Text>
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
                    {
                      borderColor: theme.colors.focusRing,
                      backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    },
                  ],
                ]}
              >
                <View style={styles.locLeftGroup}>
                  <View
                    style={[
                      styles.locIconCircle,
                      {
                        backgroundColor: isActive
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'rgba(255, 255, 255, 0.06)',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name='map-marker'
                      size={20}
                      color={
                        isActive
                          ? theme.colors.focusRing
                          : theme.colors.textSecondary
                      }
                    />
                  </View>

                  <View>
                    <View style={styles.locTitleRow}>
                      <Text
                        style={[
                          styles.locName,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
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
                    <Text
                      style={[
                        styles.locQuery,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {loc.query} • {locWeather.temp} {locWeather.condition}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.locActions}>
                  {!isActive && (
                    <Pressable
                      accessibilityRole='button'
                      accessibilityLabel={`Select ${loc.name} for weather`}
                      {...focusProps(`select-${loc.id}`)}
                      onPress={() => setActiveLocation(loc)}
                      style={[
                        styles.pillActionBtn,
                        focusStyle(`select-${loc.id}`),
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillActionText,
                          { color: theme.colors.focusRing },
                        ]}
                      >
                        Select
                      </Text>
                    </Pressable>
                  )}

                  {!isDefault && (
                    <Pressable
                      accessibilityRole='button'
                      accessibilityLabel={`Make ${loc.name} the default weather location`}
                      {...focusProps(`default-${loc.id}`)}
                      onPress={() => setDefaultLocation(loc.id)}
                      style={[
                        styles.pillActionBtn,
                        focusStyle(`default-${loc.id}`),
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillActionText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Make Default
                      </Text>
                    </Pressable>
                  )}

                  {savedLocations.length > 1 && (
                    <Pressable
                      accessibilityRole='button'
                      accessibilityLabel={`Remove ${loc.name} weather location`}
                      {...focusProps(`remove-${loc.id}`)}
                      onPress={() => removeLocation(loc.id)}
                      style={[styles.deleteBtn, focusStyle(`remove-${loc.id}`)]}
                    >
                      <MaterialCommunityIcons
                        name='trash-can-outline'
                        size={18}
                        color='#EF4444'
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </SettingsPanel>
    </>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
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
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
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
    gap: 8,
    maxWidth: 680,
  },
  inputLabel: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  formHint: { fontSize: 13, marginTop: 10 },
  textInput: {
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    fontSize: 18,
  },
  saveBtn: {
    minHeight: 50,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtnFocused: { borderWidth: 3, transform: [{ scale: 1.05 }] },
  locationsList: {
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
    minHeight: 46,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  pillActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    minWidth: 46,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});
