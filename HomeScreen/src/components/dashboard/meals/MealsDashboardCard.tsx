import type {
  MealPlanItem,
  MealPlanSummary,
} from '../../../../../shared/src/types';
import { useDashboard } from '../../../context/DashboardContext';
import CardContent from '../shared/CardContent';
import type { CardDimensions, DashboardLine } from '../shared/types';
import {shortDateLabel} from '../shared/dateLabels';
import useTVClock from '../../../hooks/useTVClock';

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function mealDetail(meal: MealPlanItem, today: string): string {
  return [
    meal.date === today ? 'Tonight' : shortDateLabel(meal.date),
    meal.servings ? `Serves ${meal.servings}` : '',
    meal.cook ? `Cook: ${meal.cook}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function emptyTitle(status: MealPlanSummary['status']): string {
  if (status === 'not_connected') return 'Connect a meal sheet';
  if (status === 'unavailable') return 'Meals unavailable';
  return 'No dinners planned';
}

export default function MealsDashboardCard(dimensions: CardDimensions) {
  const { meals } = useDashboard();
  const today = localDate(new Date(useTVClock()));
  const upcoming = meals.items
    .filter((meal) => meal.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const first = upcoming[0];
  const lines: DashboardLine[] = upcoming.slice(1).map((meal) => ({
    title: meal.title,
    detail: mealDetail(meal, today),
    compactDetail: meal.date.slice(5),
    section: 'Next dinners',
  }));
  if (first?.side) lines.push({ title: first.side, detail: 'On the side', section:'With dinner' });
  if (first?.note) lines.push({ title: first.note, detail:'Preparation note', icon: 'note-text-outline', section:'With dinner' });

  return (
    <CardContent
      {...dimensions}
      id='meal'
      presentation='meal'
      title={first?.title || emptyTitle(meals.status)}
      subtitle={
        first
          ? mealDetail(first, today)
          : meals.message || 'Open meal planner to check your connection'
      }
      badge='Dinner plan'
      lines={lines}
    />
  );
}
