import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TreeNode from './TreeNode';

// useSidebarStoreをモック
vi.mock('../../stores/useSidebarStore', () => ({
  useSidebarStore: vi.fn((selector) => selector({
    selectedTable: '',
    selectedColumns: [],
    toggleTableSelection: vi.fn(),
    toggleColumnSelection: vi.fn(),
  })),
}));

// useEditorStoreも最低限モック
vi.mock('../../stores/useEditorStore', () => ({
  useEditorStore: vi.fn(() => ({ insertText: vi.fn() })),
}));

describe('TreeNode', () => {
  const schema = {
    name: 'public',
    comment: 'publicスキーマ',
    tables: [
      {
        name: 'users',
        schema_name: 'public',
        table_type: 'TABLE' as const,
        comment: 'ユーザテーブル',
        columns: [
          { name: 'id', data_type: 'int', comment: 'ID' },
          { name: 'name', data_type: 'varchar', comment: '名前' },
        ],
      },
    ],
  };

  it('renders schema node', () => {
    render(<TreeNode item={schema} />);
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText('publicスキーマ')).toBeInTheDocument();
  });

  it('expands tables on click', () => {
    render(<TreeNode item={schema} />);
    const schemaNode = screen.getByText('public');
    const li = schemaNode.closest('li');
    if (li) {
      fireEvent.click(li);
      expect(screen.getByText('users')).toBeInTheDocument();
    }
  });

  it('renders column node', () => {
    const column = { name: 'id', data_type: 'int', comment: 'ID' };
    render(<TreeNode item={column} level={2} parentTableName="users" />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('int')).toBeInTheDocument();
  });
}); 