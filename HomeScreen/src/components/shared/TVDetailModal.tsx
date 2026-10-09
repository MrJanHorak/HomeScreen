import Pressable from './NarratedPressable';
import Text from './ReadingText';
import React, { useCallback, useEffect, useRef } from 'react';
import {Modal, View, StyleSheet, Platform, BackHandler, useWindowDimensions} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {DetailBackContext, DetailFrameContext} from './DetailLayout';

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
  spacious = false,
  children,
}: TVDetailModalProps) {
  const theme = useTheme();
  const screen = useWindowDimensions();
  const compact = screen.height < 700;
  const [frame, setFrame] = React.useState({width: screen.width - 56, height: screen.height - 100});
  const [closeFocused, setCloseFocused] = React.useState(false);
  const closeButtonRef = useRef<View>(null);
  const nestedBack = useRef<(() => void) | null>(null);
  const registerBack = useCallback((handler: () => void) => {
    nestedBack.current = handler;
    return () => {if (nestedBack.current === handler) nestedBack.current = null;};
  }, []);
  const handleBack = useCallback(() => {
    if (nestedBack.current) nestedBack.current();
    else onClose();
  }, [onClose]);

  // TV Remote Back button and Web Escape key handler
  useEffect(() => {
    if (!visible) return;

    // Hardware back press on Android TV / Fire TV / Apple TV
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack();
        return true;
      },
    );

    // Escape key on Web / Browser
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA';
      if (e.key === 'Escape' || (e.key === 'Backspace' && !isEditing)) {
        handleBack();
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
  }, [visible, handleBack]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType='fade'
      onRequestClose={handleBack}
    >
      <View style={[styles.scrim, compact && styles.compactScrim]}>
        <View
          style={[
            styles.glassContainer,
            compact && styles.compactContainer,
            {
              backgroundColor: theme.colors.modalSurface,
              borderColor: theme.colors.glassBorder,
            },
          ]}
        >
          {/* Header Bar */}
          <View style={styles.header} testID='detail-header'>
            <View style={styles.titleArea}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: iconColor
                      ? `${iconColor}22`
                      : 'rgba(56, 189, 248, 0.15)',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={icon}
                  size={compact ? 20 : 24}
                  color={iconColor || theme.colors.focusRing}
                />
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.title,
                      { color: theme.colors.textPrimary },
                    ]}
                    accessibilityRole='header' accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}
                  >
                    {title}
                  </Text>
                </View>
              </View>
            </View>

            {/* TV-Focusable Close Button */}
            <Pressable
              ref={closeButtonRef}
              hasTVPreferredFocus={!spacious}
              accessibilityLabel={`Back from ${title}`}
              onFocus={() => setCloseFocused(true)}
              onBlur={() => setCloseFocused(false)}
              onPress={handleBack}
              style={[
                styles.closeButton,
                closeFocused && [
                  styles.closeButtonFocused,
                  { borderColor: theme.colors.focusRing },
                ],
              ]}
            >
              <MaterialCommunityIcons
                name='arrow-left'
                size={20}
                color={
                  closeFocused
                    ? theme.colors.textFocused
                    : theme.colors.textSecondary
                }
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
          <View style={styles.divider} />

          {/* Modal Content */}
          <View style={styles.contentArea} testID='detail-content' onLayout={({nativeEvent: {layout}}) =>
            setFrame((current) => current.width === layout.width && current.height === layout.height ? current : {width: layout.width, height: layout.height})}>
            <DetailFrameContext.Provider value={frame}>
              <DetailBackContext.Provider value={registerBack}>{children}</DetailBackContext.Provider>
            </DetailFrameContext.Provider>
          </View>
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
    padding: 24,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      } as any,
    }),
  },
  compactScrim: { padding: 12 },
  glassContainer: {
    width: '100%',
    maxWidth: 1800,
    height: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 18,
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
  compactContainer: {padding: 12, borderRadius: 18},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  titleArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
});
