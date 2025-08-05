import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TemplateProvider } from '../stores/TemplateProvider';
import { useTemplates } from '../hooks/useTemplates';
import type { TemplateWithPreferences } from '../types/template';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user', name: 'Test User' },
    isAdmin: false,
  }),
}));

// Test component that uses template context
const TestComponent = () => {
  const { state, saveTemplate, initializeTemplates } = useTemplates();
  
  return (
    <div>
      <div data-testid="loading">{state.isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{state.error || 'No Error'}</div>
      <div data-testid="user-templates-count">{state.userTemplates.length}</div>
      <div data-testid="admin-templates-count">{state.adminTemplates.length}</div>
      <button 
        onClick={() => initializeTemplates()}
        data-testid="initialize-button"
      >
        Initialize
      </button>
      <button 
        onClick={() => saveTemplate('Test Template', 'SELECT * FROM test')}
        data-testid="save-button"
      >
        Save Template
      </button>
    </div>
  );
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <TemplateProvider>{component}</TemplateProvider>
  );
};

describe('TemplateProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides initial state correctly', () => {
    // デフォルトでは空のレスポンスを返すfetchをモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ templates: [] }),
      text: () => Promise.resolve('{"templates":[]}'),
      status: 200,
    } as Response);

    renderWithProvider(<TestComponent />);
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    expect(screen.getByTestId('user-templates-count')).toHaveTextContent('0');
    expect(screen.getByTestId('admin-templates-count')).toHaveTextContent('0');
  });

  it('handles template initialization successfully', async () => {
    const mockTemplatePreferences: TemplateWithPreferences[] = [
      {
        template_id: 'template-1',
        name: 'User Template 1',
        sql: 'SELECT * FROM users',
        type: 'user',
        is_common: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_visible: true,
        display_order: 1,
      },
    ];

    // template-preferences エンドポイントのモック
    mockFetch.mockImplementation((url: RequestInfo) => {
      const urlString = url.toString();
      
      if (urlString.includes('/users/template-preferences')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplatePreferences }),
          text: () => Promise.resolve(JSON.stringify({ templates: mockTemplatePreferences })),
          status: 200,
        } as Response);
      }
      
      // その他のAPIエンドポイントは空配列を返す
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ templates: [] }),
        text: () => Promise.resolve('{"templates":[]}'),
        status: 200,
      } as Response);
    });

    renderWithProvider(<TestComponent />);

    // 初期化ボタンをクリック
    const initButton = screen.getByTestId('initialize-button');
    await act(async () => {
      initButton.click();
    });

    // 初期化が完了するまで待機
    await waitFor(() => {
      const userTemplatesCount = screen.getByTestId('user-templates-count');
      expect(userTemplatesCount).toHaveTextContent('1');
    }, { timeout: 3000 });

    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
  });

  it('handles API errors gracefully', async () => {
    // エラーレスポンスをモック
    mockFetch.mockRejectedValueOnce(new Error('Network Error'));

    renderWithProvider(<TestComponent />);

    const initButton = screen.getByTestId('initialize-button');
    await act(async () => {
      initButton.click();
    });

    // エラーが適切に処理されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('No Error');
    });
  });
});
