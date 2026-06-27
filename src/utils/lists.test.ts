import { TaskList } from '../models/TaskList';
import { listNameOf, nextListId } from './lists';

function list(id: string, name: string, sortOrder: number): TaskList {
  return { id, name, createdAt: 0, sortOrder, updatedAt: 0, dirty: false };
}

const LISTS = [list('a', '업무', 0), list('b', '개인', 1)];

describe('nextListId (순환)', () => {
  it('미지정 → a → b → 미지정', () => {
    expect(nextListId(undefined, LISTS)).toBe('a');
    expect(nextListId('a', LISTS)).toBe('b');
    expect(nextListId('b', LISTS)).toBeUndefined();
  });

  it('목록이 없으면 항상 미지정', () => {
    expect(nextListId('a', [])).toBeUndefined();
    expect(nextListId(undefined, [])).toBeUndefined();
  });

  it('삭제된(목록에 없는) id는 미지정으로 간주 후 다음으로', () => {
    expect(nextListId('zzz', LISTS)).toBe('a');
  });
});

describe('listNameOf', () => {
  it('id로 이름을 찾는다', () => {
    expect(listNameOf('a', LISTS)).toBe('업무');
    expect(listNameOf(undefined, LISTS)).toBeUndefined();
    expect(listNameOf('zzz', LISTS)).toBeUndefined();
  });
});
