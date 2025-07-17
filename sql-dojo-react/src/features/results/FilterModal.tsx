import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, ListGroup } from 'react-bootstrap';
import { apiClient } from '../../api/apiClient';
import { useSqlPageStore } from '../../stores/useSqlPageStore';

const FilterModal: React.FC = () => {
  const { filterModal, setFilterModal, sessionId, filters, applyFilter } = useSqlPageStore();
  const [selectedValues, setSelectedValues] = useState<string[]>(filterModal.currentFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // ユニーク値をAPI経由で取得
  useEffect(() => {
    if (!filterModal.show) return;
    if (!sessionId) {
      setUniqueValues([]);
      setIsLoading(false);
      setError('セッションIDがありません。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setUniqueValues([]);
    setIsTruncated(false);
    apiClient.post<{ values: string[]; truncated?: boolean }, any>(
      '/sql/cache/unique-values',
      { session_id: sessionId, column_name: filterModal.columnName, filters }
    )
      .then(res => {
        setUniqueValues(res.values || []);
        setIsTruncated(!!res.truncated);
      })
      .catch(e => setError(e.message || 'ユニーク値の取得に失敗しました'))
      .finally(() => setIsLoading(false));
  }, [filterModal.show, sessionId, filterModal.columnName, JSON.stringify(filters)]);

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
    applyFilter(filterModal.columnName, selectedValues);
    setFilterModal({ ...filterModal, currentFilters: selectedValues });
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

  // モーダルが開くたびに現在のフィルタを設定
  useEffect(() => {
    if (filterModal.show) {
      setSelectedValues(filterModal.currentFilters);
    }
  }, [filterModal.show, filterModal.currentFilters]);

  return (
    <Modal show={filterModal.show} onHide={() => setFilterModal({ ...filterModal, show: false })} size="lg">
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
        <Button variant="secondary" onClick={() => setFilterModal({ ...filterModal, show: false })}>
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