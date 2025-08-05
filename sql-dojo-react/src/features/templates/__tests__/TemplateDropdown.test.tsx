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
    expect(screen.getByText('テンプレート選択')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<TemplateDropdown {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /User Template 1/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Admin Template 1/ })).toBeInTheDocument();
    });
  });

  it('displays template list when dropdown is open', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /User Template 1/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Admin Template 1/ })).toBeInTheDocument();
    });
  });

  it('calls onSelect when template is selected', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByRole('button', { name: /User Template 1/ });
      fireEvent.click(templateButton);
    });
    
    expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('shows empty state when no templates are available', async () => {
    render(<TemplateDropdown {...defaultProps} templates={[]} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('テンプレートがありません')).toBeInTheDocument();
      expect(screen.getByText('「テンプレート保存」ボタンで新しいテンプレートを作成できます')).toBeInTheDocument();
    });
  });

  it('displays template preview on hover', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByRole('button', { name: /User Template 1/ });
      fireEvent.mouseEnter(templateButton);
    });
    
    // Should show SQL preview in tooltip
    await waitFor(() => {
      expect(screen.getByText('SELECT * FROM users WHERE id = 1')).toBeInTheDocument();
    });
    
    // Should hide tooltip on mouse leave
    const templateButton = screen.getByRole('button', { name: /User Template 1/ });
    fireEvent.mouseLeave(templateButton);
    
    await waitFor(() => {
      expect(screen.queryByText('SELECT * FROM users WHERE id = 1')).not.toBeInTheDocument();
    });
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
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByRole('button', { name: /Long Template/ });
      fireEvent.mouseEnter(templateButton);
    });
    
    // Should show truncated SQL with ellipsis
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it('separates user and admin templates with icons', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      // テンプレートはただリストアップされ、セクションヘッダーは無い
      expect(screen.getByRole('button', { name: /User Template 1/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Admin Template 1/ })).toBeInTheDocument();
    });
  });

  it('closes dropdown after template selection', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByRole('button', { name: /User Template 1/ });
      fireEvent.click(templateButton);
    });
    
    // ドロップダウンが閉じられていることを確認（DOM上からドロップダウンメニューが削除される）
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /User Template 1/ })).not.toBeInTheDocument();
    });
  });

  it('maintains keyboard accessibility', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      const templateButton = screen.getByRole('button', { name: /User Template 1/ });
      
      // Should be focusable
      templateButton.focus();
      expect(templateButton).toHaveFocus();
    });
    
    // ESCキーでドロップダウンが閉じることをテスト
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /User Template 1/ })).not.toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    render(<TemplateDropdown {...defaultProps} />);
    
    const toggleButton = screen.getByText('テンプレート選択');
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /User Template 1/ })).toBeInTheDocument();
    });
    
    // ドロップダウン外をクリック
    fireEvent.mouseDown(document.body);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /User Template 1/ })).not.toBeInTheDocument();
    });
  });
});

