import { create } from 'zustand';
import { useEditorStore } from './useEditorStore';

interface SidebarState {
  // 選択状態
  selectedTable: string | null;
  selectedColumns: string[];
  columnSelectionOrder: string[];
  
  // セッター
  setSelectedTable: (tableName: string | null) => void;
  setSelectedColumns: (columns: string[]) => void;
  setColumnSelectionOrder: (order: string[]) => void;
  
  // アクション
  toggleTableSelection: (tableName: string) => void;
  toggleColumnSelection: (tableName: string, columnName: string) => void;
  clearSelection: () => void;
  applySelectionToEditor: () => void;
  
  // 便利なアクション
  isTableSelected: (tableName: string) => boolean;
  isColumnSelected: (columnName: string) => boolean;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  // 初期状態
  selectedTable: null,
  selectedColumns: [],
  columnSelectionOrder: [],
  
  // セッター
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setSelectedColumns: (selectedColumns) => set({ selectedColumns }),
  setColumnSelectionOrder: (columnSelectionOrder) => set({ columnSelectionOrder }),
  
  // テーブル選択の切り替え
  toggleTableSelection: (tableName) => {
    set((state) => {
      if (state.selectedTable === tableName) {
        return {
          selectedTable: null,
          selectedColumns: [],
          columnSelectionOrder: [],
        };
      }
      return {
        selectedTable: tableName,
        selectedColumns: [],
        columnSelectionOrder: [],
      };
    });
  },
  
  // カラム選択の切り替え
  toggleColumnSelection: (tableName, columnName) => {
    set((state) => {
      const selectedColumns = [...state.selectedColumns];
      const columnSelectionOrder = [...state.columnSelectionOrder];
      const columnIndex = selectedColumns.indexOf(columnName);

      if (columnIndex > -1) {
        // カラムの選択を解除
        selectedColumns.splice(columnIndex, 1);
        const orderIndex = columnSelectionOrder.indexOf(columnName);
        if (orderIndex > -1) {
          columnSelectionOrder.splice(orderIndex, 1);
        }
        
        return { selectedColumns, columnSelectionOrder };
      } else {
        // カラムを選択
        selectedColumns.push(columnName);
        columnSelectionOrder.push(columnName);
        
        return { selectedColumns, columnSelectionOrder };
      }
    });
  },
  
  // 選択のクリア
  clearSelection: () => {
    set({
      selectedTable: null,
      selectedColumns: [],
      columnSelectionOrder: [],
    });
  },
  
  // エディタへの反映
  applySelectionToEditor: () => {
    const { selectedTable, selectedColumns, columnSelectionOrder } = get();
    const editorStore = useEditorStore.getState();
    
    let newSql = '';

    if (selectedTable && selectedColumns.length > 0) {
      // テーブルとカラムが両方選択されている場合
      const orderedColumns = columnSelectionOrder.join(', ');
      newSql = `SELECT ${orderedColumns} FROM ${selectedTable}`;
    } else if (selectedTable) {
      // テーブルのみ選択されている場合
      newSql = `SELECT * FROM ${selectedTable}`;
    } else if (columnSelectionOrder.length > 0) {
      // カラムのみ選択されている場合
      newSql = columnSelectionOrder.join(', ');
    }

    if (newSql) {
      editorStore.setSqlToInsert(newSql);
    }
  },
  
  // 便利なアクション
  isTableSelected: (tableName) => {
    const { selectedTable } = get();
    return selectedTable === tableName;
  },
  
  isColumnSelected: (columnName) => {
    const { selectedColumns } = get();
    return selectedColumns.includes(columnName);
  },
})); 