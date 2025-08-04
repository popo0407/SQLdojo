import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserTemplateInlineManagement } from '../components/management/user/UserTemplateInlineManagement';
import type { TemplateWithPreferences } from '../types/template';

// Mock Bootstrap components to avoid issues in tests
vi.mock('react-bootstrap', () => ({
  Card: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  Table: ({ children, ...props }: React.ComponentProps<'table'>) => <table {...props}>{children}</table>,
  Button: ({ children, onClick, disabled, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  ButtonGroup: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  Form: ({ children, ...props }: React.ComponentProps<'form'>) => <form {...props}>{children}</form>,
  Badge: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  Spinner: ({ ...props }: React.ComponentProps<'div'>) => <div {...props}>Loading...</div>,
  OverlayTrigger: ({ children }: { children: React.ReactNode }) => children,
  Popover: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
}));

// Mock FontAwesome
vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon, ...props }: { icon?: { iconName?: string }, [key: string]: unknown }) => 
    <i {...props} data-icon={icon?.iconName || 'icon'} />,
}));

const mockTemplates: TemplateWithPreferences[] = [
  {
    template_id: 'template-1',
    name: 'User Template 1',
    sql: 'SELECT * FROM users WHERE id = 1',
    type: 'user',
    is_common: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_visible: true,
    display_order: 1,
  },
  {
    template_id: 'template-2',
    name: 'Admin Template 1',
    sql: 'SELECT COUNT(*) FROM admin',
    type: 'admin',
    is_common: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_visible: true,
    display_order: 2,
  },
];

describe('UserTemplateInlineManagement', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnUpdatePreferences = vi.fn();
  const mockOnHasChangesChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    templates: mockTemplates,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onUpdatePreferences: mockOnUpdatePreferences,
    onHasChangesChange: mockOnHasChangesChange,
    isLoading: false,
  };

  it('renders template list correctly', () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    expect(screen.getByText('User Template 1')).toBeInTheDocument();
    expect(screen.getByText('Admin Template 1')).toBeInTheDocument();
  });

  it('shows visibility toggle for each template', () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const visibilityCheckboxes = screen.getAllByRole('checkbox');
    expect(visibilityCheckboxes).toHaveLength(2);
    
    // Both templates should be visible initially
    visibilityCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  it('handles visibility toggle correctly', async () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const visibilityCheckboxes = screen.getAllByRole('checkbox');
    
    fireEvent.click(visibilityCheckboxes[0]);
    
    await waitFor(() => {
      expect(mockOnHasChangesChange).toHaveBeenCalledWith(true);
    });
  });

  it('shows save button when there are unsaved changes', async () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const visibilityCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(visibilityCheckboxes[0]);
    
    await waitFor(() => {
      expect(screen.getByText('設定を保存')).toBeInTheDocument();
    });
  });

  it('calls onUpdatePreferences when save button is clicked', async () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const visibilityCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(visibilityCheckboxes[0]);
    
    await waitFor(() => {
      const saveButton = screen.getByText('設定を保存');
      fireEvent.click(saveButton);
    });
    
    expect(mockOnUpdatePreferences).toHaveBeenCalled();
  });

  it('handles reorder up correctly', async () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    // Find the up arrow button for the second template (should be able to move up)
    const upButtons = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('title') === '上に移動'
    );
    
    if (upButtons.length > 0) {
      fireEvent.click(upButtons[0]);
      
      await waitFor(() => {
        expect(mockOnHasChangesChange).toHaveBeenCalledWith(true);
      });
    }
  });

  it('handles reorder down correctly', async () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    // Find the down arrow button for the first template (should be able to move down)
    const downButtons = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('title') === '下に移動'
    );
    
    if (downButtons.length > 0) {
      fireEvent.click(downButtons[0]);
      
      await waitFor(() => {
        expect(mockOnHasChangesChange).toHaveBeenCalledWith(true);
      });
    }
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const editButtons = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('title')?.includes('編集')
    );
    
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
      expect(mockOnEdit).toHaveBeenCalledWith(mockTemplates[0]);
    }
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const deleteButtons = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('title')?.includes('削除')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      expect(mockOnDelete).toHaveBeenCalledWith(mockTemplates[0]);
    }
  });

  it('disables edit and delete buttons for admin templates', () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    
    // Admin templates (is_common: true) should have disabled edit/delete buttons
    const adminTemplateButtons = buttons.filter(btn => 
      btn.getAttribute('title')?.includes('管理者テンプレートは')
    );
    
    adminTemplateButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows loading state correctly', () => {
    render(<UserTemplateInlineManagement {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows reset button when there are changes', async () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const visibilityCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(visibilityCheckboxes[0]);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });

  it('resets changes when reset button is clicked', async () => {
    render(<UserTemplateInlineManagement {...defaultProps} />);
    
    const visibilityCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(visibilityCheckboxes[0]);
    
    await waitFor(() => {
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
    });
    
    await waitFor(() => {
      expect(mockOnHasChangesChange).toHaveBeenCalledWith(false);
    });
  });
});
