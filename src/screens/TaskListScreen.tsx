import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProfileMenu } from '../auth/ProfileMenu';
import { ListBar, ListFilter } from '../components/ListBar';
import { SyncBar } from '../components/SyncBar';
import { TaskItem } from '../components/TaskItem';
import { TaskRepository } from '../data/taskRepository';
import { SyncStore } from '../sync/SyncStore';
import { Priority, RepeatRule, Task } from '../models/Task';
import { TaskList } from '../models/TaskList';
import { NotificationService } from '../services/NotificationService';
import { applyReminder } from '../services/reminderCoordinator';
import { logger } from '../services/logger';
import { Theme } from '../theme/theme';
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
  /** 로컬 모드에서만 전달 — 있으면 레거시 동기화 바(Netlify) 표시. 클라우드(Supabase) 모드에선 생략 */
  syncStore?: SyncStore;
}

type ViewMode = 'today' | 'all';

export function TaskListScreen({ repository, notifications, syncStore }: Props) {
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
  const themeBtn = preference === 'system' ? '🌗 시스템' : preference === 'light' ? '☀️ 라이트' : '🌙 다크';

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
      <View style={styles.header}>
        <View style={styles.flex1}>
          <Text style={styles.headerTitle}>할일</Text>
          <Text style={styles.count}>오늘 {progress.total}개 중 {progress.done}개 완료</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.headerTopRow}>
            <ProfileMenu />
            <Pressable onPress={cycleTheme} style={styles.themeBtn} accessibilityLabel={`테마: ${themeBtn}`}>
              <Text style={styles.themeBtnText}>{themeBtn}</Text>
            </Pressable>
          </View>
          <View style={styles.toggle}>
            <ViewToggleButton styles={styles} label="오늘" active={view === 'today'} onPress={() => setView('today')} />
            <ViewToggleButton styles={styles} label="전체" active={view === 'all'} onPress={() => setView('all')} />
          </View>
        </View>
      </View>

      {/* 진행 통계 카드 */}
      <View style={styles.statsCard}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{todayPct}%</Text>
          <Text style={styles.statLabel}>오늘 완료율</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${todayPct}%` }]} />
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats.weekDone}</Text>
          <Text style={styles.statLabel}>이번 주 완료</Text>
        </View>
      </View>

      {/* 레거시 동기화 바(로컬 모드 전용). Supabase 클라우드 모드에선 저장소 자체가 클라우드라 생략 */}
      {syncStore ? <SyncBar store={syncStore} onSynced={reload} /> : null}

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
        <Pressable style={styles.dueToggle} onPress={() => setAddDue((cur) => nextDueDate(cur, now))} accessibilityLabel="새 할일 마감일">
          <Text style={styles.dueToggleText}>📅 {addDue != null ? dueDateLabel(addDue, now) : '없음'}</Text>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={handleAdd} accessibilityRole="button">
          <Text style={styles.addBtnText}>추가</Text>
        </Pressable>
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
    header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    headerTitle: { fontSize: 28, fontWeight: '700', color: t.text },
    count: { fontSize: 14, color: t.textMuted, marginTop: 4 },
    headerRight: { alignItems: 'flex-end', gap: 6 },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    themeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: t.surfaceAlt },
    themeBtnText: { fontSize: 12, color: t.textMuted, fontWeight: '600' },
    toggle: { flexDirection: 'row', backgroundColor: t.surfaceAlt, borderRadius: 10, padding: 2 },
    toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    toggleBtnActive: { backgroundColor: t.bg },
    toggleText: { fontSize: 14, color: t.textMuted },
    toggleTextActive: { color: t.text, fontWeight: '700' },
    statsCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: t.surface, borderRadius: 12 },
    statCell: { flex: 1 },
    statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: t.border, marginHorizontal: 12 },
    statValue: { fontSize: 24, fontWeight: '800', color: t.text },
    statLabel: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    bar: { height: 6, borderRadius: 3, backgroundColor: t.surfaceAlt, marginTop: 8, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: t.primary },
    addBar: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    input: { flex: 1, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: t.text, backgroundColor: t.bg },
    dueToggle: { justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: t.surfaceAlt },
    dueToggleText: { fontSize: 13, color: t.textMuted, fontWeight: '600' },
    addBtn: { backgroundColor: t.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
    addBtnText: { color: t.onPrimary, fontWeight: '600', fontSize: 16 },
    empty: { textAlign: 'center', color: t.textFaint, marginTop: 40 },
    actionError: { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: t.dangerBg },
    actionErrorText: { color: t.danger, fontSize: 13, fontWeight: '600' },
    errorTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 8 },
    errorBody: { fontSize: 14, color: t.textMuted, marginBottom: 16, textAlign: 'center' },
    retryBtn: { backgroundColor: t.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    retryText: { color: t.onPrimary, fontWeight: '700' },
  });
}
