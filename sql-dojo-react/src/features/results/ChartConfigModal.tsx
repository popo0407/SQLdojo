import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faTimes } from '@fortawesome/free-solid-svg-icons';
import type { 
  ChartConfig, 
  ChartType, 
  YAxisSide, 
  LegendPosition,
  DataScope,
  ColumnDataType
} from '../../utils/chartUtils';
import {
  getNumericColumns,
  getXAxisColumns,
  createDefaultChartConfig,
  assignColors,
  EXCEL_COLOR_PALETTE,
  getColumnDataType
} from '../../utils/chartUtils';

interface ChartConfigModalProps {
  show: boolean;
  onHide: () => void;
  onApply: (config: ChartConfig) => void;
  data: Record<string, unknown>[];
  columns: string[];
  initialConfig?: Partial<ChartConfig>;
}

/**
 * グラフ設定用モーダル
 */
const ChartConfigModal: React.FC<ChartConfigModalProps> = ({
  show,
  onHide,
  onApply,
  data,
  columns,
  initialConfig,
}) => {
  // 利用可能なカラム（基本）
  const xAxisColumns = getXAxisColumns(data, columns);
  
  // 動的な数値カラム（手動データ型設定を考慮）
  const [availableNumericColumns, setAvailableNumericColumns] = useState<string[]>([]);

  // フォーム状態
  const [config, setConfig] = useState<ChartConfig>(() => {
    const defaultConfig = createDefaultChartConfig();
    return {
      xAxisColumn: initialConfig?.xAxisColumn || defaultConfig.xAxisColumn || '',
      xAxisLabel: initialConfig?.xAxisLabel || defaultConfig.xAxisLabel || '',
      yAxisColumns: initialConfig?.yAxisColumns || defaultConfig.yAxisColumns || [],
      yAxisSides: initialConfig?.yAxisSides || defaultConfig.yAxisSides || {},
      yAxisLabels: initialConfig?.yAxisLabels || defaultConfig.yAxisLabels || { left: '', right: '' },
      seriesColors: initialConfig?.seriesColors || defaultConfig.seriesColors || {},
      legendPosition: initialConfig?.legendPosition || defaultConfig.legendPosition || 'right',
      legendVisible: initialConfig?.legendVisible ?? defaultConfig.legendVisible ?? true,
      chartType: initialConfig?.chartType || defaultConfig.chartType || 'bar',
      yAxisRanges: initialConfig?.yAxisRanges || defaultConfig.yAxisRanges || { left: {}, right: {} },
      dataScope: initialConfig?.dataScope || defaultConfig.dataScope || 'displayed',
      columnDataTypes: initialConfig?.columnDataTypes || defaultConfig.columnDataTypes || {},
    };
  });

  // フォームのリセット処理
  useEffect(() => {
    if (show) {
      const defaultConfig = createDefaultChartConfig();
      setConfig({
        xAxisColumn: initialConfig?.xAxisColumn || defaultConfig.xAxisColumn || '',
        xAxisLabel: initialConfig?.xAxisLabel || defaultConfig.xAxisLabel || '',
        yAxisColumns: initialConfig?.yAxisColumns || defaultConfig.yAxisColumns || [],
        yAxisSides: initialConfig?.yAxisSides || defaultConfig.yAxisSides || {},
        yAxisLabels: initialConfig?.yAxisLabels || defaultConfig.yAxisLabels || { left: '', right: '' },
        seriesColors: initialConfig?.seriesColors || defaultConfig.seriesColors || {},
        legendPosition: initialConfig?.legendPosition || defaultConfig.legendPosition || 'right',
        legendVisible: initialConfig?.legendVisible ?? defaultConfig.legendVisible ?? true,
        chartType: initialConfig?.chartType || defaultConfig.chartType || 'bar',
        yAxisRanges: initialConfig?.yAxisRanges || defaultConfig.yAxisRanges || { left: {}, right: {} },
        dataScope: initialConfig?.dataScope || defaultConfig.dataScope || 'displayed',
        columnDataTypes: initialConfig?.columnDataTypes || defaultConfig.columnDataTypes || {},
      });
    }
  }, [show, data, columns, initialConfig]);

  // データ型設定の変更時に利用可能な数値カラムを更新
  useEffect(() => {
    const newAvailableColumns = getNumericColumns(data, columns, config.columnDataTypes);
    setAvailableNumericColumns(newAvailableColumns);
  }, [data, columns, config.columnDataTypes]);

  // Y軸カラムの追加
  const handleAddYAxisColumn = (column: string) => {
    if (!config.yAxisColumns.includes(column)) {
      const newYAxisColumns = [...config.yAxisColumns, column];
      const newYAxisSides = { ...config.yAxisSides, [column]: 'left' as YAxisSide };
      const newSeriesColors = { ...config.seriesColors, ...assignColors([column]) };
      
      // 最初のY軸カラムの場合、Y軸ラベル（左）を自動設定
      const updateLabels = config.yAxisColumns.length === 0 && !config.yAxisLabels.left;
      
      setConfig(prev => ({
        ...prev,
        yAxisColumns: newYAxisColumns,
        yAxisSides: newYAxisSides,
        seriesColors: newSeriesColors,
        yAxisLabels: updateLabels 
          ? { ...prev.yAxisLabels, left: column }
          : prev.yAxisLabels,
      }));
    }
  };

  // Y軸カラムの削除
  const handleRemoveYAxisColumn = (column: string) => {
    const newYAxisColumns = config.yAxisColumns.filter(col => col !== column);
    const newYAxisSides = { ...config.yAxisSides };
    delete newYAxisSides[column];
    const newSeriesColors = { ...config.seriesColors };
    delete newSeriesColors[column];
    
    setConfig(prev => ({
      ...prev,
      yAxisColumns: newYAxisColumns,
      yAxisSides: newYAxisSides,
      seriesColors: newSeriesColors,
    }));
  };

  // Y軸配置の変更
  const handleYAxisSideChange = (column: string, side: YAxisSide) => {
    setConfig(prev => ({
      ...prev,
      yAxisSides: { ...prev.yAxisSides, [column]: side },
    }));
  };

  // カラーの変更
  const handleColorChange = (column: string, color: string) => {
    setConfig(prev => ({
      ...prev,
      seriesColors: { ...prev.seriesColors, [column]: color },
    }));
  };

  // 適用ボタンのハンドラ
  const handleApply = () => {
    if (config.xAxisColumn && config.yAxisColumns.length > 0) {
      onApply(config);
      onHide();
    }
  };

  // バリデーション
  const isValid = config.xAxisColumn && config.yAxisColumns.length > 0;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faChartBar} className="me-2" />
          グラフ設定
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* セクション1: グラフタイプ */}
        <Card className="mb-3">
          <Card.Header><strong>グラフタイプ</strong></Card.Header>
          <Card.Body>
            <Form.Group className="mb-0">
              <Form.Select
                value={config.chartType}
                onChange={(e) => setConfig(prev => ({ ...prev, chartType: e.target.value as ChartType }))}
              >
                <option value="scatter">散布図</option>
                <option value="bar">縦棒グラフ</option>
                <option value="horizontalBar">横棒グラフ</option>
                <option value="combo">組み合わせ（棒+線）</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* セクション1.5: データ範囲設定 */}
        <Card className="mb-3">
          <Card.Header><strong>データ範囲</strong></Card.Header>
          <Card.Body>
            <Form.Group className="mb-0">
              <Form.Label>グラフ化するデータ範囲</Form.Label>
              <div className="mt-2">
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
                  label="すべてのデータ（読み込み可能な全件）"
                  checked={config.dataScope === 'all'}
                  onChange={() => setConfig(prev => ({ ...prev, dataScope: 'all' as DataScope }))}
                />
              </div>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* セクション2: X軸設定 */}
        <Card className="mb-3">
          <Card.Header><strong>X軸</strong></Card.Header>
          <Card.Body>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Row>
                    <Col md={6}>
                      <Form.Label>X軸カラム</Form.Label>
                      <Form.Select
                        value={config.xAxisColumn}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          xAxisColumn: e.target.value,
                          xAxisLabel: e.target.value || prev.xAxisLabel // カラム選択時にラベルも自動設定
                        }))}
                      >
                        <option value="">選択してください</option>
                        {xAxisColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </Form.Select>
                    </Col>
                    {config.xAxisColumn && (
                      <Col md={6}>
                        <Form.Label>データ型</Form.Label>
                        <Form.Select
                          value={config.columnDataTypes[config.xAxisColumn] || getColumnDataType(data, config.xAxisColumn)}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            columnDataTypes: {
                              ...prev.columnDataTypes,
                              [config.xAxisColumn]: e.target.value as ColumnDataType
                            }
                          }))}
                        >
                          <option value="number">数値</option>
                          <option value="date">日付</option>
                          <option value="string">文字列</option>
                        </Form.Select>
                      </Col>
                    )}
                  </Row>
                  <Row className="mt-2">
                    <Col md={6}>
                      <Form.Label>X軸ラベル</Form.Label>
                      <Form.Control
                        type="text"
                        value={config.xAxisLabel}
                        onChange={(e) => setConfig(prev => ({ ...prev, xAxisLabel: e.target.value }))}
                        placeholder="X軸のラベル"
                      />
                    </Col>
                  </Row>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* セクション3: Y軸設定 */}
        <Card className="mb-3">
          <Card.Header><strong>Y軸</strong></Card.Header>
          <Card.Body>

            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Y軸カラムを追加</Form.Label>
                  <Form.Select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddYAxisColumn(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">カラムを選択</option>
                    {availableNumericColumns
                      .filter(col => !config.yAxisColumns.includes(col))
                      .map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))
                    }
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* 選択済みY軸カラム */}
            <div>
              <Form.Label>選択済みY軸カラム</Form.Label>
              {config.yAxisColumns.length === 0 ? (
                <p className="text-muted">カラムが選択されていません</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {config.yAxisColumns.map(col => (
                    <div key={col} className="border rounded p-3">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        {/* カラム名 */}
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold fs-6">{col}</span>

                        </div>
                        
                        {/* 設定項目を横並び */}
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                          {/* データ型 */}
                          <div style={{ minWidth: '120px' }}>
                            <Form.Label className="small mb-1">データ型</Form.Label>
                            <Form.Select
                              size="sm"
                              value={config.columnDataTypes[col] || getColumnDataType(data, col)}
                              onChange={(e) => setConfig(prev => ({
                                ...prev,
                                columnDataTypes: {
                                  ...prev.columnDataTypes,
                                  [col]: e.target.value as ColumnDataType
                                }
                              }))}
                            >
                              <option value="number">数値</option>
                              <option value="date">日付</option>
                              <option value="string">文字列</option>
                            </Form.Select>
                          </div>
                          
                          {/* 軸配置 */}
                          <div style={{ minWidth: '100px' }}>
                            <Form.Label className="small mb-1">軸配置</Form.Label>
                            <Form.Select
                              size="sm"
                              value={config.yAxisSides[col] || 'left'}
                              onChange={(e) => handleYAxisSideChange(col, e.target.value as YAxisSide)}
                            >
                              <option value="left">左軸</option>
                              <option value="right">右軸</option>
                            </Form.Select>
                          </div>
                          
                          {/* カラー */}
                          <div style={{ minWidth: '120px' }}>
                            <Form.Label className="small mb-1">カラー</Form.Label>
                            <Form.Select
                              size="sm"
                              value={config.seriesColors[col] || EXCEL_COLOR_PALETTE[0].value}
                              onChange={(e) => handleColorChange(col, e.target.value)}
                            >
                              {EXCEL_COLOR_PALETTE.map((colorInfo) => (
                                <option key={colorInfo.value} value={colorInfo.value}>
                                  {colorInfo.name}
                                </option>
                              ))}
                            </Form.Select>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveYAxisColumn(col)}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Row className="mb-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Y軸ラベル（左）</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.yAxisLabels.left}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      yAxisLabels: { ...prev.yAxisLabels, left: e.target.value }
                    }))}
                    placeholder="左Y軸のラベル"
                  />
                </Form.Group>
              </Col>
              {/* 右軸を使用している場合のみ右軸ラベルを表示 */}
              {Object.values(config.yAxisSides).includes('right') && (
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Y軸ラベル（右）</Form.Label>
                    <Form.Control
                      type="text"
                      value={config.yAxisLabels.right}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        yAxisLabels: { ...prev.yAxisLabels, right: e.target.value }
                      }))}
                      placeholder="右Y軸のラベル"
                    />
                  </Form.Group>
                </Col>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Y軸範囲（左軸）</Form.Label>
                  <Row>
                    <Col xs={6}>
                      <Form.Control
                        type="number"
                        size="sm"
                        value={config.yAxisRanges?.left?.min || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          yAxisRanges: {
                            ...prev.yAxisRanges,
                            left: {
                              ...prev.yAxisRanges?.left,
                              min: e.target.value ? Number(e.target.value) : undefined
                            }
                          }
                        }))}
                        placeholder="最小値"
                      />
                    </Col>
                    <Col xs={6}>
                      <Form.Control
                        type="number"
                        size="sm"
                        value={config.yAxisRanges?.left?.max || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          yAxisRanges: {
                            ...prev.yAxisRanges,
                            left: {
                              ...prev.yAxisRanges?.left,
                              max: e.target.value ? Number(e.target.value) : undefined
                            }
                          }
                        }))}
                        placeholder="最大値"
                      />
                    </Col>
                  </Row>
                </Form.Group>
              </Col>
              {Object.values(config.yAxisSides).includes('right') && (
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Y軸範囲（右軸）</Form.Label>
                    <Row>
                      <Col xs={6}>
                        <Form.Control
                          type="number"
                          size="sm"
                          value={config.yAxisRanges?.right?.min || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            yAxisRanges: {
                              ...prev.yAxisRanges,
                              right: {
                                ...prev.yAxisRanges?.right,
                                min: e.target.value ? Number(e.target.value) : undefined
                              }
                            }
                          }))}
                          placeholder="最小値"
                        />
                      </Col>
                      <Col xs={6}>
                        <Form.Control
                          type="number"
                          size="sm"
                          value={config.yAxisRanges?.right?.max || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            yAxisRanges: {
                              ...prev.yAxisRanges,
                              right: {
                                ...prev.yAxisRanges?.right,
                                max: e.target.value ? Number(e.target.value) : undefined
                              }
                            }
                          }))}
                          placeholder="最大値"
                        />
                      </Col>
                    </Row>
                  </Form.Group>
                </Col>
              )}
            </Row>
            

          </Card.Body>
        </Card>

        {/* セクション4: 凡例設定 */}
        <Card className="mb-3">
          <Card.Header><strong>凡例</strong></Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="legend-visible"
                    label="凡例を表示"
                    checked={config.legendVisible}
                    onChange={(e) => setConfig(prev => ({ ...prev, legendVisible: e.target.checked }))}
                  />
                </Form.Group>
              </Col>
              {config.legendVisible && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>凡例位置</Form.Label>
                    <Form.Select
                      value={config.legendPosition}
                      onChange={(e) => setConfig(prev => ({ ...prev, legendPosition: e.target.value as LegendPosition }))}
                    >
                      <option value="top">上</option>
                      <option value="bottom">下</option>
                      <option value="left">左</option>
                      <option value="right">右</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
            </Row>
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