export interface FilterModalState {
  selectedValues: string[];
  searchTerm: string;
  uniqueValues: string[];
  isLoading: boolean;
  error: string | null;
  isTruncated: boolean;
}

export interface FilterModalActions {
  setSelectedValues: (values: string[] | ((prev: string[]) => string[])) => void;
  setSearchTerm: (term: string) => void;
  setUniqueValues: (values: string[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsTruncated: (truncated: boolean) => void;
} 