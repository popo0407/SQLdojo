import { create } from 'zustand';
import { parsePlaceholders, replacePlaceholders } from '../features/parameters/ParameterParser';
import type { Placeholder, ParameterType } from '../types/parameters';

interface ParameterStoreState {
  // パラメータの値を保持。通常の値はstring、複数項目の値はstring[]
  values: { [key: string]: string | string[] };
  
  // プレースホルダーのメタ情報（型や引用符の有無など）
  placeholders: {
    [key: string]: {
      type: ParameterType;
      options?: string[];
    }
  };
  
  // 現在のプレースホルダー情報
  currentPlaceholders: Placeholder[];
  
  // アクション
  setValue: (key: string, value: string | string[]) => void;
  clearValues: () => void;
  updatePlaceholders: (sql: string) => void;
  getReplacedSql: (sql: string) => string;
  getPlaceholderValues: () => { [key: string]: string | string[] };
  
  // 検証機能
  validateParameters: () => { isValid: boolean; errors: string[] };
}

/**
 * パラメータ状態管理ストア
 * プレースホルダーの解析、値の管理、SQL置換を担当
 */
export const useParameterStore = create<ParameterStoreState>((set, get) => ({
  // 初期状態
  values: {},
  placeholders: {},
  currentPlaceholders: [],
  
  // パラメータ値の設定
  setValue: (key: string, value: string | string[]) => {
    set((state) => ({
      values: {
        ...state.values,
        [key]: value
      }
    }));
  },
  
  // パラメータ値のクリア
  clearValues: () => {
    set({ values: {} });
  },
  
  // プレースホルダーの更新（SQL変更時に呼び出される）
  updatePlaceholders: (sql: string) => {
    const placeholders = parsePlaceholders(sql);
    
    // プレースホルダー情報をストアに保存
    const placeholderInfo: { [key: string]: { type: ParameterType; options?: string[] } } = {};
    placeholders.forEach(placeholder => {
      placeholderInfo[placeholder.displayName] = {
        type: placeholder.type,
        options: placeholder.choices
      };
    });
    
    set({
      currentPlaceholders: placeholders,
      placeholders: placeholderInfo
    });
  },
  
  // プレースホルダーを置換したSQLを取得
  getReplacedSql: (sql: string) => {
    const { values } = get();
    return replacePlaceholders(sql, values);
  },
  
  // プレースホルダー値を取得
  getPlaceholderValues: () => {
    return get().values;
  },
  
  // パラメータの検証
  validateParameters: () => {
    const { values, currentPlaceholders } = get();
    const errors: string[] = [];
    
    currentPlaceholders.forEach(placeholder => {
      const value = values[placeholder.displayName];
      
      // 値が未設定の場合
      if (value === undefined || value === null) {
        errors.push(`「${placeholder.displayName}」が入力されていません`);
        return;
      }
      
      // 文字列の場合（text, select）
      if (typeof value === 'string') {
        if (value.trim() === '') {
          errors.push(`「${placeholder.displayName}」が入力されていません`);
          return;
        }
        
        // select型の場合、選択肢が選択されているかチェック
        if (placeholder.type === 'select' && placeholder.choices) {
          if (!placeholder.choices.includes(value)) {
            errors.push(`「${placeholder.displayName}」で有効な選択肢を選択してください`);
          }
        }
      }
      
      // 配列の場合（multi-text, multi-text-quoted）
      if (Array.isArray(value)) {
        if (value.length === 0) {
          errors.push(`「${placeholder.displayName}」が入力されていません`);
          return;
        }
        
        // 空の文字列が含まれていないかチェック
        const hasEmptyValues = value.some(item => item.trim() === '');
        if (hasEmptyValues) {
          errors.push(`「${placeholder.displayName}」に空の項目が含まれています`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
})); 