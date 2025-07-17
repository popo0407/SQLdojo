import { Filter } from '../types/api';

export const applyFilters = (data: any[], filters: Filter[]): any[] => {
  if (filters.length === 0) {
    return data;
  }

  return data.filter(row => {
    return filters.every(filter => {
      const { column, operator, value } = filter;
      const rowValue = row[column];

      switch (operator) {
        case '=':
          return String(rowValue) === String(value);
        case '!=':
          return String(rowValue) !== String(value);
        case '>':
          return Number(rowValue) > Number(value);
        case '<':
          return Number(rowValue) < Number(value);
        case '>=':
          return Number(rowValue) >= Number(value);
        case '<=':
          return Number(rowValue) <= Number(value);
        case 'contains':
          return String(rowValue).includes(String(value));
        default:
          return true;
      }
    });
  });
};