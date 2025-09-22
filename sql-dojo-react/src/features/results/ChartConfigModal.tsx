import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faTimes } from '@fortawesome/free-solid-svg-icons';
import type { 
  SimpleChartConfig, 
  ChartType, 
  DataScope,
  DataType,
  ColumnConfig
} from '../../utils/chartUtils';
import {
  getNumericColumns,
  createDefaultChartConfig,
  createSmartChartConfig,
  assignColors,
  detectColumnTypes,
  EXCEL_COLORS,
  COLOR_NAMES
} from '../../utils/chartUtils';

interface ChartConfigModalProps {
  show: boolean;
  onHide: () => void;
  onApply: (config: SimpleChartConfig) => void;
  data: Record<string, unknown>[];
  columns: string[];
  initialConfig?: Partial<SimpleChartConfig>;
}

/**
 * シンプルなグラフ設定用モーダル (Excel互換)
 */
const ChartConfigModal: React.FC<ChartConfigModalProps> = ({
  show,
  onHide,
  onApply,
  data,
  columns,
  initialConfig,
}) => {
  // 利用可能な数値カラム
  const numericColumns = getNumericColumns(data, columns);

  // カラムのデータ型を自動検出
  const [detectedTypes, setDetectedTypes] = useState<Record<string, DataType>>({});

  useEffect(() => {
    if (show && data.length > 0) {
      const types = detectColumnTypes(data, columns);
      setDetectedTypes(types);
    }
  }, [show, data, columns]);

  // フォーム状態
  const [config, setConfig] = useState<SimpleChartConfig>(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      const defaultConfig = createDefaultChartConfig();
      return {
        ...defaultConfig,
        ...initialConfig,
        yColumnConfigs: initialConfig.yColumnConfigs || [],
        colors: initialConfig.colors || {},
        yAxisRange: initialConfig.yAxisRange || {},
      };
    } else {
      return createSmartChartConfig(data, columns);
    }
  });

  // フォームのリセット処理
  useEffect(() => {
    if (show) {
      if (initialConfig && Object.keys(initialConfig).length > 0) {
        const defaultConfig = createDefaultChartConfig();
        setConfig({
          ...defaultConfig,
          ...initialConfig,
          yColumnConfigs: initialConfig.yColumnConfigs || [],
          colors: initialConfig.colors || assignColors(initialConfig.yColumns || []),
          yAxisRange: initialConfig.yAxisRange || {},
        });
      } else {
        setConfig(createSmartChartConfig(data, columns));
      }
    }
  }, [show, initialConfig, data, columns]);

  // Y軸カラムの追加
  const handleAddYColumn = (column: string) => {
    if (!config.yColumns.includes(column)) {
      const newYColumns = [...config.yColumns, column];
      const detectedType = detectedTypes[column] || 'number';
      const colorIndex = newYColumns.length - 1;
      const color = EXCEL_COLORS[colorIndex % EXCEL_COLORS.length];
      
      const newColumnConfig: ColumnConfig = {
        name: column,
        dataType: detectedType,
        color: color,
      };
      
      setConfig(prev => ({
        ...prev,
        yColumns: newYColumns,
        yColumnConfigs: [...prev.yColumnConfigs, newColumnConfig],
        colors: { ...prev.colors, [column]: color },
        yAxisLabel: newYColumns.length === 1 ? column : prev.yAxisLabel,
        // Y軸カラムが変更されたので自動スケール値をリセット
        yAxisRange: {}
      }));
    }
  };

  // Y軸カラムの削除
  const handleRemoveYColumn = (column: string) => {
    const newYColumns = config.yColumns.filter(col => col !== column);
    const newYColumnConfigs = config.yColumnConfigs.filter(conf => conf.name !== column);
    const newColors = { ...config.colors };
    delete newColors[column];
    
    setConfig(prev => ({
      ...prev,
      yColumns: newYColumns,
      yColumnConfigs: newYColumnConfigs,
      colors: newColors,
      // Y軸カラムが変更されたので自動スケール値をリセット
      yAxisRange: {}
    }));
  };

  // カラーの変更
  const handleColorChange = (column: string, color: string) => {
    setConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, [column]: color },
      yColumnConfigs: prev.yColumnConfigs.map(conf =>
        conf.name === column ? { ...conf, color } : conf
      ),
    }));
  };

  // データ型の変更
  const handleDataTypeChange = (column: string, dataType: DataType) => {
    if (column === config.xColumn) {
      setConfig(prev => ({ ...prev, xColumnType: dataType }));
    } else {
      setConfig(prev => ({
        ...prev,
        yColumnConfigs: prev.yColumnConfigs.map(conf =>
          conf.name === column ? { ...conf, dataType } : conf
        ),
      }));
    }
  };

  // 適用ボタンのハンドラ
  const handleApply = () => {
    if (config.xColumn && config.yColumns.length > 0) {
      onApply(config);
      onHide();
    }
  };

  // バリデーション
  const isValid = config.xColumn && config.yColumns.length > 0;

  // Chart.jsの自動スケール計算を模倣してきれいに丸められたY軸範囲を計算
  const getChartAutoYAxisRange = (): { min: number; max: number } | null => {
    if (!data.length || config.yColumns.length === 0) return null;
    
    const allValues: number[] = [];
    
    config.yColumns.forEach(columnName => {
      const values = data
        .map(row => {
          const value = row[columnName];
          return typeof value === 'number' ? value : parseFloat(String(value));
        })
        .filter(value => !isNaN(value));
      
      allValues.push(...values);
    });
    
    if (allValues.length === 0) return null;
    
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    
    // Chart.jsのスケール計算アルゴリズムを模倣
    const range = dataMax - dataMin;
    
    // 範囲が0の場合（すべて同じ値）
    if (range === 0) {
      const value = dataMin;
      return {
        min: value - Math.abs(value) * 0.1 - 1,
        max: value + Math.abs(value) * 0.1 + 1
      };
    }
    
    // ステップサイズを計算
    const roughStep = range / 5; // 約5段階
    const stepMagnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / stepMagnitude;
    
    let niceStep;
    if (normalizedStep <= 1) niceStep = 1;
    else if (normalizedStep <= 2) niceStep = 2;
    else if (normalizedStep <= 5) niceStep = 5;
    else niceStep = 10;
    
    const finalStep = niceStep * stepMagnitude;
    
    // きれいな最小値・最大値を計算
    const niceMin = Math.floor(dataMin / finalStep) * finalStep;
    const niceMax = Math.ceil(dataMax / finalStep) * finalStep;
    
    // 最小値が0以上で、きれいな最小値が負の場合は0に調整
    if (dataMin >= 0 && niceMin < 0) {
      const adjustedMin = 0;
      return { min: adjustedMin, max: niceMax };
    }
    
    return { min: niceMin, max: niceMax };
  };

  // Chart.jsスタイルの自動範囲を取得
  const autoRange = getChartAutoYAxisRange();

  // Y軸範囲の初期設定（カラムが変更された時に自動範囲をデフォルト値として設定）
  useEffect(() => {
    if (show && autoRange && config.yColumns.length > 0) {
      // 現在の設定が空（undefined）またはリセットされた場合に自動範囲を設定
      const isRangeEmpty = !config.yAxisRange || 
        (config.yAxisRange.min === undefined && config.yAxisRange.max === undefined) ||
        (Object.keys(config.yAxisRange).length === 0);
        
      if (isRangeEmpty) {
        setConfig(prev => ({
          ...prev,
          yAxisRange: {
            min: autoRange.min,
            max: autoRange.max
          }
        }));
      }
    }
  }, [show, autoRange, config.yColumns.length, config.yAxisRange, setConfig]);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faChartBar} className="me-2" />
          シンプルグラフ設定
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* グラフタイプ */}
        <Card className="mb-3">
          <Card.Header><strong>グラフタイプ</strong></Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Select
                value={config.chartType}
                onChange={(e) => setConfig(prev => ({ ...prev, chartType: e.target.value as ChartType }))}
              >
                <option value="bar">棒グラフ</option>
                <option value="scatter">散布図</option>
                <option value="line">折れ線グラフ</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* データ範囲設定 */}
        <Card className="mb-3">
          <Card.Header><strong>データ範囲</strong></Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Check
                type="radio"
                id="data-scope-displayed"
                name="dataScope"
                label="現在表示中のデータのみ"
                checked={config.dataScope === 'displayed'}
                onChange={() => setConfig(prev => ({ ...prev, dataScope: 'displayed' as DataScope }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                id="data-scope-all"
                name="dataScope"
                label="すべてのデータ"
                checked={config.dataScope === 'all'}
                onChange={() => setConfig(prev => ({ ...prev, dataScope: 'all' as DataScope }))}
              />
            </Form.Group>
          </Card.Body>
        </Card>

        {/* X軸設定 */}
        <Card className="mb-3">
          <Card.Header><strong>X軸</strong></Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>X軸カラム</Form.Label>
                  <Form.Select
                    value={config.xColumn}
                    onChange={(e) => {
                      const selectedColumn = e.target.value;
                      const detectedType = detectedTypes[selectedColumn] || 'string';
                      setConfig(prev => ({ 
                        ...prev, 
                        xColumn: selectedColumn,
                        xColumnType: detectedType,
                        xAxisLabel: selectedColumn || prev.xAxisLabel
                      }));
                    }}
                  >
                    <option value="">選択してください</option>
                    {columns.map(col => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>データ型</Form.Label>
                  <Form.Select
                    value={config.xColumnType}
                    onChange={(e) => handleDataTypeChange(config.xColumn, e.target.value as DataType)}
                    disabled={!config.xColumn}
                  >
                    <option value="string">文字列</option>
                    <option value="number">数値</option>
                    <option value="date">日付</option>
                    <option value="datetime">日時</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>X軸ラベル</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.xAxisLabel}
                    onChange={(e) => setConfig(prev => ({ ...prev, xAxisLabel: e.target.value }))}
                    placeholder="X軸のラベル"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Y軸設定 */}
        <Card className="mb-3">
          <Card.Header><strong>Y軸</strong></Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Y軸カラムを追加</Form.Label>
              <Form.Select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddYColumn(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">数値カラムを選択</option>
                {numericColumns
                  .filter(col => !config.yColumns.includes(col))
                  .map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))
                }
              </Form.Select>
            </Form.Group>

            {/* 選択されたY軸カラム一覧 */}
            {config.yColumns.length > 0 && (
              <div>
                <Form.Label>選択されたY軸カラム</Form.Label>
                {config.yColumns.map((col) => {
                  const columnConfig = config.yColumnConfigs.find(conf => conf.name === col);
                  const currentColor = columnConfig?.color || config.colors?.[col] || EXCEL_COLORS[0];
                  const currentDataType = columnConfig?.dataType || detectedTypes[col] || 'number';
                  
                  return (
                    <div key={col} className="mb-3 p-3 border rounded">
                      <Row className="align-items-center">
                        <Col md={3}>
                          <strong>{col}</strong>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="small">データ型</Form.Label>
                            <Form.Select
                              size="sm"
                              value={currentDataType}
                              onChange={(e) => handleDataTypeChange(col, e.target.value as DataType)}
                            >
                              <option value="number">数値</option>
                              <option value="date">日付</option>
                              <option value="datetime">日時</option>
                              <option value="string">文字列</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="small">
                              色設定
                              <span 
                                className="ms-2 d-inline-block border rounded" 
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: currentColor,
                                  verticalAlign: 'middle'
                                }}
                              ></span>
                            </Form.Label>
                            <Form.Select
                              size="sm"
                              value={currentColor}
                              onChange={(e) => handleColorChange(col, e.target.value)}
                            >
                              {EXCEL_COLORS.map((color) => (
                                <option key={color} value={color}>
                                  {COLOR_NAMES[color as keyof typeof COLOR_NAMES] || color}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveYColumn(col)}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
              </div>
            )}

            <Row className="mt-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Y軸ラベル</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.yAxisLabel}
                    onChange={(e) => setConfig(prev => ({ ...prev, yAxisLabel: e.target.value }))}
                    placeholder="Y軸のラベル"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Y軸範囲設定 */}
            <Row className="mt-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Y軸範囲設定（省略可）</Form.Label>
                  <Row>
                    <Col md={6}>
                      <Form.Label className="small">最小値</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder={autoRange ? `自動: ${autoRange.min}` : "自動設定"}
                        value={config.yAxisRange?.min !== undefined ? config.yAxisRange.min : ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          setConfig(prev => ({
                            ...prev,
                            yAxisRange: {
                              ...prev.yAxisRange,
                              min: value
                            }
                          }));
                        }}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label className="small">最大値</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder={autoRange ? `自動: ${autoRange.max}` : "自動設定"}
                        value={config.yAxisRange?.max !== undefined ? config.yAxisRange.max : ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          setConfig(prev => ({
                            ...prev,
                            yAxisRange: {
                              ...prev.yAxisRange,
                              max: value
                            }
                          }));
                        }}
                      />
                    </Col>
                  </Row>
                  <Form.Text className="text-muted">

                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* タイトル設定 */}
        <Card className="mb-3">
          <Card.Header><strong>グラフタイトル</strong></Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Control
                type="text"
                value={config.title}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="グラフのタイトル（省略可）"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          キャンセル
        </Button>
        <Button 
          variant="primary" 
          onClick={handleApply}
          disabled={!isValid}
        >
          グラフを生成
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChartConfigModal;
