import type {TaskItem} from '../../../../../shared/src/types';
import {textLines} from '../shared/cardContentLayout';
import {shortDateLabel} from '../shared/dateLabels';

export function taskDue(task: TaskItem): string | undefined {
  const due = task.due?.trim();
  return due ? `Due ${shortDateLabel(due)}` : undefined;
}

/** Provider order is intentional; a date label without a year cannot establish urgency. */
export function pendingTasks(tasks: TaskItem[]) {
  const seen = new Set<string>();
  return tasks.filter(task => {
    const key = `${task.tasklistId || ''}:${task.id}`;
    if (task.completed || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function taskRowSizing(shallow: boolean, roomy: boolean) {
  return {titleSize: roomy ? 18 : 14, titleLine: roomy ? 24 : 18,
    titleLimit: shallow ? 1 : 2, detailSize:11, detailLine:14, detailGap:3, gap:shallow ? 8 : 10};
}

export function taskRowLines(task: TaskItem, width: number, row: ReturnType<typeof taskRowSizing>) {
  return textLines(task.title || 'Untitled task', width - 24, row.titleSize, row.titleLimit);
}

export function planTasksCard({width, height, scale, tasks}: {width:number; height:number; scale:number; tasks:TaskItem[]}) {
  const w = width / scale, h = height / scale;
  const shallow = h < 110;
  const columns = w >= 550 && tasks.length > 1 ? 2 : 1;
  const cellWidth = (w - (columns - 1) * 24) / columns;
  const header = 18, gap = shallow ? 6 : 10;
  const cap = shallow ? 2 : h < 220 ? 4 : 6;
  const available = h - header - gap;
  function fit(row: ReturnType<typeof taskRowSizing>, detail: boolean) {
    let best = {count:0, used:0};
    for (let count = 1; count <= Math.min(tasks.length, cap); count++) {
      const perColumn = Math.ceil(count / columns);
      const heights = Array.from({length:columns}, (_, col) => tasks.slice(col * perColumn, Math.min((col + 1) * perColumn, count))
        .map(task => taskRowLines(task, cellWidth, row) * row.titleLine + (detail && taskDue(task) ? row.detailGap + row.detailLine : 0)));
      const used = Math.max(...heights.map(rows => rows.reduce((sum, value) => sum + value, 0) + Math.max(0, rows.length - 1) * row.gap));
      if (used <= available) best = {count, used};
    }
    return best;
  }
  const baseRow = taskRowSizing(shallow, false);
  const plain = fit(baseRow, false);
  const withDetail = fit(baseRow, !shallow);
  const detail = !shallow && withDetail.count >= plain.count;
  const base = detail ? withDetail : plain;
  const largerRow = taskRowSizing(shallow, h >= 300 || tasks.length === 1 && h >= 150);
  const larger = fit(largerRow, detail);
  const row = larger.count >= base.count ? largerRow : baseRow;
  const fitted = larger.count >= base.count ? larger : base;
  const used = header + gap + fitted.used;
  return {shallow, columns, cellWidth:cellWidth * scale, row, count:fitted.count,
    header:header * scale, gap:gap * scale, used:used * scale, detail,
    footer:tasks.length > 0 && h - used >= 24, emptyIcon:!tasks.length && h >= 150 ? 48 * scale : 0};
}
