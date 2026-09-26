import { View, StyleSheet, ViewStyle } from 'react-native';
import TVText from './TVText';
import { TVTheme } from '../../theme/tvTheme';

type SpacingVariant = keyof typeof TVTheme.spacing;

export interface TVSectionProps {
  title?: string;
  actionText?: string;
  onActionPress?: () => void;
  direction?: 'row' | 'column';
  gap?: SpacingVariant;
  marginBottom?: SpacingVariant;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function TVSection({
  title,
  actionText,
  onActionPress,
  direction = 'row',
  gap = 'md',
  marginBottom = 'xl',
  children,
  style,
}: TVSectionProps) {
  const contentStyle: ViewStyle = {
    flexDirection: direction,
    gap: TVTheme.spacing[gap],
    width: '100%',
    alignItems: 'stretch',
  };

  const containerStyle: ViewStyle = {
    marginBottom: TVTheme.spacing[marginBottom],
    width: '100%',
  };

  return (
    <View style={[containerStyle, style]}>
      {/* Optional Header Area */}
      {title && (
        <View style={styles.headerRow}>
          <TVText text={title} typography='headerMd' color='textPrimary' />
          {actionText && (
            <TVText
              text={actionText}
              typography='caption'
              color='focusRing'
              onPress={onActionPress}
            />
          )}
        </View>
      )}

      {/* Children Container (Row or Column) */}
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: TVTheme.spacing.sm,
  },
});
