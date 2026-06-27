import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Priority, RepeatRule, Task } from '../models/Task';
import { radius, space, Theme, typeScale, weight } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { dueDateLabel, isOverdue } from '../utils/date';
import { priorityColor, priorityLabel } from '../utils/priority';
import { reminderLabel } from '../utils/reminder';
import { repeatLabel } from '../utils/repeat';
import { Icon, IconName } from './Icon';

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

type Styles = ReturnType<typeof makeStyles>;

/** 메타 칩: 상태를 색만이 아니라 "형태(채움 vs 외곽선)"로 구분 + 아이콘 + 라벨. */
function MetaChip({
  icon,
  label,
  active,
  activeColor,
  onPress,
  a11yLabel,
  styles,
  theme,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  activeColor?: string;
  onPress: () => void;
  a11yLabel: string;
  styles: Styles;
  theme: Theme;
}) {
  const color = active ? activeColor ?? theme.primary : theme.textFaint;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Icon name={icon} size={13} color={color} />
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
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
          style={styles.checkTap}
        >
          <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
            {task.completed ? <Icon name="check" size={15} color={theme.onPrimary} /> : null}
          </View>
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
              <MetaChip
                icon="flag"
                label={task.priority ? priorityLabel(task.priority) : '우선순위'}
                active={!!task.priority}
                activeColor={accent}
                onPress={() => onCyclePriority(task.id, task.priority)}
                a11yLabel="우선순위 변경"
                styles={styles}
                theme={theme}
              />
            ) : null}
            {onCycleList ? (
              <MetaChip
                icon="folder"
                label={listName ?? '목록'}
                active={!!listName}
                onPress={() => onCycleList(task.id, task.listId)}
                a11yLabel="목록 변경"
                styles={styles}
                theme={theme}
              />
            ) : null}
            {onCycleRepeat ? (
              <MetaChip
                icon="repeat"
                label={task.repeat ? repeatLabel(task.repeat) : '반복'}
                active={!!task.repeat}
                onPress={() => onCycleRepeat(task.id, task.repeat)}
                a11yLabel="반복 변경"
                styles={styles}
                theme={theme}
              />
            ) : null}
            {onCycleReminder ? (
              <MetaChip
                icon="bell"
                label={task.reminderAt != null ? reminderLabel(task.reminderAt, now) : '알림'}
                active={task.reminderAt != null}
                onPress={() => onCycleReminder(task)}
                a11yLabel="알림 변경"
                styles={styles}
                theme={theme}
              />
            ) : null}
            {onAddSubtask ? (
              <MetaChip
                icon="check-square"
                label={subs.length > 0 ? `${subDone}/${subs.length}` : '하위'}
                active={subs.length > 0}
                onPress={() => setExpanded((e) => !e)}
                a11yLabel="하위 할일"
                styles={styles}
                theme={theme}
              />
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => onCycleDue(task.id, task.dueDate)}
          accessibilityRole="button"
          accessibilityLabel="마감일 변경"
          style={[styles.dueChip, overdue && styles.dueChipOverdue]}
        >
          {task.dueDate != null ? (
            <>
              {overdue ? <Icon name="alert-triangle" size={12} color={theme.danger} /> : null}
              <Text style={[styles.dueText, overdue && styles.dueTextOverdue]}>
                {dueDateLabel(task.dueDate, now)}
                {overdue ? ' 지남' : ''}
              </Text>
            </>
          ) : (
            <>
              <Icon name="calendar" size={12} color={theme.textFaint} />
              <Text style={styles.duePlaceholder}>날짜</Text>
            </>
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
                accessibilityLabel={s.title}
                style={styles.subCheckTap}
              >
                <View style={[styles.subCheckbox, s.completed && styles.checkboxDone]}>
                  {s.completed ? <Icon name="check" size={12} color={theme.onPrimary} /> : null}
                </View>
              </Pressable>
              <Text style={[styles.subTitle, s.completed && styles.completed]} numberOfLines={1}>
                {s.title}
              </Text>
              <Pressable
                onPress={() => onRemoveSubtask?.(task.id, s.id)}
                accessibilityRole="button"
                accessibilityLabel="하위 할일 삭제"
                style={styles.subRemoveTap}
              >
                <Icon name="x" size={16} color={theme.textFaint} />
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
            <Pressable
              onPress={submitSub}
              accessibilityRole="button"
              accessibilityLabel="하위 할일 추가 확인"
              style={styles.subAddTap}
            >
              <Icon name="plus" size={20} color={theme.primary} />
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
    },
    // 원형 체크박스 + 44px 탭 타깃
    checkTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -space.sm },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: t.primary, borderColor: t.primary },
    main: { flex: 1, paddingRight: space.sm },
    title: { fontSize: typeScale.md, color: t.text, fontWeight: weight.body },
    completed: { textDecorationLine: 'line-through', color: t.textFaint },
    memo: { fontSize: typeScale.sm, color: t.textMuted, marginTop: 2 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
    // 메타 칩(형태로 상태 구분)
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      minHeight: 36,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    chipIdle: { borderColor: t.brandBorder, backgroundColor: 'transparent' },
    chipActive: { borderColor: t.brandTint, backgroundColor: t.brandTint },
    chipText: { fontSize: typeScale.sm, fontWeight: weight.label },
    // 마감 칩
    dueChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      minHeight: 36,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      backgroundColor: t.surfaceAlt,
    },
    dueChipOverdue: { backgroundColor: t.dangerBg },
    dueText: { fontSize: typeScale.xs, color: t.textMuted, fontWeight: weight.label },
    dueTextOverdue: { color: t.danger },
    duePlaceholder: { fontSize: typeScale.xs, color: t.textFaint },
    // 하위 할일
    subList: { paddingLeft: 44, paddingRight: space.md, paddingBottom: space.sm, gap: space.sm },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    subCheckTap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -space.sm },
    subCheckbox: {
      width: 20,
      height: 20,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subTitle: { flex: 1, fontSize: typeScale.sm, color: t.text },
    subRemoveTap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    subInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      fontSize: typeScale.sm,
      color: t.text,
      backgroundColor: t.surface,
    },
    subAddTap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  });
}
