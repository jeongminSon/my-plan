import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearLocalCacheOnLogout } from './localCleanup';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), removeItem: jest.fn() },
}));

const mockAS = AsyncStorage as unknown as { getItem: jest.Mock; removeItem: jest.Mock };

describe('clearLocalCacheOnLogout (유실 방지 가드)', () => {
  let removed: string[];
  let originalLS: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    removed = [];
    originalLS = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = {
      removeItem: (k: string) => removed.push(k),
    };
  });

  afterEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = originalLS;
  });

  it('userId 없으면 no-op (조회/삭제 안 함)', async () => {
    await clearLocalCacheOnLogout(undefined);
    expect(mockAS.getItem).not.toHaveBeenCalled();
    expect(removed).toEqual([]);
  });

  it('migrated 플래그 없으면 아무것도 안 지움 (미이전 데이터 보존)', async () => {
    mockAS.getItem.mockResolvedValue(null);
    await clearLocalCacheOnLogout('u1');
    expect(removed).toEqual([]);
    expect(mockAS.removeItem).not.toHaveBeenCalled();
  });

  it("migrated '1'이면 tasks/lists + 백업 제거", async () => {
    mockAS.getItem.mockResolvedValue('1');
    mockAS.removeItem.mockResolvedValue(undefined);
    await clearLocalCacheOnLogout('u1');
    expect(removed).toEqual(['my-plan.tasks', 'my-plan.lists']);
    expect(mockAS.removeItem).toHaveBeenCalledWith('my-plan.migrate.backup.u1');
  });

  it('AsyncStorage 오류 시 안전하게 보존(지우지 않음)', async () => {
    mockAS.getItem.mockRejectedValue(new Error('storage error'));
    await clearLocalCacheOnLogout('u1');
    expect(removed).toEqual([]);
    expect(mockAS.removeItem).not.toHaveBeenCalled();
  });
});
