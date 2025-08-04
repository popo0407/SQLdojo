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
    
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });
    
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /保存/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('disables save button when template name is empty', () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  it('calls onSave with correct parameters when save button is clicked', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByRole('textbox');
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
    mockOnSave.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when modal is reopened', async () => {
    const { rerender } = render(<TemplateSaveModal {...defaultProps} isOpen={false} />);
    
    // Open modal and enter name
    rerender(<TemplateSaveModal {...defaultProps} isOpen={true} />);
    
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });
    
    // Close modal
    rerender(<TemplateSaveModal {...defaultProps} isOpen={false} />);
    
    // Reopen modal
    rerender(<TemplateSaveModal {...defaultProps} isOpen={true} />);
    
    // Name input should be empty
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('closes modal after successful save', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('validates template name length', async () => {
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByRole('textbox');
    
    // Test with very long name
    const longName = 'a'.repeat(256);
    fireEvent.change(nameInput, { target: { value: longName } });
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/テンプレート名が長すぎます/)).toBeInTheDocument();
    });
  });

  it('trims whitespace from template name', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    
    render(<TemplateSaveModal {...defaultProps} />);
    
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: '  Test Template  ' } });
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Test Template', 'SELECT * FROM users');
    });
  });
});
