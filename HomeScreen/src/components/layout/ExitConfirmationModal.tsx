import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ExitConfirmationModalProps {
  visible: boolean;
  onCancel: () => void;
  onExit: () => void;
}

export default function ExitConfirmationModal({
  visible,
  onCancel,
  onExit,
}: ExitConfirmationModalProps) {
  const theme = useTheme();
  const [focusedButton, setFocusedButton] = useState<'stay' | 'exit' | null>(null);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        <View style={[styles.dialog, {
          backgroundColor: theme.colors.modalSurface,
          borderColor: theme.colors.glassBorder,
        }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Exit HomeScreen?</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            Are you sure you want to close the app?
          </Text>
          <View style={styles.actions}>
            <Pressable
              hasTVPreferredFocus
              accessibilityRole="button"
              onFocus={() => setFocusedButton('stay')}
              onBlur={() => setFocusedButton(null)}
              onPress={onCancel}
              style={[styles.button, {
                backgroundColor: focusedButton === 'stay'
                  ? theme.colors.glassSurfaceFocused : theme.colors.glassSubtle,
                borderColor: focusedButton === 'stay'
                  ? theme.colors.focusRing : theme.colors.glassBorder,
              }]}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>Stay in app</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onFocus={() => setFocusedButton('exit')}
              onBlur={() => setFocusedButton(null)}
              onPress={onExit}
              style={[styles.button, {
                backgroundColor: focusedButton === 'exit'
                  ? theme.colors.glassSurfaceFocused : theme.colors.glassSubtle,
                borderColor: focusedButton === 'exit'
                  ? theme.colors.focusRing : theme.colors.glassBorder,
              }]}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>Exit app</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 620,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    elevation: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 21,
    textAlign: 'center',
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
  },
  button: {
    minWidth: 190,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
  },
});
