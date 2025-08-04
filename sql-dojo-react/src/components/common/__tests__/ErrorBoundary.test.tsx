import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { ErrorBoundary, TemplateErrorBoundary, ComponentErrorBoundary } from '../ErrorBoundary';

// Mock console methods to avoid noise in tests
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

Object.assign(console, mockConsole);

// Mock Bootstrap components
vi.mock('react-bootstrap', () => ({
  Container: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  Card: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  Alert: ({ children, variant, ...props }: { 
    children: React.ReactNode;
    variant?: string;
    [key: string]: unknown;
  }) => <div data-variant={variant} {...props}>{children}</div>,
  Button: ({ children, onClick, disabled, variant, size, ...props }: React.ComponentProps<'button'> & { 
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

// Mock FontAwesome
vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon, ...props }: { icon?: { iconName?: string }, [key: string]: unknown }) => 
    <i {...props} data-icon={icon?.iconName || 'icon'} />,
}));

// Test component that throws an error
const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Working component for testing
const WorkingComponent: React.FC = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
    });
  });

  describe('General ErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('catches errors and displays error UI', () => {
      render(
        <ErrorBoundary level="component" name="Test Component">
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Test Componentでエラーが発生しました/)).toBeInTheDocument();
      expect(screen.getByText(/申し訳ございません/)).toBeInTheDocument();
    });

    it('displays custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const mockOnError = vi.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
        expect.any(String)
      );
    });

    it('allows retry functionality', () => {
      const RetryTestComponent: React.FC = () => {
        const [shouldThrow, setShouldThrow] = useState(true);
        
        return (
          <ErrorBoundary>
            <ThrowErrorComponent shouldThrow={shouldThrow} />
            <button onClick={() => setShouldThrow(false)}>Fix Component</button>
          </ErrorBoundary>
        );
      };

      render(<RetryTestComponent />);

      // Error should be displayed
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();

      // Click retry button
      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      // Component should still show error (since we haven't fixed the underlying issue)
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });

    it('shows page reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('ページ再読み込み');
      fireEvent.click(reloadButton);

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('displays different UI for different error levels', () => {
      const { rerender } = render(
        <ErrorBoundary level="page">
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/ページエラーが発生しました/)).toBeInTheDocument();

      rerender(
        <ErrorBoundary level="feature" name="テスト機能">
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/テスト機能でエラーが発生しました/)).toBeInTheDocument();
    });
  });

  describe('TemplateErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <TemplateErrorBoundary>
          <WorkingComponent />
        </TemplateErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('catches template-specific errors', () => {
      render(
        <TemplateErrorBoundary>
          <ThrowErrorComponent />
        </TemplateErrorBoundary>
      );

      expect(screen.getByText(/テンプレート管理でエラーが発生しました/)).toBeInTheDocument();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Template module error detected:',
        expect.objectContaining({
          error: expect.any(Error),
          errorInfo: expect.any(Object),
          errorId: expect.any(String),
        })
      );
    });
  });

  describe('ComponentErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <ComponentErrorBoundary name="Test Component">
          <WorkingComponent />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('displays lightweight error UI for component errors', () => {
      render(
        <ComponentErrorBoundary name="Test Component">
          <ThrowErrorComponent />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText(/Test Componentの読み込み中にエラーが発生しました/)).toBeInTheDocument();
      expect(screen.getByText('再読み込み')).toBeInTheDocument();
    });

    it('uses custom fallback when provided', () => {
      const customFallback = <div>Component failed to load</div>;

      render(
        <ComponentErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('Component failed to load')).toBeInTheDocument();
    });

    it('handles reload button click', () => {
      render(
        <ComponentErrorBoundary name="Test Component">
          <ThrowErrorComponent />
        </ComponentErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /再読み込み/ });
      fireEvent.click(reloadButton);

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Error logging', () => {
    it('logs errors to console in development', () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary name="Test">
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(mockConsole.group).toHaveBeenCalledWith(
        expect.stringContaining('Error Boundary Caught')
      );
      expect(mockConsole.error).toHaveBeenCalledWith('Error ID:', expect.any(String));
      expect(mockConsole.error).toHaveBeenCalledWith('Error:', expect.any(Error));
      expect(mockConsole.groupEnd).toHaveBeenCalled();

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('prepares error data for logging service in production', () => {
      // Set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary level="feature" name="Test Feature">
          <ThrowErrorComponent />
        </ErrorBoundary>
      );

      expect(mockConsole.info).toHaveBeenCalledWith(
        'Error data for logging service:',
        expect.objectContaining({
          errorId: expect.any(String),
          message: 'Test error message',
          timestamp: expect.any(String),
          level: 'feature',
          componentName: 'Test Feature',
        })
      );

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
});
