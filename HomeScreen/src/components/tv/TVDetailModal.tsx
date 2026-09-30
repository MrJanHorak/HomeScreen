import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export interface TVDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  badgeText?: string;
  spacious?: boolean;
  children: React.ReactNode;
}

export default function TVDetailModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconColor,
  badgeText,
  spacious = false,
  children,
}: TVDetailModalProps) {
  const theme = useTheme();
  const [closeFocused, setCloseFocused] = React.useState(false);
  const closeButtonRef = useRef<View>(null);

  // TV Remote Back button and Web Escape key handler
  useEffect(() => {
    if (!visible) return;

    // Hardware back press on Android TV / Fire TV / Apple TV
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      }
    );

    // Escape key on Web / Browser
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing = target?.isContentEditable ||
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (e.key === 'Escape' || (e.key === 'Backspace' && !isEditing)) {
        onClose();
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      backSubscription.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.scrim, spacious && styles.spaciousScrim]}>
        <View style={[styles.glassContainer, spacious && styles.spaciousContainer,
          { backgroundColor: theme.colors.modalSurface, borderColor: theme.colors.glassBorder }]}>
          {/* Header Bar */}
          <View style={[styles.header, spacious && styles.spaciousHeader]}>
            <View style={styles.titleArea}>
              <View
                style={[
                  styles.iconBadge,
                  spacious && styles.spaciousIconBadge,
                  { backgroundColor: iconColor ? `${iconColor}22` : 'rgba(56, 189, 248, 0.15)' },
                ]}
              >
                <MaterialCommunityIcons
                  name={icon}
                  size={spacious ? 22 : 28}
                  color={iconColor || theme.colors.focusRing}
                />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, spacious && styles.spaciousTitle, { color: theme.colors.textPrimary }]}>
                    {title}
                  </Text>
                  {badgeText && (
                    <View style={styles.contextBadge}>
                      <Text style={[styles.contextBadgeText, { color: theme.colors.focusRing }]}>
                        {badgeText}
                      </Text>
                    </View>
                  )}
                </View>
                {subtitle && (
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>

            {/* TV-Focusable Close Button */}
            <Pressable
              ref={closeButtonRef}
              hasTVPreferredFocus={!spacious}
              onFocus={() => setCloseFocused(true)}
              onBlur={() => setCloseFocused(false)}
              onPress={onClose}
              style={[
                styles.closeButton,
                closeFocused && [
                  styles.closeButtonFocused,
                  { borderColor: theme.colors.focusRing },
                ],
              ]}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={closeFocused ? theme.colors.textFocused : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.closeButtonText,
                  {
                    color: closeFocused
                      ? theme.colors.textFocused
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                Back
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={[styles.divider, spacious && styles.spaciousDivider]} />

          {/* Modal Content */}
          <View style={styles.contentArea}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 36,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      } as any,
    }),
  },
  spaciousScrim: { padding: 20 },
  glassContainer: {
    width: '100%',
    maxWidth: 1400,
    height: '88%',
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 36,
    elevation: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(36px)',
        WebkitBackdropFilter: 'blur(36px)',
        boxShadow:
          '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
      } as any,
    }),
  },
  spaciousContainer: { height: '94%', padding: 18 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  spaciousHeader: { marginBottom: 10 },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaciousIconBadge: { width: 42, height: 42, borderRadius: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  spaciousTitle: { fontSize: 22 },
  contextBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  contextBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  closeButtonFocused: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    transform: [{ scale: 1.05 }],
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
      } as any,
    }),
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  escHint: {
    fontSize: 12,
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  spaciousDivider: { marginBottom: 10 },
  contentArea: {
    flex: 1,
  },
});
