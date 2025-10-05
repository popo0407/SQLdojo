import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, ListGroup, ButtonGroup, Row, Col, Alert } from 'react-bootstrap';
import { useUIStore } from '../../stores/useUIStore';
import { useResultsDataStore } from '../../stores/useResultsDataStore';
import { useResultsFilterStore } from '../../stores/useResultsFilterStore';
import { useFilterModalState } from './hooks/useFilterModalState';
import { useFilterModalActions } from './hooks/useFilterModalActions';
import { detectDataType, getValueRange, DATA_TYPE_NAMES } from '../../utils/dataTypeUtils';
import type { DataType, FilterMode, ExtendedFilterCondition } from '../../types/results';

const FilterModal: React.FC = () => {
  const { filterModal } = useUIStore();
  const { rawData } = useResultsDataStore();
  const { applyExtendedFilter } = useResultsFilterStore();
  
  // フィルターモード状態
  const [filterMode, setFilterMode] = useState<FilterMode>('exact');
  const [dataType, setDataType] = useState<DataType>('string');
  
  // 拡張フィルター用の状態
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  
  // 既存のフィルター状態管理
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

  // 既存のフィルターアクション
  const {
    filteredValues,
    handleValueToggle,
    handleApply: handleExactApply,
    handleClear: handleExactClear,
    handleSelectAll,
    handleDeselectAll,
    handleClose,
    handleSearchChange,
  } = useFilterModalActions(
    { selectedValues, searchTerm, uniqueValues, isLoading, error, isTruncated },
    setSelectedValues,
    setSearchTerm
  );

  // データ型の自動検出とデフォルト値設定
  useEffect(() => {
    if (!filterModal.show || !filterModal.columnName || !rawData.length) return;
    
    const columnValues = rawData.map(row => row[filterModal.columnName]);
    const detectedType = detectDataType(columnValues);
    setDataType(detectedType);
    
    // デフォルトフィルターモードを設定
    if (detectedType === 'number' || detectedType === 'date' || detectedType === 'datetime') {
      setFilterMode('range');
      
      // 範囲のデフォルト値を設定
      const range = getValueRange(columnValues, detectedType);
      setMinValue(range.min?.toString() || '');
      setMaxValue(range.max?.toString() || '');
    } else {
      setFilterMode('exact');
    }
    
    // フィルターモード変更時に状態をリセット
    setSearchText('');
  }, [filterModal.show, filterModal.columnName, rawData]);

  // 拡張フィルターの適用
  const handleExtendedApply = async () => {
    if (!filterModal.columnName) return;
    
    let filterCondition: ExtendedFilterCondition;
    
    switch (filterMode) {
      case 'exact':
        // 既存の完全一致フィルターを使用
        await handleExactApply();
        return;
        
      case 'range':
        filterCondition = {
          column_name: filterModal.columnName,
          filter_type: 'range',
          min_value: minValue ? (dataType === 'number' ? Number(minValue) : minValue) : undefined,
          max_value: maxValue ? (dataType === 'number' ? Number(maxValue) : maxValue) : undefined,
          data_type: dataType
        };
        break;
        
      case 'text_search':
        filterCondition = {
          column_name: filterModal.columnName,
          filter_type: 'text_search',
          search_text: searchText,
          case_sensitive: false
        };
        break;
    }
    
    await applyExtendedFilter(filterCondition);
    handleClose();
  };

  // フィルター内容のクリア
  const handleExtendedClear = () => {
    setMinValue('');
    setMaxValue('');
    setSearchText('');
    if (filterMode === 'exact') {
      handleExactClear();
    }
  };

  // フィルター内容をレンダリング
  const renderFilterContent = () => {
    switch (filterMode) {
      case 'exact':
        return (
          <>
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
          </>
        );
        
      case 'range':
        return (
          <>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>最小値</Form.Label>
                  <Form.Control
                    type={dataType === 'number' ? 'number' : dataType === 'date' ? 'date' : 'datetime-local'}
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    placeholder="最小値を入力"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>最大値</Form.Label>
                  <Form.Control
                    type={dataType === 'number' ? 'number' : dataType === 'date' ? 'date' : 'datetime-local'}
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    placeholder="最大値を入力"
                  />
                </Form.Group>
              </Col>
            </Row>
            {(minValue || maxValue) && (
              <Alert variant="info" className="small">
                <i className="fas fa-info-circle me-1"></i>
                {minValue && maxValue
                  ? `${minValue} から ${maxValue} までの範囲でフィルタリングします`
                  : minValue
                  ? `${minValue} 以上でフィルタリングします`
                  : `${maxValue} 以下でフィルタリングします`
                }
              </Alert>
            )}
          </>
        );
        
      case 'text_search':
        return (
          <>
            <Form.Group className="mb-3">
              <Form.Label>検索テキスト</Form.Label>
              <Form.Control
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="部分一致で検索するテキストを入力"
              />
            </Form.Group>
            {searchText && (
              <Alert variant="info" className="small">
                <i className="fas fa-search me-1"></i>
                「{searchText}」を含む行が表示されます（大文字小文字を区別しません）
              </Alert>
            )}
          </>
        );
    }
  };

  return (
    <Modal show={filterModal.show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-filter me-2"></i>
          {filterModal.columnName} のフィルタ
          <small className="text-muted ms-2">({DATA_TYPE_NAMES[dataType]})</small>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* フィルターモード選択 */}
        <div className="mb-4">
          <Form.Label className="fw-bold">フィルタータイプ:</Form.Label>
          <ButtonGroup className="d-block w-100">
            <Button
              variant={filterMode === 'exact' ? 'primary' : 'outline-primary'}
              onClick={() => setFilterMode('exact')}
              className="me-2"
            >
              <i className="fas fa-list me-1"></i>
              完全一致
            </Button>
            {(dataType === 'number' || dataType === 'date' || dataType === 'datetime') && (
              <Button
                variant={filterMode === 'range' ? 'primary' : 'outline-primary'}
                onClick={() => setFilterMode('range')}
                className="me-2"
              >
                <i className="fas fa-arrows-alt-h me-1"></i>
                範囲指定
              </Button>
            )}
            <Button
              variant={filterMode === 'text_search' ? 'primary' : 'outline-primary'}
              onClick={() => setFilterMode('text_search')}
            >
              <i className="fas fa-search me-1"></i>
              部分一致
            </Button>
          </ButtonGroup>
        </div>
        
        {/* フィルター内容 */}
        {renderFilterContent()}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleExtendedClear}>
          クリア
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={handleExtendedApply}>
          適用
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FilterModal; 