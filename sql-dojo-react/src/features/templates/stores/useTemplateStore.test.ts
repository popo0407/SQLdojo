import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createTemplateStore } from '../useTemplateStore';
import type { TemplateStore } from '../useTemplateStore';

// モック設定
const mockFetch = vi.fn();
global.fetch = mockFetch;

// LocalStorageのモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useTemplateStore', () => {
  let store: ReturnType<typeof createTemplateStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
    store = createTemplateStore();
  });

  describe('初期状態', () => {
    it('適切な初期値を持つ', () => {
      const { result } = renderHook(() => store());
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.userTemplates).toEqual([]);
      expect(result.current.adminTemplates).toEqual([]);
      expect(result.current.dropdownTemplates).toEqual([]);
      expect(result.current.templatePreferences).toEqual([]);
      expect(result.current.isSaveModalOpen).toBe(false);
      expect(result.current.isEditModalOpen).toBe(false);
      expect(result.current.editingTemplate).toBeNull();
    });
  });

  describe('基本アクション', () => {
    it('エラーをクリアできる', () => {
      const { result } = renderHook(() => store());
      
      act(() => {
        result.current.setError('Test error');
      });
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });

    it('ローディング状態を設定できる', () => {
      const { result } = renderHook(() => store());
      
      act(() => {
        result.current.setLoading(true);
      });
      
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.setLoading(false);
      });
      
      expect(result.current.isLoading).toBe(false);
    });

    it('ストアをリセットできる', () => {
      const { result } = renderHook(() => store());
      
      // 状態を変更
      act(() => {
        result.current.setError('Test error');
        result.current.setLoading(true);
        result.current.setSaveModalOpen(true);
      });
      
      // リセット
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSaveModalOpen).toBe(false);
    });
  });

  describe('モーダル状態管理', () => {
    it('保存モーダルの開閉ができる', () => {
      const { result } = renderHook(() => store());
      
      act(() => {
        result.current.setSaveModalOpen(true);
      });
      
      expect(result.current.isSaveModalOpen).toBe(true);
      
      act(() => {
        result.current.setSaveModalOpen(false);
      });
      
      expect(result.current.isSaveModalOpen).toBe(false);
    });

    it('編集モーダルを開くと編集テンプレートが設定される', () => {
      const { result } = renderHook(() => store());
      const mockTemplate = {
        template_id: 'test-1',
        name: 'Test Template',
        sql: 'SELECT 1',
        type: 'user' as const,
        is_common: false,
        display_order: 1,
        is_visible: true,
        created_at: '2024-01-01T00:00:00Z',
      };
      
      act(() => {
        result.current.openEditModal(mockTemplate);
      });
      
      expect(result.current.isEditModalOpen).toBe(true);
      expect(result.current.editingTemplate).toEqual(mockTemplate);
    });

    it('すべてのモーダルを閉じることができる', () => {
      const { result } = renderHook(() => store());
      
      // モーダルを開く
      act(() => {
        result.current.setSaveModalOpen(true);
        result.current.setEditModalOpen(true);
        result.current.setOrderModalOpen(true);
      });
      
      // すべて閉じる
      act(() => {
        result.current.closeAllModals();
      });
      
      expect(result.current.isSaveModalOpen).toBe(false);
      expect(result.current.isEditModalOpen).toBe(false);
      expect(result.current.isOrderModalOpen).toBe(false);
      expect(result.current.editingTemplate).toBeNull();
    });
  });

  describe('データ設定', () => {
    it('ユーザーテンプレートを設定できる', () => {
      const { result } = renderHook(() => store());
      const mockTemplates = [
        {
          template_id: 'user-1',
          name: 'User Template',
          sql: 'SELECT * FROM users',
          type: 'user' as const,
          is_common: false,
          display_order: 1,
          is_visible: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      
      act(() => {
        result.current.setUserTemplates(mockTemplates);
      });
      
      expect(result.current.userTemplates).toEqual(mockTemplates);
    });

    it('管理者テンプレートを設定できる', () => {
      const { result } = renderHook(() => store());
      const mockTemplates = [
        {
          template_id: 'admin-1',
          name: 'Admin Template',
          sql: 'SELECT * FROM logs',
          type: 'admin' as const,
          is_common: true,
          display_order: 1,
          is_visible: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      
      act(() => {
        result.current.setAdminTemplates(mockTemplates);
      });
      
      expect(result.current.adminTemplates).toEqual(mockTemplates);
    });
  });

  describe('非同期アクション', () => {
    it('ユーザーテンプレートの取得が成功する', async () => {
      const mockTemplates = [
        {
          template_id: 'user-1',
          name: 'User Template',
          sql: 'SELECT 1',
          type: 'user',
          is_common: false,
          display_order: 1,
          is_visible: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockTemplates)),
      });

      const { result } = renderHook(() => store());

      await act(async () => {
        await result.current.fetchUserTemplates();
      });

      expect(result.current.userTemplates).toEqual(mockTemplates);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('API呼び出し失敗時にエラーを設定する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      const { result } = renderHook(() => store());

      await act(async () => {
        await result.current.fetchUserTemplates();
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.isLoading).toBe(false);
    });

    it('テンプレート保存が成功する', async () => {
      const mockTemplate = {
        name: 'New Template',
        sql: 'SELECT 1',
        type: 'user' as const,
        is_common: false,
        is_visible: true,
        display_order: 1,
      };

      // 保存API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{}'),
      });

      // 再取得API（ユーザー）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('[]'),
      });

      // 再取得API（管理者）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('[]'),
      });

      const { result } = renderHook(() => store());

      await act(async () => {
        await result.current.saveTemplate(mockTemplate);
      });

      expect(result.current.isSaveModalOpen).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
