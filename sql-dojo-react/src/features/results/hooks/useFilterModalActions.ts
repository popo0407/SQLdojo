import { useUIStore } from '../../../stores/useUIStore';
import { useResultsFilterStore } from '../../../stores/useResultsFilterStore';
import type { FilterModalState } from '../types/filterModal';

export const useFilterModalActions = (
  state: FilterModalState,
  setSelectedValues: (values: string[] | ((prev: string[]) => string[])) => void,
  setSearchTerm: (term: string) => void
) => {
  const { filterModal, setFilterModal } = useUIStore();
  const applyFilter = useResultsFilterStore(state => state.applyFilter);

  // 検索フィルタを適用した値
  const filteredValues = state.uniqueValues.filter(value =>
    value.toLowerCase().includes(state.searchTerm.toLowerCase())
  );

  const handleValueToggle = (value: string) => {
    setSelectedValues((prev: string[]) => 
      prev.includes(value)
        ? prev.filter((v: string) => v !== value)
        : [...prev, value]
    );
  };

  const handleApply = () => {
    applyFilter(filterModal.columnName, state.selectedValues);
    setFilterModal({ ...filterModal, currentFilters: state.selectedValues });
    setFilterModal({ ...filterModal, show: false });
  };

  const handleClear = () => {
    setSelectedValues([]);
  };

  const handleSelectAll = () => {
    setSelectedValues(filteredValues);
  };

  const handleDeselectAll = () => {
    setSelectedValues([]);
  };

  const handleClose = () => {
    setFilterModal({ ...filterModal, show: false });
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  return {
    filteredValues,
    handleValueToggle,
    handleApply,
    handleClear,
    handleSelectAll,
    handleDeselectAll,
    handleClose,
    handleSearchChange,
  };
}; 