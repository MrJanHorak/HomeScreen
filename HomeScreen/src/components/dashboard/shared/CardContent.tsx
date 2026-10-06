import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import useCardContentLayout from './useCardContentLayout';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import { useTheme } from '../../../theme/ThemeContext';
import type { CardId } from '../../../theme/appearance';
import type { CardPresentation } from './cardContentLayout';
import CardHeader from './CardHeader';
import CardContentRow from './CardContentRow';
import CardDetailsHint from './CardDetailsHint';
import type { CardDimensions, DashboardLine } from './types';

export interface CardContentProps extends CardDimensions {
  id: CardId;
  title: string;
  subtitle?: string;
  lines?: DashboardLine[];
  badge?: string;
  extra?: ReactNode;
  extraHeight?: number;
  art?: ReactNode;
  artWidth?: number;
  artHeight?: number;
  presentation?: CardPresentation;
}

/** Fit actual content before decorations or the details hint. */
export default function CardContent({
  id,
  width,
  height,
  title,
  subtitle,
  lines = [],
  badge,
  extra,
  extraHeight = 0,
  art,
  artWidth = 0,
  artHeight = 0,
  presentation = 'standard',
}: CardContentProps) {
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const { plan, measureHero, measureRow } = useCardContentLayout({
    id,
    width,
    height,
    scale,
    title,
    subtitle,
    lines,
    artWidth,
    artHeight,
    extraHeight,
    presentation,
  });
  const visible = lines.slice(0, plan.count);
  const groups = Array.from(
    { length: Math.ceil(visible.length / plan.columns) },
    (_, index) =>
      visible.slice(index * plan.columns, (index + 1) * plan.columns),
  );
  const hidden = lines.length - plan.count;
  const headerBadge = !plan.footer && hidden ? `+${hidden} more` : badge;

  return (
    <View
      testID={`adaptive-${id}`}
      style={{ height, width, minWidth: 0, overflow: 'hidden' }}
    >
      <View
        testID='card-hero'
        onLayout={measureHero}
        style={{ gap: plan.gap, flexShrink: 0 }}
      >
        <CardHeader
          id={id}
          scale={scale}
          height={plan.header}
          badge={headerBadge}
        />
        <View
          style={{ flexDirection: 'row', gap: plan.gap, alignItems: 'center' }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: plan.gap }}>
            <Text
              numberOfLines={plan.titleLimit}
              style={{
                color: theme.colors.textPrimary,
                fontSize: plan.titleSize,
                lineHeight: plan.titleSize * 1.2,
                fontWeight: '700',
              }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                numberOfLines={plan.subtitleCount || 1}
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 11 * scale,
                  lineHeight: plan.subtitleLine,
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {art}
        </View>
        {extra}
      </View>
      <View
        testID='card-rows'
        style={{ gap: plan.rowGap, marginTop: groups.length ? plan.rowGap : 0 }}
      >
        {groups.map((group, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              gap: plan.gap,
              alignItems: 'flex-start',
            }}
          >
            {group.map((line, column) => (
              <CardContentRow
                key={`${column}-${line.title}`}
                id={id}
                line={line}
                scale={scale}
                plan={plan}
                onMeasure={measureRow}
              />
            ))}
          </View>
        ))}
      </View>
      {plan.footer && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <CardDetailsHint scale={scale} hiddenCount={hidden} />
        </View>
      )}
    </View>
  );
}
