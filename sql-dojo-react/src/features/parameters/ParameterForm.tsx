import React, { useState, useRef } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import type { ParameterFormProps } from '../../types/parameters';

/**
 * パラメータ入力フォームコンポーネント
 * 4種類の入力タイプに対応：
 * - text: フリーテキスト入力
 * - select: セレクトボックス
 * - multi-text: 複数項目入力（カンマ区切り）
 * - multi-text-quoted: 複数項目入力（シングルクォート付きカンマ区切り）
 */
export const ParameterForm: React.FC<ParameterFormProps> = ({ placeholder, value, onChange }) => {
  const [localValues, setLocalValues] = useState<string[]>(
    Array.isArray(value) ? value : value ? [value] : ['']
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const hiddenTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 値の変更を親コンポーネントに通知
  const notifyChange = (newValues: string[]) => {
    if (placeholder.type === 'text' || placeholder.type === 'select') {
      // 単一項目の場合
      onChange(newValues[0] || '');
    } else {
      // 複数項目の場合
      onChange(newValues.filter(v => v.trim() !== ''));
    }
  };

  // 単一項目の値変更
  const handleSingleValueChange = (newValue: string) => {
    onChange(newValue);
  };

  // 複数項目の値変更
  const handleMultiValueChange = (index: number, newValue: string) => {
    const newValues = [...localValues];
    newValues[index] = newValue;
    setLocalValues(newValues);
    // 即座にnotifyChangeを呼ばず、少し遅延させる
    setTimeout(() => {
      notifyChange(newValues);
    }, 0);
  };

  // 行の追加
  const handleAddRow = () => {
    const newValues = [...localValues, ''];
    setLocalValues(newValues);
    notifyChange(newValues);
  };

  // 行の削除
  const handleRemoveRow = (index: number) => {
    if (localValues.length > 1) {
      const newValues = localValues.filter((_, i) => i !== index);
      setLocalValues(newValues);
      notifyChange(newValues);
    }
  };

  // Excelからのペースト処理
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    
    // Excelデータを適切に分割
    const newValues = parseExcelData(pastedText);

    if (newValues.length > 0) {
      // 通常モード: 選択中のインデックス以降に追加
      const insertIndex = selectedIndex >= 0 ? selectedIndex : localValues.length;
      const updatedValues = [...localValues];
      
      // 選択中の位置に新しい値を挿入
      updatedValues.splice(insertIndex, 0, ...newValues);
      
      setLocalValues(updatedValues);
      notifyChange(updatedValues);
      
      console.log(`Excelから${newValues.length}件のデータを${insertIndex}番目以降に追加しました:`, newValues);
    }
  };

  // Excelデータを解析して適切に分割
  const parseExcelData = (excelText: string): string[] => {
    // 改行文字を統一してから改行で行に分割
    const normalizedText = excelText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) return [];
    
    // 各行をタブで分割してセルを取得
    const allCells: string[] = [];
    
    lines.forEach(line => {
      const cells = line.split('\t').filter(cell => cell.trim() !== '');
      allCells.push(...cells);
    });
    
    return allCells;
  };

  // 隠しテキストエリアにフォーカス（ペースト用）
  const handleContainerClick = () => {
    if (hiddenTextareaRef.current) {
      hiddenTextareaRef.current.focus();
    }
  };

  // 複数項目入力フォームにペーストヒントを追加
  const handleMultiInputPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    // 個別の入力フィールドでもペーストを受け付ける
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    
    // Excelデータを適切に分割
    const newValues = parseExcelData(pastedText);

    if (newValues.length > 0) {
      // 通常モード: 選択中のインデックス以降に追加
      const insertIndex = selectedIndex >= 0 ? selectedIndex : localValues.length;
      const updatedValues = [...localValues];
      
      // 選択中の位置に新しい値を挿入
      updatedValues.splice(insertIndex, 0, ...newValues);
      
      setLocalValues(updatedValues);
      notifyChange(updatedValues);
      
      console.log(`Excelから${newValues.length}件のデータを${insertIndex}番目以降に追加しました:`, newValues);
    }
  };

  // プレースホルダーの種類に応じてUIを分岐
  if (placeholder.type === 'text') {
    // フリーテキスト入力
    return (
      <Form.Group className="mb-2">
        <Form.Label className="small mb-1">{placeholder.displayName}</Form.Label>
        <Form.Control
          type="text"
          size="sm"
          placeholder={placeholder.displayName}
          value={Array.isArray(value) ? value[0] || '' : value || ''}
          onChange={(e) => handleSingleValueChange(e.target.value)}
        />
      </Form.Group>
    );
  }

  if (placeholder.type === 'select') {
    // セレクトボックス
    return (
      <Form.Group className="mb-2">
        <Form.Label className="small mb-1">{placeholder.displayName}</Form.Label>
        <Form.Select 
          size="sm"
          value={Array.isArray(value) ? value[0] || '' : value || ''}
          onChange={(e) => handleSingleValueChange(e.target.value)}
        >
          <option value="">選択してください</option>
          {placeholder.choices?.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    );
  }

  // 複数項目入力（multi-text または multi-text-quoted）
  return (
    <div className="mb-3">
      <Form.Label className="small mb-1">{placeholder.displayName}</Form.Label>
      
      {/* Excelからのペーストを受け付けるための隠しtextarea */}
      <textarea
        ref={hiddenTextareaRef}
        onPaste={handlePaste}
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
      />

      {/* 複数項目入力のテーブル */}
      <div 
        className="border rounded p-2" 
        style={{ backgroundColor: '#f8f9fa' }}
        onClick={handleContainerClick}
      >
        {localValues.map((val, index) => (
          <Row key={`${placeholder.displayName}-${index}`} className="mb-1 align-items-center">
            <Col>
              <Form.Control
                type="text"
                size="sm"
                value={val}
                onChange={(e) => handleMultiValueChange(index, e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(index);
                }}
                onFocus={() => setSelectedIndex(index)}
                onPaste={handleMultiInputPaste}
                placeholder="値を入力（Excelからペースト可）"
                style={{ 
                  border: '1px solid #dee2e6',
                  padding: '2px 6px',
                  fontSize: '0.875rem',
                  backgroundColor: selectedIndex === index ? '#e3f2fd' : 'white'
                }}
              />
            </Col>
            <Col xs="auto">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveRow(index);
                }}
                disabled={localValues.length <= 1}
                style={{ 
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  minWidth: '32px'
                }}
              >
                <i className="fas fa-minus"></i>
              </Button>
            </Col>
          </Row>
        ))}
        
        {/* 行追加ボタン */}
        <Row className="mt-2">
          <Col>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAddRow();
              }}
              style={{ 
                padding: '4px 8px',
                fontSize: '0.75rem'
              }}
            >
              <i className="fas fa-plus me-1"></i>
              行を追加
            </Button>
          </Col>
        </Row>
      </div>
      
      {/* プレースホルダーの種類に応じた説明 */}
      <small className="text-muted">
        {placeholder.type === 'multi-text' && "自由入力 ,区切り挿入"}
        {placeholder.type === 'multi-text-quoted' && "自由入力 ''付き,区切り挿入"}
      </small>
    </div>
  );
}; 