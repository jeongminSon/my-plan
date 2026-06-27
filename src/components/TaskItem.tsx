import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Priority, RepeatRule, Task } from '../models/Task';
import { Theme } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { dueDateLabel, isOverdue } from '../utils/date';
import { priorityColor, priorityLabel } from '../utils/priority';
import { reminderLabel } from '../utils/reminder';
import { repeatLabel } from '../utils/repeat';

interface Props {
  task: Task;
  now: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCycleDue: (id: string, current: number | undefined) => void;
  listName?: string;
  onCycleList?: (id: string, current: string | undefined) => void;
  onCycleRepeat?: (id: string, current: RepeatRule | undefined) => void;
  onCycleReminder?: (task: Task) => void;
  onCyclePriority?: (id: string, current: Priority | undefined) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onRemoveSubtask?: (taskId: string, subtaskId: string) => void;
}

function TaskItemBase(props: Props) {
  const {
    task,
    now,
    onToggle,
    onDelete,
    onCycleDue,
    listName,
    onCycleList,
    onCycleRepeat,
    onCycleReminder,
    onCyclePriority,
    onAddSubtask,
    onToggleSubtask,
    onRemoveSubtask,
  } = props;
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const [newSub, setNewSub] = useState('');

  const overdue = !task.completed && isOverdue(task.dueDate, now);
  const subs = task.subtasks ?? [];
  const subDone = subs.filter((s) => s.completed).length;
  const accent = task.priority ? priorityColor(task.priority, theme) : 'transparent';

  const submitSub = () => {
    if (newSub.trim() && onAddSubtask) {
      onAddSubtask(task.id, newSub);
      setNewSub('');
    }
  };

  return (
    <View style={[styles.wrap, { borderLeftColor: accent }]}>
      <View style={styles.row}>
        <Pressable
          onPress={() => onToggle(task.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          accessibilityLabel={task.title}
          hitSlop={8}
        >
          <Text style={styles.checkbox}>{task.completed ? '☑' : '☐'}</Text>
        </Pressable>

        <View style={styles.main}>
          <Pressable
            onPress={() => onToggle(task.id)}
            onLongPress={() => onDelete(task.id)}
            delayLongPress={400}
            accessibilityHint="길게 누르면 삭제"
          >
            <Text style={[styles.title, task.completed && styles.completed]} numberOfLines={2}>
              {task.title}
            </Text>
            {task.memo ? (
              <Text style={styles.memo} numberOfLines={2}>
                {task.memo}
              </Text>
            ) : null}
          </Pressable>

          <View style={styles.metaRow}>
            {onCyclePriority ? (
              <Pressable onPress={() => onCyclePriority(task.id, task.priority)} accessibilityLabel="우선순위 변경" hitSlop={6}>
                <Text
                  style={[styles.metaText, task.priority ? { color: accent, fontWeight: '700' } : undefined]}
                  numberOfLines={1}
                >
                  {task.priority ? `⚑ ${priorityLabel(task.priority)}` : '⚑ 우선순위'}
                </Text>
              </Pressable>
            ) : null}
            {onCycleList ? (
              <Pressable onPress={() => onCycleList(task.id, task.listId)} accessibilityLabel="목록 변경" hitSlop={6}>
                <Text style={styles.metaText} numberOfLines={1}>{listName ? `📁 ${listName}` : '📁 없음'}</Text>
              </Pressable>
            ) : null}
            {onCycleRepeat ? (
              <Pressable onPress={() => onCycleRepeat(task.id, task.repeat)} accessibilityLabel="반복 변경" hitSlop={6}>
                <Text style={[styles.metaText, task.repeat && styles.metaActive]} numberOfLines={1}>
                  {task.repeat ? `🔁 ${repeatLabel(task.repeat)}` : '🔁 반복'}
                </Text>
              </Pressable>
            ) : null}
            {onCycleReminder ? (
              <Pressable onPress={() => onCycleReminder(task)} accessibilityLabel="알림 변경" hitSlop={6}>
                <Text style={[styles.metaText, task.reminderAt != null && styles.metaActive]} numberOfLines={1}>
                  {task.reminderAt != null ? `⏰ ${reminderLabel(task.reminderAt, now)}` : '⏰ 알림'}
                </Text>
              </Pressable>
            ) : null}
            {onAddSubtask ? (
              <Pressable onPress={() => setExpanded((e) => !e)} accessibilityLabel="하위 할일" hitSlop={6}>
                <Text style={[styles.metaText, subs.length > 0 && styles.metaActive]} numberOfLines={1}>
                  {subs.length > 0 ? `☑ ${subDone}/${subs.length}` : '☑ 하위'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => onCycleDue(task.id, task.dueDate)}
          accessibilityLabel="마감일 변경"
          hitSlop={8}
          style={[styles.dueChip, overdue && styles.dueChipOverdue]}
        >
          {task.dueDate != null ? (
            <Text style={[styles.dueText, overdue && styles.dueTextOverdue]}>
              {dueDateLabel(task.dueDate, now)}
              {overdue ? ' 지남' : ''}
            </Text>
          ) : (
            <Text style={styles.duePlaceholder}>＋날짜</Text>
          )}
        </Pressable>
      </View>

      {expanded && onAddSubtask ? (
        <View style={styles.subList}>
          {subs.map((s) => (
            <View key={s.id} style={styles.subRow}>
              <Pressable
                onPress={() => onToggleSubtask?.(task.id, s.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: s.completed }}
                hitSlop={6}
              >
                <Text style={styles.subCheck}>{s.completed ? '☑' : '☐'}</Text>
              </Pressable>
              <Text style={[styles.subTitle, s.completed && styles.completed]} numberOfLines={1}>
                {s.title}
              </Text>
              <Pressable onPress={() => onRemoveSubtask?.(task.id, s.id)} accessibilityLabel="하위 할일 삭제" hitSlop={6}>
                <Text style={styles.subRemove}>✕</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.subRow}>
            <TextInput
              style={styles.subInput}
              placeholder="하위 할일 추가"
              placeholderTextColor={theme.textFaint}
              value={newSub}
              onChangeText={setNewSub}
              onSubmitEditing={submitSub}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable onPress={submitSub} accessibilityLabel="하위 할일 추가 확인" hitSlop={6}>
              <Text style={styles.subAdd}>＋</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const TaskItem = memo(TaskItemBase);

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: {
      borderLeftWidth: 3,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
      backgroundColor: t.bg,
    },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
    checkbox: { fontSize: 22, marginRight: 12, color: t.text },
    main: { flex: 1, paddingRight: 8 },
    title: { fontSize: 16, color: t.text },
    completed: { textDecorationLine: 'line-through', color: t.textFaint },
    memo: { fontSize: 13, color: t.textMuted, marginTop: 2 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
    metaText: { fontSize: 12, color: t.textMuted },
    metaActive: { color: t.primary, fontWeight: '600' },
    dueChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: t.surfaceAlt },
    dueChipOverdue: { backgroundColor: t.dangerBg },
    dueText: { fontSize: 12, color: t.textMuted, fontWeight: '600' },
    dueTextOverdue: { color: t.danger },
    duePlaceholder: { fontSize: 12, color: t.textFaint },
    subList: { paddingLeft: 46, paddingRight: 14, paddingBottom: 10, gap: 6 },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subCheck: { fontSize: 18, color: t.text },
    subTitle: { flex: 1, fontSize: 14, color: t.text },
    subRemove: { fontSize: 14, color: t.textFaint },
    subInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 14,
      color: t.text,
      backgroundColor: t.surface,
    },
    subAdd: { fontSize: 22, color: t.primary, paddingHorizontal: 4 },
  });
}
