import { cardSectionLayout } from '../shared/cardSectionLayout';

export type WeatherFamily = 'essential' | 'current' | 'forecast' | 'tall' | 'wide-short' | 'large';

/** One set of forecast tokens supplies both the render styles and the space budget. */
export function weatherForecastSizing(shallow: boolean, roomy: boolean) {
  const labelSize = shallow ? 10 : roomy ? 12 : 11;
  const labelLine = shallow ? 12 : roomy ? 16 : 14;
  const temperatureSize = shallow ? 14 : roomy ? 22 : 17;
  const temperatureLine = shallow ? 16 : roomy ? 26 : 20;
  const probabilitySize = roomy ? 11 : 10;
  const probabilityLine = roomy ? 14 : 12;
  const icon = shallow ? 18 : roomy ? 32 : 24;
  const dayTemperatureSize = roomy ? 16 : 13;
  const dayTemperatureLine = roomy ? 22 : 18;
  const hourGap = shallow ? 2 : roomy ? 4 : 3;
  const dayGap = shallow ? 2 : roomy ? 5 : 4;
  const bar = shallow ? 0 : roomy ? 4 : 3;
  const heading = cardSectionLayout(shallow).height;
  return { labelSize, labelLine, temperatureSize, temperatureLine, probabilitySize,
    probabilityLine, icon, dayTemperatureSize, dayTemperatureLine, hourGap, dayGap, bar,
    hourlyHeight: heading + labelLine + temperatureLine + probabilityLine + bar + hourGap * (bar ? 3 : 2),
    dailyHeight: heading + labelLine + icon + dayTemperatureLine + dayGap * 2 };
}

/** Families depend on the measured inner box, never a grid footprint or pixel resolution. */
export function weatherFamily(width: number, height: number): WeatherFamily {
  if (width >= 430 && height >= 300) return 'large';
  // Keep the side forecast until a below-hero strip has a comfortable full budget.
  if (width >= 430 && height < 210) return 'wide-short';
  if (height < 110) return 'essential';
  if (height < 190) return 'current';
  if (height >= 300) return 'tall';
  return 'forecast';
}

export function planWeatherCard({ width, height, scale, temperature, hasContext,
  hourlyCount, dailyCount, hasMetrics, hasIcon }: {
  width: number; height: number; scale: number; temperature: string;
  hasContext: boolean; hourlyCount: number; dailyCount: number;
  hasMetrics: boolean; hasIcon: boolean;
}) {
  const w = width / scale;
  const h = height / scale;
  const family = weatherFamily(w, h);
  const shallow = h < 110;
  const roomyForecast = h >= 400;
  const forecastSizing = weatherForecastSizing(shallow, roomyForecast);
  const sideBySide = family === 'wide-short' && (
    (hourlyCount > 0 && h - (shallow ? 20 : 24) >= forecastSizing.hourlyHeight) ||
    (dailyCount > 0 && h - (shallow ? 20 : 24) >= forecastSizing.dailyHeight));
  const currentWidth = sideBySide ? Math.min(300, w * 0.38) : w;
  const forecastWidth = sideBySide ? w - currentWidth - 16 : w;
  const header = shallow ? 16 : 18;
  const gap = shallow ? 4 : 6;
  const conditionLine = shallow ? 16 : 18;
  const context = hasContext && !shallow;
  const preferredSize = shallow ? 32 : h < 220 ? 38 : h < 300 ? 48 : h < 400 ? 52 : w >= 430 ? 80 : 64;
  const preferredIcon = shallow ? 40 : h < 220 ? 56 : h < 400 ? 64 : 104;
  // Long signed/unit-bearing temperatures keep their value before spending width on art.
  const minTextWidth = temperature.length * preferredSize * 0.58;
  const icon = hasIcon && currentWidth >= minTextWidth + preferredIcon + 8 ? preferredIcon : 0;
  const temperatureSize = Math.min(preferredSize, Math.max(28,
    (currentWidth - (icon ? icon + 8 : 0)) / (Math.max(1, temperature.length) * 0.58)));
  const temperatureLine = Math.ceil(temperatureSize * 1.1);
  const hero = Math.max(icon, temperatureLine + 2 + conditionLine) + (context ? 20 : 0);
  const intro = header + gap + hero;
  // Section budgets include border/padding/heading and the gap from the preceding block.
  const { hourlyHeight, dailyHeight } = forecastSizing;
  const sectionGap = 8;
  const capacity = Math.min(4, Math.max(1, Math.floor((forecastWidth + 8) / 64)));
  let hours = 0;
  let days = 0;
  let used = intro;
  const canForecast = sideBySide || ['forecast', 'tall', 'large'].includes(family);
  if (canForecast) {
    let available = sideBySide ? h - header - gap : h - intro - sectionGap;
    if (hourlyCount && available >= hourlyHeight) {
      hours = Math.min(hourlyCount, capacity);
      available -= hourlyHeight + sectionGap;
      if (!sideBySide) used += hourlyHeight + sectionGap;
    }
    if (dailyCount && (!hours || ['tall', 'large'].includes(family)) && available >= dailyHeight) {
      days = Math.min(dailyCount, capacity);
      if (!sideBySide) used += dailyHeight + sectionGap;
    }
    if (sideBySide) used = header + gap + Math.max(hero, hours ? hourlyHeight : days ? dailyHeight : 0);
  }
  const metrics = hasMetrics && ['tall', 'large'].includes(family) && h - used >= 29;
  if (metrics) used += 29;
  const footer = h - used >= 22;
  return { family, sideBySide, shallow, roomyForecast, scale, header: header * scale, gap: gap * scale,
    currentWidth: currentWidth * scale, forecastWidth: forecastWidth * scale,
    temperatureSize: temperatureSize * scale, temperatureLine: temperatureLine * scale,
    conditionLine: conditionLine * scale, icon: icon * scale, context,
    hours, days, metrics, footer, used: used * scale };
}
