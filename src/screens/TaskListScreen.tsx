import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProfileMenu } from '../auth/ProfileMenu';
import { Icon, IconName } from '../components/Icon';
import { ListBar, ListFilter } from '../components/ListBar';
import { TaskItem } from '../components/TaskItem';
import { TaskRepository } from '../data/taskRepository';
import { Priority, RepeatRule, Task } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { NotificationService } from '../services/NotificationService';
import { applyReminder } from '../services/reminderCoordinator';
import { logger } from '../services/logger';
import { radius, shadow, space, tabularNums, Theme, typeScale, weight } from '../theme/theme';
import { useTheme, useThemePreference } from '../theme/ThemeContext';
import { dueDateLabel, nextDueDate } from '../utils/date';
import { nextListId } from '../utils/lists';
import { nextPriority } from '../utils/priority';
import { nextReminder } from '../utils/reminder';
import { nextRepeat } from '../utils/repeat';
import { computeStats } from '../utils/stats';
import { selectAllTasks, selectTodayTasks, todayProgress } from '../utils/todayView';

interface Props {
  repository: TaskRepository;
  notifications: NotificationService;
}

type ViewMode = 'today' | 'all';

export function TaskListScreen({ repository, notifications }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { preference, setPreference } = useThemePreference();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [title, setTitle] = useState('');
  const [addDue, setAddDue] = useState<number | undefined>(undefined);
  const [view, setView] = useState<ViewMode>('today');
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const now = Date.now();
  const [actionError, setActionError] = useState('');

  const reload = useCallback(async () => {
    const [t, l] = await Promise.all([repository.getAll(), repository.getLists()]);
    setTasks(t);
    setLists(l);
  }, [repository]);

  const bootstrap = useCallback(async () => {
    setInitError(false);
    setLoading(true);
    try {
      await repository.init();
      await reload();
    } catch (e) {
      logger.error(e instanceof Error ? e.message : String(e), 'init');
      setInitError(true);
    } finally {
      setLoading(false);
    }
  }, [repository, reload]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (alive) await bootstrap();
    })();
    return () => {
      alive = false;
    };
  }, [bootstrap]);

  // 쓰기 작업 공통 래퍼: 오류 시 안내(데이터 깨짐 없음 — 행은 들어가거나 안 들어가거나).
  // 실패 시 입력 드래프트는 보존된다(setTitle 등은 성공 경로에서만 실행).
  const mutate = useCallback(async (op: () => Promise<void>) => {
    try {
      await op();
      setActionError('');
    } catch (e) {
      logger.error(e instanceof Error ? e.message : String(e), 'mutation');
      setActionError('저장에 실패했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
    }
  }, []);

  const handleAdd = useCallback(
    () =>
      mutate(async () => {
        const trimmed = title.trim();
        if (!trimmed) return;
        const listId = listFilter === 'all' ? undefined : listFilter;
        await repository.add({ title: trimmed, dueDate: addDue, listId });
        setTitle('');
        setAddDue(undefined);
        await reload();
        inputRef.current?.focus();
      }),
    [mutate, title, addDue, listFilter, repository, reload]
  );

  const handleToggle = useCallback((id: string) => mutate(async () => { await repository.toggleComplete(id); await reload(); }), [mutate, repository, reload]);
  const handleDelete = useCallback((id: string) => mutate(async () => { await repository.remove(id); await reload(); }), [mutate, repository, reload]);
  const handleCycleDue = useCallback((id: string, c: number | undefined) => mutate(async () => { await repository.setDueDate(id, nextDueDate(c, now)); await reload(); }), [mutate, repository, reload, now]);
  const handleCycleList = useCallback((id: string, c: string | undefined) => mutate(async () => { await repository.setTaskList(id, nextListId(c, lists)); await reload(); }), [mutate, repository, reload, lists]);
  const handleCycleRepeat = useCallback((id: string, c: RepeatRule | undefined) => mutate(async () => { await repository.setRepeat(id, nextRepeat(c)); await reload(); }), [mutate, repository, reload]);
  const handleCyclePriority = useCallback((id: string, c: Priority | undefined) => mutate(async () => { await repository.setPriority(id, nextPriority(c)); await reload(); }), [mutate, repository, reload]);
  const handleAddSubtask = useCallback((taskId: string, t: string) => mutate(async () => { await repository.addSubtask(taskId, t); await reload(); }), [mutate, repository, reload]);
  const handleToggleSubtask = useCallback((taskId: string, sid: string) => mutate(async () => { await repository.toggleSubtask(taskId, sid); await reload(); }), [mutate, repository, reload]);
  const handleRemoveSubtask = useCallback((taskId: string, sid: string) => mutate(async () => { await repository.removeSubtask(taskId, sid); await reload(); }), [mutate, repository, reload]);

  const handleCycleReminder = useCallback(
    (task: Task) =>
      mutate(async () => {
        const result = await applyReminder({ service: notifications, repository, task, reminderAt: nextReminder(task.reminderAt, Date.now()) });
        if (result.permissionDenied) logger.warn('알림 권한 거부 — 알림 미예약', 'reminder');
        await reload();
      }),
    [mutate, notifications, repository, reload]
  );

  const handleAddList = useCallback((name: string) => mutate(async () => { await repository.addList(name); await reload(); }), [mutate, repository, reload]);
  const handleRenameList = useCallback((id: string, name: string) => mutate(async () => { await repository.renameList(id, name); await reload(); }), [mutate, repository, reload]);
  const handleRemoveList = useCallback((id: string) => mutate(async () => { await repository.removeList(id); if (listFilter === id) setListFilter('all'); await reload(); }), [mutate, repository, reload, listFilter]);

  const cycleTheme = () => setPreference(preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system');
  const themeIcon: IconName = preference === 'system' ? 'monitor' : preference === 'light' ? 'sun' : 'moon';
  const themeLabel = preference === 'system' ? '시스템' : preference === 'light' ? '라이트' : '다크';

  if (initError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>불러오지 못했어요</Text>
        <Text style={styles.errorBody}>저장소를 여는 중 문제가 발생했습니다.</Text>
        <Pressable style={styles.retryBtn} onPress={bootstrap} accessibilityRole="button">
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const byList = listFilter === 'all' ? tasks : tasks.filter((t) => t.listId === listFilter);
  const progress = todayProgress(byList, now);
  const stats = computeStats(byList, now);
  const visible = view === 'today' ? selectTodayTasks(byList, now) : selectAllTasks(byList);
  const todayPct = Math.round(stats.today.rate * 100);

  return (
    <View style={styles.container}>
      {/* 상단: 워드마크 + 프로필/테마 */}
      <View style={styles.topRow}>
        <Text style={styles.wordmark}>my-plan</Text>
        <View style={styles.topActions}>
          <ProfileMenu />
          <Pressable
            onPress={cycleTheme}
            style={styles.themeBtn}
            accessibilityRole="button"
            accessibilityLabel={`테마: ${themeLabel} (눌러서 변경)`}
            hitSlop={6}
          >
            <Icon name={themeIcon} size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* 히어로 글랜스: 오늘 진행이 주인공 */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroNumWrap}>
            <Text style={styles.heroNum}>
              {progress.done}
              <Text style={styles.heroDenom}> / {progress.total}</Text>
            </Text>
            <Text style={styles.heroLabel}>오늘 완료</Text>
          </View>
          <View style={styles.heroPctWrap}>
            <Text style={styles.heroPct}>{todayPct}%</Text>
          </View>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${todayPct}%` }]} />
        </View>
        <Text style={styles.heroWeek}>
          이번 주 <Text style={styles.heroWeekNum}>{stats.weekDone}</Text>개 완료
        </Text>
      </View>

      {/* 오늘/전체 토글 */}
      <View style={styles.toggleRow}>
        <View style={styles.toggle}>
          <ViewToggleButton styles={styles} label="오늘" active={view === 'today'} onPress={() => setView('today')} />
          <ViewToggleButton styles={styles} label="전체" active={view === 'all'} onPress={() => setView('all')} />
        </View>
      </View>

      <ListBar
        lists={lists}
        selected={listFilter}
        onSelect={setListFilter}
        onAddList={handleAddList}
        onRenameList={handleRenameList}
        onRemoveList={handleRemoveList}
      />

      <View style={styles.addBar}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="새 할일을 입력하세요"
          placeholderTextColor={theme.textFaint}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          blurOnSubmit={false}
          autoFocus
        />
        <Pressable
          style={styles.dueToggle}
          onPress={() => setAddDue((cur) => nextDueDate(cur, now))}
          accessibilityRole="button"
          accessibilityLabel="새 할일 마감일"
        >
          <Icon name="calendar" size={14} color={addDue != null ? theme.primary : theme.textMuted} />
          <Text style={[styles.dueToggleText, addDue != null && { color: theme.primary }]}>
            {addDue != null ? dueDateLabel(addDue, now) : '없음'}
          </Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={handleAdd} accessibilityRole="button" accessibilityLabel="할일 추가">
          <Icon name="plus" size={18} color={theme.onPrimary} />
          <Text style={styles.addBtnText}>추가</Text>
        </Pressable>
      </View>

      <View style={styles.inputHint}>
        <Icon name="info" size={13} color={theme.textFaint} />
        <Text style={styles.inputHintText}>비밀번호·주민번호 등 민감정보는 입력하지 마세요.</Text>
      </View>

      {actionError ? (
        <Pressable onPress={() => setActionError('')} style={styles.actionError} accessibilityRole="button" accessibilityLabel="오류 닫기">
          <Text style={styles.actionErrorText}>⚠ {actionError}</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            now={now}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onCycleDue={handleCycleDue}
            listName={lists.find((l) => l.id === item.listId)?.name}
            onCycleList={lists.length > 0 ? handleCycleList : undefined}
            onCycleRepeat={handleCycleRepeat}
            onCycleReminder={handleCycleReminder}
            onCyclePriority={handleCyclePriority}
            onAddSubtask={handleAddSubtask}
            onToggleSubtask={handleToggleSubtask}
            onRemoveSubtask={handleRemoveSubtask}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{view === 'today' ? '오늘 할 일이 없습니다. 추가해 보세요.' : '할일이 없습니다.'}</Text>
        }
      />
    </View>
  );
}

function ViewToggleButton({ styles, label, active, onPress }: { styles: ReturnType<typeof makeStyles>; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggleBtn, active && styles.toggleBtnActive]} accessibilityRole="button">
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, padding: 24 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
    wordmark: { fontSize: typeScale.lg, fontWeight: weight.number, color: t.brandStrong, letterSpacing: 0.3 },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    themeBtn: { padding: space.sm, borderRadius: radius.sm, backgroundColor: t.surfaceAlt },
    heroCard: { marginHorizontal: space.lg, marginBottom: space.md, padding: space.lg, backgroundColor: t.surface, borderRadius: radius.lg, ...shadow.sm },
    heroTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    heroNumWrap: { flex: 1 },
    heroNum: { fontSize: typeScale.hero, fontWeight: weight.number, color: t.text, ...tabularNums },
    heroDenom: { fontSize: typeScale.xxl, fontWeight: weight.number, color: t.textMuted, ...tabularNums },
    heroLabel: { fontSize: typeScale.sm, color: t.textMuted, fontWeight: weight.label, marginTop: -space.xs },
    heroPctWrap: { alignItems: 'flex-end', paddingBottom: space.xs },
    heroPct: { fontSize: typeScale.xxl, fontWeight: weight.number, color: t.primary, ...tabularNums },
    bar: { height: 8, borderRadius: radius.pill, backgroundColor: t.surfaceAlt, marginTop: space.md, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: radius.pill, backgroundColor: t.primary },
    heroWeek: { fontSize: typeScale.sm, color: t.textMuted, marginTop: space.sm },
    heroWeekNum: { fontWeight: weight.number, color: t.text, ...tabularNums },
    toggleRow: { paddingHorizontal: space.lg, paddingBottom: space.md, alignItems: 'flex-start' },
    toggle: { flexDirection: 'row', backgroundColor: t.surfaceAlt, borderRadius: radius.pill, padding: 3 },
    toggleBtn: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill },
    toggleBtnActive: { backgroundColor: t.bg },
    toggleText: { fontSize: typeScale.sm, color: t.textMuted, fontWeight: weight.label },
    toggleTextActive: { color: t.primary, fontWeight: weight.number },
    addBar: { flexDirection: 'row', paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm },
    inputHint: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg, paddingBottom: space.md },
    inputHintText: { fontSize: typeScale.xs, color: t.textFaint },
    input: { flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 16, color: t.text, backgroundColor: t.bg },
    dueToggle: { flexDirection: 'row', alignItems: 'center', gap: space.xs, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: t.surfaceAlt },
    dueToggleText: { fontSize: typeScale.sm, color: t.textMuted, fontWeight: weight.label },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: t.primary, borderRadius: radius.md, paddingHorizontal: space.lg, justifyContent: 'center' },
    addBtnText: { color: t.onPrimary, fontWeight: weight.label, fontSize: typeScale.md },
    empty: { textAlign: 'center', color: t.textFaint, marginTop: 40 },
    actionError: { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: t.dangerBg },
    actionErrorText: { color: t.danger, fontSize: 13, fontWeight: '600' },
    errorTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 8 },
    errorBody: { fontSize: 14, color: t.textMuted, marginBottom: 16, textAlign: 'center' },
    retryBtn: { backgroundColor: t.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    retryText: { color: t.onPrimary, fontWeight: '700' },
  });
}
