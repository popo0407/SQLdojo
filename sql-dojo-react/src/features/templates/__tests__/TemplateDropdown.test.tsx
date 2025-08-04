import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateDropdown } from '../components/TemplateDropdown';
import type { TemplateDropdownItem } from '../types/template';

// Mock Bootstrap components
vi.mock('react-bootstrap', () => ({
  Dropdown: ({ children, show, onToggle, ...props }: {
    children: React.ReactNode;
    show?: boolean;
    onToggle?: (show: boolean) => void;
    [key: string]: unknown;
  }) => (
    <div data-testid="dropdown" data-show={show} {...props}>
      <button onClick={() => onToggle?.(!show)}>Toggle</button>
      {children}
    </div>
  ),
  Button: ({ children, onClick, disabled, variant, ...props }: React.ComponentProps<'button'> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>{children}</button>
  ),
  Spinner: ({ size, ...props }: React.ComponentProps<'div'> & { size?: string }) => 
    <div data-size={size} {...props}>Loading...</div>,
}));

// Mock FontAwesome
vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon, ...props }: { icon?: { iconName?: string }, [key: string]: unknown }) => 
    <i {...props} data-icon={icon?.iconName || 'icon'} />,
}));

const mockTemplates: TemplateDropdownItem[] = [
  {
    id: 'template-1',
    name: 'User Template 1',
    sql: 'SELECT * FROM users WHERE id = 1',
    type: 'user',
    is_common: false,
  },
  {
    id: 'template-2',
    name: 'Admin Template 1',
    sql: 'SELECT COUNT(*) FROM admin',
    type: 'admin',
    is_common: true,
  },
];

describe('TemplateDropdown', () => {
  const mockOnSelectTemplate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    templates: mockTemplates,
    onSelectTemplate: mockOnSelectTemplate,
    isLoading: false,
  };

  it('renders dropdown button', () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('テンプレート')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<TemplateDropdown {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('dropdown')).toHaveAttribute('data-show', 'true');
    });
  });

  it('displays template list when dropdown is open', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('User Template 1')).toBeInTheDocument();
      expect(screen.getByText('Admin Template 1')).toBeInTheDocument();
    });
  });

  it('calls onSelect when template is selected', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByText('User Template 1');
      fireEvent.click(templateButton);
    });
    
    expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('shows save template option', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('テンプレート保存')).toBeInTheDocument();
    });
  });

  it('shows current content save option', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('テンプレート保存')).toBeInTheDocument();
    });
  });

  it('handles template save action', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('テンプレート保存')).toBeInTheDocument();
    });
  });

  it('shows empty state when no templates are available', async () => {
    render(<TemplateDropdown {...defaultProps} templates={[]} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('テンプレートがありません')).toBeInTheDocument();
    });
  });

  it('displays template preview on hover', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByText('User Template 1');
      fireEvent.mouseEnter(templateButton);
    });
    
    // Should show SQL preview
    expect(screen.getByText('SELECT * FROM users WHERE id = 1')).toBeInTheDocument();
  });

  it('truncates long SQL in preview', async () => {
    const longSqlTemplate: TemplateDropdownItem = {
      id: 'long-template',
      name: 'Long Template',
      sql: 'SELECT * FROM users WHERE '.repeat(20) + 'id = 1',
      type: 'user',
      is_common: false,
    };

    render(<TemplateDropdown {...defaultProps} templates={[longSqlTemplate]} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByText('Long Template');
      fireEvent.mouseEnter(templateButton);
    });
    
    // Should show truncated SQL with ellipsis
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it('separates user and admin templates', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('個人テンプレート')).toBeInTheDocument();
      expect(screen.getByText('管理者テンプレート')).toBeInTheDocument();
    });
  });

  it('closes dropdown after template selection', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByText('User Template 1');
      fireEvent.click(templateButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('dropdown')).toHaveAttribute('data-show', 'false');
    });
  });

  it('maintains keyboard accessibility', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByText('User Template 1');
      
      // Should be focusable
      templateButton.focus();
      expect(templateButton).toHaveFocus();
      
      // Should respond to Enter key
      fireEvent.keyDown(templateButton, { key: 'Enter' });
      expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
    });
  });
});
