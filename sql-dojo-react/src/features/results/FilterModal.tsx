import React from 'react';
import { Modal, Button, Form, Badge, ListGroup } from 'react-bootstrap';
import { useUIStore } from '../../stores/useUIStore';
import { useFilterModalState } from './hooks/useFilterModalState';
import { useFilterModalActions } from './hooks/useFilterModalActions';

const FilterModal: React.FC = () => {
  const { filterModal } = useUIStore();
  
  // 状態管理
  const {
    selectedValues,
    searchTerm,
    uniqueValues,
    isLoading,
    error,
    isTruncated,
    setSelectedValues,
    setSearchTerm,
  } = useFilterModalState();

  // アクション処理
  const {
    filteredValues,
    handleValueToggle,
    handleApply,
    handleClear,
    handleSelectAll,
    handleDeselectAll,
    handleClose,
    handleSearchChange,
  } = useFilterModalActions(
    { selectedValues, searchTerm, uniqueValues, isLoading, error, isTruncated },
    setSelectedValues,
    setSearchTerm
  );

  return (
    <Modal show={filterModal.show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-filter me-2"></i>
          {filterModal.columnName} のフィルタ
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <Form.Control
            type="text"
            placeholder="値を検索..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
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
          {isLoading ? (
            <div className="text-center text-muted py-3">読み込み中...</div>
          ) : error ? (
            <div className="text-danger py-3">{error}</div>
          ) : (
            <>
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
              {isTruncated && (
                <div className="text-warning mt-2">※ 候補は最大100件まで表示されます</div>
              )}
            </>
          )}
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
        <Button variant="secondary" onClick={handleClose}>
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