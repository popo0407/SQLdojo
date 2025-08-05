import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateSaveModal } from '../components/TemplateSaveModal';

// Mock Bootstrap components
vi.mock('react-bootstrap', () => ({
  Modal: ({ show, children, ...props }: { 
    show: boolean;
    onHide?: () => void;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => show ? <div data-testid="modal" {...props}>{children}</div> : null,
  Button: ({ children, onClick, disabled, variant, ...props }: React.ComponentProps<'button'> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>{children}</button>
  ),
  Form: ({ children, ...props }: React.ComponentProps<'form'>) => <form {...props}>{children}</form>,
  Alert: ({ children, variant, ...props }: { 
    children: React.ReactNode;
    variant?: string;
    [key: string]: unknown;
  }) => <div data-variant={variant} {...props}>{children}</div>,
  Spinner: ({ ...props }: React.ComponentProps<'div'>) => <div {...props}>Loading...</div>,
}));

describe('TemplateSaveModal', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    currentSql: 'SELECT * FROM users',
    isLoading: false,
  };

  it('renders modal when open', () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('テンプレート保存')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    render(<TemplateSaveModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('shows current SQL in preview', () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    expect(screen.getByText('SELECT * FROM users')).toBeInTheDocument();
  });

  it('enables save button when template name is provided', async () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    // testidを使って安全にinputを特定
    const nameInput = screen.getByTestId('template-name-input') || 
                     document.querySelector('input[placeholder*="テンプレート名"]') as HTMLInputElement;
    
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Test Template' } });
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /保存/i });
        expect(saveButton).not.toBeDisabled();
      });
    } else {
      // フォールバック: placeholder textで検索
      const inputElement = screen.getByPlaceholderText(/テンプレート名/i);
      fireEvent.change(inputElement, { target: { value: 'Test Template' } });
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /保存/i });
        expect(saveButton).not.toBeDisabled();
      });
    }
  });

  it('disables save button when template name is empty', () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  it('calls onSave with correct parameters when save button is clicked', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    
    render(<TemplateSaveModal {...defaultProps} />);
    
    // より安全なinput特定方法
    const nameInput = screen.getByPlaceholderText(/テンプレート名/i);
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Test Template', 'SELECT * FROM users');
    });
  });

  it('shows loading state during save', async () => {
    render(<TemplateSaveModal {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  it('shows error message when save fails', async () => {
    const errorMessage = 'Save failed';
    render(<TemplateSaveModal {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when modal is reopened', async () => {
    const { rerender } = render(<TemplateSaveModal {...defaultProps} isOpen={false} />);
    
    // Modal opens with input
    rerender(<TemplateSaveModal {...defaultProps} isOpen={true} />);
    
    const nameInput = screen.getByPlaceholderText(/テンプレート名/i);
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    
    // Modal closes
    rerender(<TemplateSaveModal {...defaultProps} isOpen={false} />);
    
    // Modal reopens - form should be reset
    rerender(<TemplateSaveModal {...defaultProps} isOpen={true} />);
    
    const resetNameInput = screen.getByPlaceholderText(/テンプレート名/i);
    expect(resetNameInput).toHaveValue('');
  });

  it('closes modal after successful save', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByPlaceholderText(/テンプレート名/i);
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('validates template name length', async () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByPlaceholderText(/テンプレート名/i);
    
    // Test max length validation (assume 100 chars)
    const longName = 'a'.repeat(101);
    fireEvent.change(nameInput, { target: { value: longName } });
    
    // Input should be limited or show error
    await waitFor(() => {
      const inputValue = (nameInput as HTMLInputElement).value;
      expect(inputValue.length).toBeLessThanOrEqual(100);
    });
  });

  it('trims whitespace from template name', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByPlaceholderText(/テンプレート名/i);
    fireEvent.change(nameInput, { target: { value: '  Test Template  ' } });
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Test Template', 'SELECT * FROM users');
    });
  });
});
