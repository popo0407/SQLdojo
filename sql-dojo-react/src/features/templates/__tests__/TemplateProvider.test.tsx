import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TemplateProvider } from '../stores/TemplateProvider';
import { useTemplates } from '../hooks/useTemplates';
import type { Template, TemplateWithPreferences } from '../types/template';

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
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    expect(screen.getByTestId('user-templates-count')).toHaveTextContent('0');
    expect(screen.getByTestId('admin-templates-count')).toHaveTextContent('0');
  });

  it('handles template initialization successfully', async () => {
    const mockUserTemplates: TemplateWithPreferences[] = [
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

    const mockAdminTemplates: Template[] = [
      {
        id: '2',
        name: 'Admin Template 1',
        sql: 'SELECT COUNT(*) FROM admin',
        type: 'admin',
        is_common: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserTemplates),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAdminTemplates),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ templates: mockUserTemplates }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ templates: mockUserTemplates }),
      });

    renderWithProvider(<TestComponent />);
    
    await act(async () => {
      screen.getByTestId('initialize-button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-templates-count')).toHaveTextContent('1');
      expect(screen.getByTestId('admin-templates-count')).toHaveTextContent('1');
    });
  });

  it('handles template save successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'new-template-id' }),
    });

    renderWithProvider(<TestComponent />);
    
    await act(async () => {
      screen.getByTestId('save-button').click();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/templates',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          }),
          body: JSON.stringify({
            name: 'Test Template',
            sql: 'SELECT * FROM test',
          }),
        })
      );
    });
  });

  it('handles API errors correctly', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network Error'));

    renderWithProvider(<TestComponent />);
    
    await act(async () => {
      screen.getByTestId('save-button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network Error');
    });
  });

  it('handles authentication errors correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });

    renderWithProvider(<TestComponent />);
    
    await act(async () => {
      screen.getByTestId('save-button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Unauthorized');
    });
  });

  it('provides loading states correctly', async () => {
    // Mock a slow API response
    let resolvePromise: (value: unknown) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(slowPromise);

    renderWithProvider(<TestComponent />);
    
    act(() => {
      screen.getByTestId('save-button').click();
    });

    // Check loading state is active
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });

    // Resolve the promise
    act(() => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ id: 'new-template' }),
      } as Response);
    });

    // Check loading state is cleared
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
  });
});
