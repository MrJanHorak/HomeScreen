import {Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useDashboard} from '../../../context/DashboardContext';
import useCompactTVLayout from '../../../hooks/useCompactTVLayout';
import {useTheme} from '../../../theme/ThemeContext';
import CardHeader from '../shared/CardHeader';
import CardTextBlock from '../shared/CardTextBlock';
import CardDetailsHint from '../shared/CardDetailsHint';
import type {CardDimensions} from '../shared/types';
import {pendingTasks, planTasksCard, taskDue, taskRowLines} from './tasksCardLayout';

export default function TasksDashboardCard({width, height}: CardDimensions) {
  const theme = useTheme();
  const scale = useCompactTVLayout() ? 1 : 1.4;
  const pending = pendingTasks(useDashboard().tasks);
  const plan = planTasksCard({width, height, scale, tasks:pending});
  const visible = pending.slice(0, plan.count);
  const perColumn = Math.ceil(visible.length / plan.columns);
  const row = plan.row;
  return <View testID='adaptive-todo' style={{width, height, minWidth:0}}>
    <View testID='tasks-content' style={{gap:plan.gap}}>
      <CardHeader id='todo' height={plan.header} scale={scale}
        badge={pending.length ? `${pending.length} task${pending.length === 1 ? '' : 's'} to do` : undefined} />
      {pending.length ? <View style={{flexDirection:'row', gap:24 * scale}}>
        {Array.from({length:plan.columns}, (_, col) => <View key={col} style={{width:plan.cellWidth, gap:row.gap * scale}}>
          {visible.slice(col * perColumn, (col + 1) * perColumn).map(task => <View
            key={`${task.tasklistId || ''}:${task.id}`} testID='card-row' accessible
            accessibilityLabel={[task.title || 'Untitled task', taskDue(task)].filter(Boolean).join(', ')}
            style={{flexDirection:'row', gap:8 * scale, alignItems:'flex-start'}}>
            <MaterialCommunityIcons name='checkbox-blank-circle-outline' size={16 * scale}
              color={theme.colors.focusRing} style={{width:16 * scale, lineHeight:row.titleLine * scale}} />
            <CardTextBlock style={{flex:1}} title={task.title || 'Untitled task'} detail={plan.detail ? taskDue(task) : undefined}
              titleTestID='card-row-title' titleLines={taskRowLines(task, plan.cellWidth / scale, row)}
              titleSize={row.titleSize * scale} titleLine={row.titleLine * scale}
              detailSize={row.detailSize * scale} detailLine={row.detailLine * scale} detailGap={row.detailGap * scale} />
          </View>)}
        </View>)}
      </View> : <View testID='tasks-empty' style={{gap:8 * scale}}>
        {plan.emptyIcon > 0 && <MaterialCommunityIcons name='checkbox-marked-circle-outline' size={plan.emptyIcon} color={theme.colors.focusRing} />}
        <Text style={{fontSize:20 * scale, lineHeight:24 * scale, fontWeight:'700', color:theme.colors.textPrimary}}>All caught up</Text>
        {height / scale >= 110 && <Text style={{fontSize:11 * scale, lineHeight:14 * scale, color:theme.colors.textSecondary}}>Nothing pending</Text>}
      </View>}
    </View>
    {plan.footer && <View testID='tasks-details-hint' style={{position:'absolute', bottom:0, left:0, right:0}}>
      <CardDetailsHint scale={scale} hiddenCount={pending.length - plan.count} />
    </View>}
  </View>;
}
