import { View, StyleSheet, Text } from 'react-native';
import TVText from '../tv/TVText';
import { useDashboard } from '../../context/DashboardContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export default function ToDo() {
  const { tasks, isLoading } = useDashboard();
  const theme = useTheme();

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <View style={styles.container}>
      {/* Header with Icon and Count Pill */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <MaterialCommunityIcons
            name="format-list-checks"
            size={22}
            color={theme.colors.focusRing}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            TO DO
          </Text>
        </View>
        {tasks.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>
              {pendingCount} left
            </Text>
          </View>
        )}
      </View>

      {/* Task List */}
      <View style={styles.taskList}>
        {isLoading && tasks.length === 0 ? (
          <TVText text="Loading tasks..." typography="caption" color="textSecondary" />
        ) : tasks.length === 0 ? (
          <TVText text="No pending tasks!" typography="caption" color="textSecondary" />
        ) : (
          tasks.slice(0, 4).map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <MaterialCommunityIcons
                name={task.completed ? 'check-circle' : 'checkbox-blank-circle-outline'}
                size={20}
                color={task.completed ? '#10B981' : theme.colors.textSecondary}
                style={styles.checkIcon}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.taskTitle,
                  {
                    color: task.completed
                      ? theme.colors.textSecondary
                      : theme.colors.textPrimary,
                    textDecorationLine: task.completed ? 'line-through' : 'none',
                    opacity: task.completed ? 0.6 : 1,
                  },
                ]}
              >
                {task.title}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  checkIcon: {
    marginRight: 10,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
  },
});