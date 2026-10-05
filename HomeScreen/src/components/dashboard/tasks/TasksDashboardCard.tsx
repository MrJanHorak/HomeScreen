import {useDashboard} from '../../../context/DashboardContext';
import CardContent from '../shared/CardContent';
import type {CardDimensions} from '../shared/types';

export default function TasksDashboardCard(dimensions: CardDimensions) {
  const pending = useDashboard().tasks.filter((task) => !task.completed);
  const title = pending.length
    ? `${pending.length} task${pending.length === 1 ? '' : 's'} to do`
    : 'All caught up';

  return (
    <CardContent
      {...dimensions}
      id="todo"
      title={title}
      subtitle={pending.length ? undefined : 'Nothing pending'}
      lines={pending.map((task) => ({
        title: task.title,
        detail: task.due ? `Due ${task.due.slice(0, 10)}` : undefined,
        icon: 'checkbox-blank-circle-outline',
      }))}
    />
  );
}
