import { render, screen, fireEvent } from '@testing-library/react';
import ResultTable from './ResultTable';

describe('ResultTable', () => {
  const columns = ['id', 'name', 'age'];
  const data = [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 25 },
  ];
  const sortConfig = { key: 'name', direction: 'asc' as const };
  const onSort = jest.fn();
  const onFilter = jest.fn();
  const filters = { name: ['Alice'] };

  it('renders table headers and data', () => {
    render(
      <ResultTable
        columns={columns}
        data={data}
        sortConfig={null}
        onSort={onSort}
        onFilter={onFilter}
        filters={{}}
      />
    );
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onSort when header is clicked', () => {
    render(
      <ResultTable
        columns={columns}
        data={data}
        sortConfig={null}
        onSort={onSort}
        onFilter={onFilter}
        filters={{}}
      />
    );
    const headerDiv = screen.getAllByRole('columnheader')[0].querySelector('div');
    if (headerDiv) {
      fireEvent.click(headerDiv);
      expect(onSort).toHaveBeenCalledWith('id');
    }
  });

  it('shows filter icon as active when filter is set', () => {
    render(
      <ResultTable
        columns={columns}
        data={data}
        sortConfig={sortConfig}
        onSort={onSort}
        onFilter={onFilter}
        filters={filters}
      />
    );
    const filterIcons = screen.getAllByTitle(/でフィルタ/);
    expect(filterIcons[1].className).toMatch(/active/);
  });
}); 