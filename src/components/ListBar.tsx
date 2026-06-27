import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { TaskList } from '../models/TaskList';
import { radius, space, Theme, typeScale, weight } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { Icon, IconName } from './Icon';

export type ListFilter = string | 'all';

interface Props {
  lists: TaskList[];
  selected: ListFilter;
  onSelect: (filter: ListFilter) => void;
  onAddList: (name: string) => void;
  onRenameList: (id: string, name: string) => void;
  onRemoveList: (id: string) => void;
}

export function ListBar({ lists, selected, onSelect, onAddList, onRenameList, onRemoveList }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState('');

  const submitNew = () => {
    const name = newName.trim();
    if (!name) return;
    onAddList(name);
    setNewName('');
  };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip styles={styles} label="전체" active={selected === 'all'} onPress={() => onSelect('all')} />
        {lists.map((l) => (
          <Chip key={l.id} styles={styles} label={l.name} active={selected === l.id} onPress={() => onSelect(l.id)} />
        ))}
        <Chip
          styles={styles}
          theme={theme}
          icon={managing ? 'x' : 'settings'}
          label={managing ? '닫기' : '관리'}
          active={false}
          onPress={() => setManaging((m) => !m)}
        />
      </ScrollView>

      {managing ? (
        <View style={styles.panel}>
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="새 목록 이름"
              placeholderTextColor={theme.textFaint}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={submitNew}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable style={styles.addBtn} onPress={submitNew} accessibilityRole="button">
              <Text style={styles.addBtnText}>추가</Text>
            </Pressable>
          </View>

          {lists.map((l) => (
            <ListEditRow
              key={l.id}
              styles={styles}
              faint={theme.textFaint}
              list={l}
              onRename={(name) => onRenameList(l.id, name)}
              onRemove={() => onRemoveList(l.id)}
            />
          ))}
          {lists.length === 0 ? <Text style={styles.hint}>아직 목록이 없습니다.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Chip({
  styles,
  theme,
  label,
  active,
  onPress,
  icon,
}: {
  styles: Styles;
  theme?: Theme;
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const fg = active ? styles.chipTextActive.color : styles.chipText.color;
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button">
      {icon ? <Icon name={icon} size={14} color={(fg as string) ?? theme?.textMuted ?? '#000'} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ListEditRow({
  styles,
  faint,
  list,
  onRename,
  onRemove,
}: {
  styles: Styles;
  faint: string;
  list: TaskList;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(list.name);
  const commit = () => {
    const next = name.trim();
    if (next && next !== list.name) onRename(next);
  };
  return (
    <View style={styles.editRow}>
      <TextInput
        style={styles.input}
        value={name}
        placeholderTextColor={faint}
        onChangeText={setName}
        onSubmitEditing={commit}
        onBlur={commit}
        returnKeyType="done"
      />
      <Pressable style={styles.removeBtn} onPress={onRemove} accessibilityLabel={`${list.name} 삭제`}>
        <Text style={styles.removeBtnText}>삭제</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { paddingBottom: space.sm },
    chips: { paddingHorizontal: space.lg, gap: space.sm, alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      minHeight: 36,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      backgroundColor: t.surfaceAlt,
    },
    chipActive: { backgroundColor: t.primary },
    chipText: { fontSize: typeScale.sm, color: t.textMuted, fontWeight: weight.label },
    chipTextActive: { color: t.onPrimary, fontWeight: weight.label },
    panel: { marginTop: space.md, marginHorizontal: space.lg, padding: space.md, backgroundColor: t.surface, borderRadius: radius.md, gap: space.sm },
    addRow: { flexDirection: 'row', gap: 8 },
    editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 15,
      color: t.text,
      backgroundColor: t.bg,
    },
    addBtn: { backgroundColor: t.primary, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
    addBtnText: { color: t.onPrimary, fontWeight: '600' },
    removeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: t.dangerBg },
    removeBtnText: { color: t.danger, fontWeight: '600' },
    hint: { color: t.textFaint, fontSize: 13 },
  });
}
