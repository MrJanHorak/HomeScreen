import { View, StyleSheet } from 'react-native';
import TVText from '../tv/TVText';
import { useDashboard } from '../../context/DashboardContext';

export default function ToDo() {
  const { tasks, isLoading } = useDashboard();

  return (
    <View style={styles.container}>
      <TVText text="TO DO" typography="caption" color="textSecondary" style={styles.header} />
      <View style={styles.taskList}>
        {isLoading && tasks.length === 0 ? (
          <TVText text="Loading tasks..." typography="caption" color="textSecondary" />
        ) : tasks.length === 0 ? (
          <TVText text="No pending tasks!" typography="caption" color="textSecondary" />
        ) : (
          tasks.slice(0, 4).map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <TVText
                text={`[ ] ${task.title}`}
                typography="caption"
                numberOfLines={1}
                color={task.completed ? 'textSecondary' : 'textPrimary'}
              />
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  header: {
    alignSelf: 'center',
    marginBottom: 6,
  },
  taskList: {
    gap: 4,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});