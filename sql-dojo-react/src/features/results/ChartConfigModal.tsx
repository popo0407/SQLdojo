import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import type { 
  SimpleChartConfig, 
  ChartType, 
  DataType,
  ColumnConfig,
  LegendPosition,
  OutputMethod
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
        dataScope: 'all', // 常にすべてのデータを使用
        yColumnConfigs: initialConfig.yColumnConfigs || [],
        colors: initialConfig.colors || {},
        yAxisRange: initialConfig.yAxisRange || {},
        // Y軸ラベルを最初のY軸カラム名に設定（既存のラベルがない場合）
        yAxisLabel: initialConfig.yAxisLabel || (initialConfig.yColumns && initialConfig.yColumns[0]) || defaultConfig.yAxisLabel,
      };
    } else {
      const smartConfig = createSmartChartConfig(data, columns);
      return {
        ...smartConfig,
        dataScope: 'all', // 常にすべてのデータを使用
        // Y軸ラベルを最初のY軸カラム名に設定
        yAxisLabel: smartConfig.yColumns[0] || smartConfig.yAxisLabel,
      };
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
          dataScope: 'all', // 常にすべてのデータを使用
          yColumnConfigs: initialConfig.yColumnConfigs || [],
          colors: initialConfig.colors || assignColors(initialConfig.yColumns || []),
          yAxisRange: initialConfig.yAxisRange || {},
          // Y軸ラベルを最初のY軸カラム名に設定（既存のラベルがない場合）
          yAxisLabel: initialConfig.yAxisLabel || (initialConfig.yColumns && initialConfig.yColumns[0]) || defaultConfig.yAxisLabel,
        });
      } else {
        const smartConfig = createSmartChartConfig(data, columns);
        setConfig({
          ...smartConfig,
          dataScope: 'all', // 常にすべてのデータを使用
          // Y軸ラベルを最初のY軸カラム名に設定
          yAxisLabel: smartConfig.yColumns[0] || smartConfig.yAxisLabel,
        });
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
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header>
        <Modal.Title>
          <FontAwesomeIcon icon={faChartBar} className="me-2" />
          グラフ設定
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          {/* 左側：グラフ全体設定 */}
          <Col md={6}>
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



            {/* 任意設定項目 */}
            <Card className="mb-3">
              <Card.Header><strong>任意設定項目</strong></Card.Header>
              <Card.Body>
                {/* グラフタイトル */}
                <Form.Group className="mb-3">
                  <Form.Label>グラフタイトル</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="グラフのタイトル（省略可）"
                  />
                </Form.Group>

                {/* グラフサイズ */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>幅 (px)</Form.Label>
                      <Form.Control
                        type="number"
                        value={config.chartSize?.width || ''}
                        onChange={(e) => {
                          const width = e.target.value === '' ? undefined : parseInt(e.target.value);
                          setConfig(prev => ({
                            ...prev,
                            chartSize: {
                              ...prev.chartSize,
                              width
                            }
                          }));
                        }}
                        placeholder="800"
                        min="200"
                        max="2000"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>高さ (px)</Form.Label>
                      <Form.Control
                        type="number"
                        value={config.chartSize?.height || ''}
                        onChange={(e) => {
                          const height = e.target.value === '' ? undefined : parseInt(e.target.value);
                          setConfig(prev => ({
                            ...prev,
                            chartSize: {
                              ...prev.chartSize,
                              height
                            }
                          }));
                        }}
                        placeholder="400"
                        min="200"
                        max="1000"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* 凡例位置 */}
                <Form.Group className="mb-3">
                  <Form.Label>凡例位置</Form.Label>
                  <Form.Select
                    value={config.legendPosition || 'top'}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      legendPosition: e.target.value as LegendPosition 
                    }))}
                  >
                    <option value="top">上</option>
                    <option value="bottom">下</option>
                    <option value="left">左</option>
                    <option value="right">右</option>
                  </Form.Select>
                </Form.Group>

                {/* Y軸範囲設定 */}
                <Form.Group>
                  <Form.Label>Y軸範囲設定</Form.Label>
                  <Row>
                    <Col md={6}>
                      <Form.Label className="small">最小値</Form.Label>
                      <Form.Control
                        type="number"
                        placeholder={autoRange ? `自動設定` : "自動設定"}
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
                        placeholder={autoRange ? `自動設定` : "自動設定"}
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
                </Form.Group>

                {/* 出力方法設定 */}
                <Form.Group className="mb-3">
                  <Form.Label>出力方法</Form.Label>
                  <Form.Select
                    value={config.outputMethod || 'browser'}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      outputMethod: e.target.value as OutputMethod 
                    }))}
                  >
                    <option value="browser">ブラウザ</option>
                    <option value="excel">Excel</option>
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>

          {/* 右側：X軸・Y軸設定 */}
          <Col md={6}>

            {/* X軸設定 */}
            <Card className="mb-3">
              <Card.Header><strong>X軸</strong></Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>カラム</Form.Label>
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
                        <option value="">選択</option>
                        {columns.map(col => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
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
                </Row>
                <Form.Group>
                  <Form.Label>ラベル</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.xAxisLabel}
                    onChange={(e) => setConfig(prev => ({ ...prev, xAxisLabel: e.target.value }))}
                    placeholder="X軸のラベル"
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Y軸設定 */}
            <Card className="mb-3">
              <Card.Header><strong>Y軸</strong></Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>カラム</Form.Label>
                      <Form.Select
                        value={config.yColumns[0] || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            // 既存のY軸カラムをクリアして新しいものを設定
                            const selectedColumn = e.target.value;
                            const detectedType = detectedTypes[selectedColumn] || 'number';
                            const color = EXCEL_COLORS[0];
                            
                            const newColumnConfig: ColumnConfig = {
                              name: selectedColumn,
                              dataType: detectedType,
                              color: color,
                            };
                            
                            setConfig(prev => ({
                              ...prev,
                              yColumns: [selectedColumn],
                              yColumnConfigs: [newColumnConfig],
                              colors: { [selectedColumn]: color },
                              // Y軸カラムが選択された時にY軸ラベルを自動設定
                              yAxisLabel: selectedColumn
                            }));
                          }
                        }}
                      >
                        <option value="">選択</option>
                        {numericColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>データ型</Form.Label>
                      <Form.Select
                        value={config.yColumnConfigs[0]?.dataType || 'number'}
                        onChange={(e) => {
                          if (config.yColumns[0]) {
                            handleDataTypeChange(config.yColumns[0], e.target.value as DataType);
                          }
                        }}
                        disabled={!config.yColumns[0]}
                      >
                        <option value="number">数値</option>
                        <option value="date">日付</option>
                        <option value="datetime">日時</option>
                        <option value="string">文字列</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>色設定</Form.Label>
                      <div className="d-flex align-items-center">
                        <span 
                          className="me-2 d-inline-block border rounded" 
                          style={{
                            width: '30px',
                            height: '30px',
                            backgroundColor: config.yColumnConfigs[0]?.color || EXCEL_COLORS[0],
                          }}
                        ></span>
                        <Form.Select
                          value={config.yColumnConfigs[0]?.color || EXCEL_COLORS[0]}
                          onChange={(e) => {
                            if (config.yColumns[0]) {
                              handleColorChange(config.yColumns[0], e.target.value);
                            }
                          }}
                          disabled={!config.yColumns[0]}
                        >
                          {EXCEL_COLORS.map((color) => (
                            <option key={color} value={color}>
                              {COLOR_NAMES[color as keyof typeof COLOR_NAMES] || color}
                            </option>
                          ))}
                        </Form.Select>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      // 追加できる数値カラムがあるかチェック
                      const availableColumns = numericColumns.filter(col => !config.yColumns.includes(col));
                      if (availableColumns.length > 0) {
                        handleAddYColumn(availableColumns[0]);
                      }
                    }}
                    disabled={numericColumns.filter(col => !config.yColumns.includes(col)).length === 0}
                  >
                    カラムを追加
                  </Button>
                </Form.Group>

                <Form.Group>
                  <Form.Label>ラベル</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.yAxisLabel}
                    onChange={(e) => setConfig(prev => ({ ...prev, yAxisLabel: e.target.value }))}
                    placeholder="Y軸のラベル"
                  />
                </Form.Group>
              </Card.Body>
            </Card>

          </Col>
        </Row>
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
