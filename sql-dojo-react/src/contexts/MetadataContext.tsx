import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Schema } from '../types/api';
import { getAllMetadata } from '../api/metadataService';

// State interface
interface MetadataState {
  data: Schema[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Action types
type MetadataAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Schema[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; payload: Schema[] }
  | { type: 'REFRESH_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: MetadataState = {
  data: [],
  loading: false,
  refreshing: false,
  error: null,
  lastUpdated: null,
};

// Reducer
const metadataReducer = (state: MetadataState, action: MetadataAction): MetadataState => {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        data: action.payload,
        lastUpdated: new Date(),
        error: null,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'REFRESH_START':
      return {
        ...state,
        refreshing: true,
        error: null,
      };
    case 'REFRESH_SUCCESS':
      return {
        ...state,
        refreshing: false,
        data: action.payload,
        lastUpdated: new Date(),
        error: null,
      };
    case 'REFRESH_ERROR':
      return {
        ...state,
        refreshing: false,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Context interface
interface MetadataContextType {
  state: MetadataState;
  dispatch: React.Dispatch<MetadataAction>;
}

// Create context
const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

// Provider component
interface MetadataProviderProps {
  children: ReactNode;
}

export const MetadataProvider: React.FC<MetadataProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(metadataReducer, initialState);

  // 初期化時にメタデータを取得
  useEffect(() => {
    const initializeMetadata = async () => {
      try {
        dispatch({ type: 'FETCH_START' });
        const data = await getAllMetadata();
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'メタデータの取得に失敗しました';
        dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
        console.warn('初期メタデータ取得失敗:', error);
      }
    };

    initializeMetadata();
  }, []);

  return (
    <MetadataContext.Provider value={{ state, dispatch }}>
      {children}
    </MetadataContext.Provider>
  );
};

// Custom hook
export const useMetadataContext = (): MetadataContextType => {
  const context = useContext(MetadataContext);
  if (context === undefined) {
    throw new Error('useMetadataContext must be used within a MetadataProvider');
  }
  return context;
};
