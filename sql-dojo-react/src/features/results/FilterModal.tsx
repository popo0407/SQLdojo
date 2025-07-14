import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, ListGroup } from 'react-bootstrap';
import styles from './Results.module.css';

interface FilterModalProps {
  show: boolean;
  onHide: () => void;
  columnName: string;
  data: any[];
  currentFilters: string[];
  onApplyFilters: (filters: string[]) => void;
  // フィルタリング後のデータを追加
  filteredData?: any[];
}

const FilterModal: React.FC<FilterModalProps> = ({
  show,
  onHide,
  columnName,
  data,
  currentFilters,
  onApplyFilters,
  filteredData
}) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(currentFilters);
  const [searchTerm, setSearchTerm] = useState('');

  // フィルタリング後のデータから列のユニークな値を取得
  const sourceData = filteredData || data;
  const uniqueValues = Array.from(new Set(
    sourceData.map(row => String(row[columnName] ?? ''))
  )).filter(value => value !== '').sort();

  // 検索フィルタを適用した値
  const filteredValues = uniqueValues.filter(value =>
    value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleValueToggle = (value: string) => {
    setSelectedValues(prev => 
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleApply = () => {
    onApplyFilters(selectedValues);
    onHide();
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

  // モーダルが開くたびに現在のフィルタを設定
  useEffect(() => {
    if (show) {
      setSelectedValues(currentFilters);
    }
  }, [show, currentFilters]);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-filter me-2"></i>
          {columnName} のフィルタ
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <Form.Control
            type="text"
            placeholder="値を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted">
            {filteredValues.length} 個の値から {selectedValues.length} 個を選択
          </small>
          <div>
            <Button size="sm" variant="outline-secondary" onClick={handleSelectAll} className="me-1">
              全て選択
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={handleDeselectAll}>
              選択解除
            </Button>
          </div>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <ListGroup>
            {filteredValues.map((value) => (
              <ListGroup.Item
                key={value}
                action
                active={selectedValues.includes(value)}
                onClick={() => handleValueToggle(value)}
                className="d-flex justify-content-between align-items-center"
              >
                <span>{value}</span>
                {selectedValues.includes(value) && (
                  <i className="fas fa-check text-primary"></i>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>

        {selectedValues.length > 0 && (
          <div className="mt-3">
            <small className="text-muted">選択された値:</small>
            <div className="mt-1">
              {selectedValues.map((value) => (
                <Badge
                  key={value}
                  bg="primary"
                  className="me-1 mb-1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleValueToggle(value)}
                >
                  {value} <i className="fas fa-times ms-1"></i>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClear}>
          クリア
        </Button>
        <Button variant="secondary" onClick={onHide}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={handleApply}>
          適用
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FilterModal; 