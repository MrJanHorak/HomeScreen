import Text from '../../shared/ReadingText';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useDashboard } from '../../../context/DashboardContext';

export default function ToDoDetailView() {
  const theme = useTheme();
  const { tasks, isLoading, completeTask } = useDashboard();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const toggleTask = (id: string) => {
    void completeTask(id);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <View style={styles.container}>
      {/* Top Filter & Count Bar */}
      <View style={styles.topBar}>
        <View style={styles.filterPills}>
          <Pressable
            onPress={() => setFilter('all')}
            style={[
              styles.filterPill,
              filter === 'all' && [
                styles.activeFilterPill,
                { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
              ],
            ]}
          >
            <Text style={[styles.filterText, { color: filter === 'all' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
              All ({tasks.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('pending')}
            style={[
              styles.filterPill,
              filter === 'pending' && [
                styles.activeFilterPill,
                { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
              ],
            ]}
          >
            <Text style={[styles.filterText, { color: filter === 'pending' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
              Pending ({pendingCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('completed')}
            style={[
              styles.filterPill,
              filter === 'completed' && [
                styles.activeFilterPill,
                { borderColor: theme.colors.focusRing, backgroundColor: 'rgba(56, 189, 248, 0.15)' },
              ],
            ]}
          >
            <Text style={[styles.filterText, { color: filter === 'completed' ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
              Completed ({completedCount})
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsBadge}>
          <Text style={[styles.statsBadgeText, { color: theme.colors.focusRing }]}>
            {pendingCount === 0 ? '🎉 All tasks done!' : `${pendingCount} tasks remaining`}
          </Text>
        </View>
      </View>

      {/* Task List */}
      <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
        <View style={styles.taskWrapper}>
          {filteredTasks.length === 0 && (
            <Text style={[styles.dueText, { color: theme.colors.textSecondary }]}>
              {isLoading ? 'Loading tasks…' : filter === 'completed'
                ? 'Completed tasks are not included in this feed yet.'
                : 'No pending tasks.'}
            </Text>
          )}
          {filteredTasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => toggleTask(task.id)}
              disabled={Boolean(task.completed)}
              style={({ pressed }) => [
                styles.taskCard,
                task.completed && styles.taskCardCompleted,
                pressed && { opacity: 0.8 },
              ]}
            >
              <MaterialCommunityIcons
                name={task.completed ? 'check-circle' : 'checkbox-blank-circle-outline'}
                size={26}
                color={task.completed ? '#10B981' : theme.colors.focusRing}
                style={styles.checkIcon}
              />

              <View style={styles.taskMeta}>
                <Text
                  style={[
                    styles.taskTitle,
                    {
                      color: task.completed ? theme.colors.textSecondary : theme.colors.textPrimary,
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {task.title}
                </Text>
                {task.due && (
                  <View style={styles.dueRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.dueText, { color: theme.colors.textSecondary }]}>
                      {task.due}
                    </Text>
                  </View>
                )}
              </View>

            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 10,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeFilterPill: {
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  statsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  taskWrapper: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    gap: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  taskCardCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    opacity: 0.65,
  },
  checkIcon: {
    marginRight: 4,
  },
  taskMeta: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dueText: {
    fontSize: 13,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
});
