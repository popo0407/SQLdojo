export type ParameterType = 'text' | 'select' | 'multi-text' | 'multi-text-quoted';

export interface Placeholder {
  fullMatch: string;
  displayName: string;
  type: ParameterType;
  choices?: string[];
  startIndex: number;
  endIndex: number;
}

export interface ParameterState {
  // パラメータの値を保持。通常の値はstring、複数項目の値はstring[]
  values: { [key: string]: string | string[] };
  
  // プレースホルダーのメタ情報（型や引用符の有無など）
  placeholders: {
    [key: string]: {
      type: ParameterType;
      options?: string[];
    }
  };
}

export interface ParameterFormProps {
  placeholder: Placeholder;
  value: string | string[];
  onChange: (value: string | string[]) => void;
} 