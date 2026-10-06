import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { lineKey, planCardContent } from './cardContentLayout';
import type { CardLine, CardPresentation } from './cardContentLayout';
import type { CardId } from '../../../theme/appearance';

interface CardContentLayoutInput {
  id: CardId;
  width: number;
  height: number;
  scale: number;
  title: string;
  subtitle?: string;
  lines: CardLine[];
  artWidth: number;
  artHeight: number;
  extraHeight: number;
  presentation: CardPresentation;
}

interface CardContentLayout {
  plan: ReturnType<typeof planCardContent>;
  measureHero: (event: LayoutChangeEvent) => void;
  measureRow: (line: CardLine, height: number) => void;
}

const MAX_ROW_MEASUREMENTS = 200;
const MEASUREMENT_TOLERANCE = 0.5;

/** Keep native measurements scoped to the content and dimensions they describe. */
export default function useCardContentLayout(
  input: CardContentLayoutInput,
): CardContentLayout {
  const [measuredHero, setMeasuredHero] = useState<{
    key: string;
    height: number;
  } | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const estimate = planCardContent({...input, measurements});
  const key = JSON.stringify([
    input.id,
    input.width,
    input.height,
    input.scale,
    input.title,
    input.subtitle,
    input.artWidth,
    input.artHeight,
    input.extraHeight,
    input.presentation,
    Boolean(input.lines.length),
    estimate.titleSize,
    estimate.titleLimit,
  ]);
  const plan = planCardContent({
    ...input,
    measuredHero: measuredHero?.key === key ? measuredHero.height : undefined,
    measurements,
  });

  function measureHero(event: LayoutChangeEvent) {
    const height = event.nativeEvent.layout.height + plan.header + plan.gap;
    setMeasuredHero((current) => {
      if (
        current?.key === key &&
        Math.abs(current.height - height) < MEASUREMENT_TOLERANCE
      )
        return current;
      return { key, height };
    });
  }

  function measureRow(line: CardLine, height: number) {
    const rowKey = lineKey(line, plan.cellWidth, plan.density, input.scale);
    setMeasurements((current) => {
      if (Math.abs((current[rowKey] ?? 0) - height) < MEASUREMENT_TOLERANCE)
        return current;
      // Bound the cache because live titles and available widths change over time.
      const recent = Object.entries(current).slice(-(MAX_ROW_MEASUREMENTS - 1));
      return { ...Object.fromEntries(recent), [rowKey]: height };
    });
  }

  return { plan, measureHero, measureRow };
}
