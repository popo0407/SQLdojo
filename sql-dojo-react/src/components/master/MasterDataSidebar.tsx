import React, { useState, useEffect } from 'react';
import { Button, Table } from 'react-bootstrap';
import { useSidebarMasterDataStore } from '../../stores/useSidebarMasterDataStore';
import { useTabPageStore } from '../../stores/useTabPageStore';
import { useTabStore } from '../../stores/useTabStore';
import styles from '../../styles/MasterDataSidebar.module.css';
import type { MeasureMaster, SetMaster, FreeMaster, PartsMaster, TroubleMaster } from '../../types/masterData';

// interface MasterDataSidebarProps {
//   // Props interface kept for future use
// }

type MasterType = 'MEASURE' | 'SET' | 'FREE' | 'PARTS' | 'TROUBLE';

interface StepData {
  step: number;
  data: Record<string, string>[];
  selectedItems: string[];
}

const MasterDataSidebar: React.FC = () => {
  const { activeTabId, createTab } = useTabStore();
  const { insertTextToTab, formatTabSql } = useTabPageStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepHistory, setStepHistory] = useState<StepData[]>([]);
  const [selectedStation, setSelectedStation] = useState<{
    sta_no1: string;
    place_name: string;
    sta_no2?: string;
    line_name?: string;
    sta_no3?: string;
    st_name?: string;
  } | null>(null);
  const [activeMasterType, setActiveMasterType] = useState<MasterType>('MEASURE');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const {
    stationMaster,
    measureMaster,
    setMaster,
    freeMaster,
    partsMaster,
    troubleMaster,
    loading,
    error,
    fetchAllMasterData,
    fetchMasterDataForStation,
    setSelectedStation: setStoreSelectedStation
  } = useSidebarMasterDataStore();

  useEffect(() => {
    fetchAllMasterData();
  }, [fetchAllMasterData]);

  // 注意: サイズ変更は Sidebar コンポーネントの handleTabChange で行う
  // useEffect(() => {
  //   // マスター情報表示時は幅を1000pxに設定
  //   console.log('MasterDataSidebar - useEffect setting width to 1000');
  //   onWidthChange(1000);
  //   return () => {
  //     // クリーンアップ時は元の幅に戻す
  //     console.log('MasterDataSidebar - cleanup setting width to 400');
  //     onWidthChange(400);
  //   };
  // }, [onWidthChange]);

  // ステップ1: 重複を除去したSTA_NO1, PLACE_NAMEの表
  const getStep1Data = () => {
    if (!stationMaster || !Array.isArray(stationMaster)) {
      return [];
    }
    const uniqueStations = new Map();
    stationMaster.forEach(station => {
      const key = `${station.sta_no1}_${station.place_name}`;
      if (!uniqueStations.has(key)) {
        uniqueStations.set(key, {
          sta_no1: station.sta_no1,
          place_name: station.place_name
        });
      }
    });
    return Array.from(uniqueStations.values());
  };

  // ステップ2: 選択されたSTA_NO1/PLACE_NAMEで絞り込み、STA_NO2の1桁目を追加
  const getStep2Data = () => {
    if (!selectedStation || !stationMaster || !Array.isArray(stationMaster)) return [];
    
    const filtered = stationMaster.filter(station => 
      station.sta_no1 === selectedStation.sta_no1 && 
      station.place_name === selectedStation.place_name
    );
    
    const uniqueStations = new Map();
    filtered.forEach(station => {
      const sta_no2_first = station.sta_no2.substring(0, 1);
      const key = `${station.sta_no1}_${station.place_name}_${sta_no2_first}`;
      if (!uniqueStations.has(key)) {
        uniqueStations.set(key, {
          sta_no1: station.sta_no1,
          place_name: station.place_name,
          sta_no2_first: sta_no2_first
        });
      }
    });
    return Array.from(uniqueStations.values());
  };

  // ステップ3: STA_NO2, LINE_NAMEを追加
  const getStep3Data = () => {
    if (!selectedStation || !selectedStation.sta_no2 || !stationMaster || !Array.isArray(stationMaster)) return [];
    
    const filtered = stationMaster.filter(station => 
      station.sta_no1 === selectedStation.sta_no1 && 
      station.place_name === selectedStation.place_name &&
      station.sta_no2.startsWith(selectedStation.sta_no2!)
    );
    
    const uniqueStations = new Map();
    filtered.forEach(station => {
      const key = `${station.sta_no1}_${station.place_name}_${station.sta_no2}_${station.line_name}`;
      if (!uniqueStations.has(key)) {
        uniqueStations.set(key, {
          sta_no1: station.sta_no1,
          place_name: station.place_name,
          sta_no2: station.sta_no2,
          line_name: station.line_name
        });
      }
    });
    return Array.from(uniqueStations.values());
  };

  // ステップ4: STA_NO3, ST_NAMEを追加
  const getStep4Data = () => {
    if (!selectedStation || !selectedStation.sta_no2 || !selectedStation.line_name || !stationMaster || !Array.isArray(stationMaster)) return [];
    
    const filtered = stationMaster.filter(station => 
      station.sta_no1 === selectedStation.sta_no1 && 
      station.place_name === selectedStation.place_name &&
      station.sta_no2 === selectedStation.sta_no2 &&
      station.line_name === selectedStation.line_name
    );
    
    const uniqueStations = new Map();
    filtered.forEach(station => {
      const key = `${station.sta_no1}_${station.place_name}_${station.sta_no2}_${station.line_name}_${station.sta_no3}_${station.st_name}`;
      if (!uniqueStations.has(key)) {
        uniqueStations.set(key, {
          sta_no1: station.sta_no1,
          place_name: station.place_name,
          sta_no2: station.sta_no2,
          line_name: station.line_name,
          sta_no3: station.sta_no3,
          st_name: station.st_name
        });
      }
    });
    return Array.from(uniqueStations.values());
  };

  // 現在のステップのデータを取得
  const getCurrentStepData = () => {
    switch (currentStep) {
      case 1: return getStep1Data();
      case 2: return getStep2Data();
      case 3: return getStep3Data();
      case 4: return getStep4Data();
      default: return [];
    }
  };

  // マスタータイプ別のデータを取得
  const getMasterTypeData = (type: MasterType) => {
    // APIでステーション別にフィルタリング済みなので、取得したデータをそのまま返す
    switch (type) {
      case 'MEASURE': 
        return Array.isArray(measureMaster) ? measureMaster : [];
      case 'SET': 
        return Array.isArray(setMaster) ? setMaster : [];
      case 'FREE': 
        return Array.isArray(freeMaster) ? freeMaster : [];
      case 'PARTS': 
        return Array.isArray(partsMaster) ? partsMaster : [];
      case 'TROUBLE': 
        return Array.isArray(troubleMaster) ? troubleMaster : [];
      default: 
        return [];
    }
  };

  // 行選択ハンドラー
  const handleRowSelect = (item: Record<string, string>, step: number) => {
    // 現在のステップのデータを履歴に保存
    setStepHistory(prev => [
      ...prev.filter(h => h.step < step),
      {
        step: currentStep,
        data: getCurrentStepData(),
        selectedItems: selectedStation ? [JSON.stringify(selectedStation)] : []
      }
    ]);

    if (step === 1) {
      const newStation = {
        sta_no1: item.sta_no1,
        place_name: item.place_name
      };
      setSelectedStation(newStation);
      setStoreSelectedStation(newStation);
      setCurrentStep(2);
    } else if (step === 2) {
      setSelectedStation(prev => {
        const newStation = {
          ...prev!,
          sta_no2: item.sta_no2_first
        };
        setStoreSelectedStation(newStation);
        return newStation;
      });
      setCurrentStep(3);
    } else if (step === 3) {
      setSelectedStation(prev => {
        const newStation = {
          ...prev!,
          sta_no2: item.sta_no2,
          line_name: item.line_name
        };
        setStoreSelectedStation(newStation);
        return newStation;
      });
      setCurrentStep(4);
    } else if (step === 4) {
      setSelectedStation(prev => {
        const newSelectedStation = {
          ...prev!,
          sta_no3: item.sta_no3,
          st_name: item.st_name
        };
        
        // ストアの状態も更新
        setStoreSelectedStation(newSelectedStation);
        
        // ステーション選択完了時に、そのステーションの専用マスターデータを取得
        if (newSelectedStation.sta_no1 && newSelectedStation.sta_no2 && newSelectedStation.sta_no3) {
          fetchMasterDataForStation(
            newSelectedStation.sta_no1,
            newSelectedStation.sta_no2,
            newSelectedStation.sta_no3
          );
        }
        
        return newSelectedStation;
      });
      setCurrentStep(5);
    }
  };

  // 戻るボタンハンドラー
  const handleGoBack = () => {
    if (currentStep > 1) {
      const prevStep = stepHistory[stepHistory.length - 1];
      if (prevStep) {
        setCurrentStep(prevStep.step);
        setStepHistory(prev => prev.slice(0, -1));
        
        // selectedStationを前のステップに戻す
        if (prevStep.step === 1) {
          setSelectedStation(null);
          setStoreSelectedStation(null);
        } else if (prevStep.step === 2) {
          setSelectedStation(prev => {
            const resetStation = {
              sta_no1: prev!.sta_no1,
              place_name: prev!.place_name
            };
            setStoreSelectedStation(resetStation);
            return resetStation;
          });
        } else if (prevStep.step === 3) {
          setSelectedStation(prev => {
            const resetStation = {
              sta_no1: prev!.sta_no1,
              place_name: prev!.place_name,
              sta_no2: prev!.sta_no2
            };
            setStoreSelectedStation(resetStation);
            return resetStation;
          });
        }
      }
    }
  };

  // 最初に戻るボタンハンドラー
  const handleGoToStart = () => {
    setCurrentStep(1);
    setSelectedStation(null);
    setStoreSelectedStation(null);
    setStepHistory([]);
    setCheckedItems(new Set());
  };

  // チェックボックス変更ハンドラー
  const handleCheckboxChange = (index: number) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(index)) {
      newCheckedItems.delete(index);
    } else {
      newCheckedItems.add(index);
    }
    setCheckedItems(newCheckedItems);
  };

  // エディタに反映ハンドラー
  const handleApplyToEditor = () => {
    console.log('Debug - activeTabId:', activeTabId);
    console.log('Debug - selectedStation:', selectedStation);
    console.log('Debug - checkedItems:', checkedItems);
    
    if (!activeTabId) {
      // アクティブなタブがない場合、新しいタブを作成
      createTab();
      // 少し待ってから再試行（状態更新を待つ）
      setTimeout(() => {
        handleApplyToEditor();
      }, 100);
      return;
    }
    
    if (!selectedStation) {
      alert('選択されたステーションがありません。');
      return;
    }

    const checkedData = Array.from(checkedItems).map(index => 
      getMasterTypeData(activeMasterType)[index]
    );

    if (checkedData.length === 0) {
      alert('チェックされたアイテムがありません。');
      return;
    }

    let sql = '';
    const { sta_no1, sta_no2, sta_no3 } = selectedStation;

    switch (activeMasterType) {
      case 'MEASURE': {
        const measureColumns = (checkedData as MeasureMaster[]).map(item => 
          `CASE WHEN STEP =${item.step} THEN ${item.measure}/${item.division_figure} ELSE null END AS "${item.item_name}(${item.measure_info})"`
        ).join(',');
        sql = `SELECT TO_TIMESTAMP(MK_DATE, 'YYYYMMDDHH24MISS') AS MK_DATE,M_SERIAL,OPEFIN_RESULT,${measureColumns} FROM HF1RGM01 WHERE STA_NO1 = '${sta_no1}' AND STA_NO2 = '${sta_no2}' AND STA_NO3 = '${sta_no3}' AND MK_DATE >= '{開始日YYYYMMDD}000000' AND MK_DATE <= '{終了日YYYYMMDD}235959'`;
        break;
      }
      case 'SET': {
        const setColumns = (checkedData as SetMaster[]).map(item => 
          `CASE WHEN STEP =${item.step} THEN ${item.setdata} ELSE null END AS "${item.item_name}"`
        ).join(',');
        sql = `SELECT TO_TIMESTAMP(MK_DATE, 'YYYYMMDDHH24MISS') AS MK_DATE,M_SERIAL,OPEFIN_RESULT,${setColumns} FROM HF1RGM01 WHERE STA_NO1 = '${sta_no1}' AND STA_NO2 = '${sta_no2}' AND STA_NO3 = '${sta_no3}' AND MK_DATE >= '{開始日YYYYMMDD}000000' AND MK_DATE <= '{終了日YYYYMMDD}235959'`;
        break;
      }
      case 'FREE': {
        const freeColumns = (checkedData as FreeMaster[]).map(item => 
          `CASE WHEN STEP =${item.step} THEN ${item.freedata} ELSE null END AS "${item.item_name}"`
        ).join(',');
        sql = `SELECT TO_TIMESTAMP(MK_DATE, 'YYYYMMDDHH24MISS') AS MK_DATE,M_SERIAL,OPEFIN_RESULT,${freeColumns} FROM HF1RGM01 WHERE STA_NO1 = '${sta_no1}' AND STA_NO2 = '${sta_no2}' AND STA_NO3 = '${sta_no3}' AND MK_DATE >= '{開始日YYYYMMDD}000000' AND MK_DATE <= '{終了日YYYYMMDD}235959'`;
        break;
      }
      case 'PARTS': {
        const partsColumns = (checkedData as PartsMaster[]).map(item => 
          `${item.sub_parts} AS "${item.sub_parts_name}"`
        ).join(',');
        const mainPartsName = (checkedData as PartsMaster[])[0]?.main_parts_name || '';
        sql = `SELECT TO_TIMESTAMP(MK_DATE, 'YYYYMMDDHH24MISS') AS MK_DATE,M_SERIAL,OPEFIN_RESULT,'${mainPartsName}' AS MAIN_PARTS_NAME,${partsColumns} FROM HF1REM01 WHERE STA_NO1 = '${sta_no1}' AND STA_NO2 = '${sta_no2}' AND STA_NO3 = '${sta_no3}' AND MK_DATE >= '{開始日YYYYMMDD}000000' AND MK_DATE <= '{終了日YYYYMMDD}235959'`;
        break;
      }
      case 'TROUBLE': {
        const codeNos = (checkedData as TroubleMaster[]).map(item => `'${item.code_no}'`).join(',');
        const troubleCases = (checkedData as TroubleMaster[]).map(item => 
          `WHEN CODE_NO ='${item.code_no}' THEN ${item.trouble_ng_info}`
        ).join(' ');
        sql = `SELECT TO_TIMESTAMP(MK_DATE, 'YYYYMMDDHH24MISS') AS MK_DATE,M_SERIAL,CODE_NO,CASE ${troubleCases} ELSE null END AS "TROUBLE_NG_INFO" FROM HF1RFM01 WHERE STA_NO1 = '${sta_no1}' AND STA_NO2 = '${sta_no2}' AND STA_NO3 = '${sta_no3}' AND MK_DATE >= '{開始日YYYYMMDD}000000' AND MK_DATE <= '{終了日YYYYMMDD}235959' AND CODE_NO in(${codeNos})`;
        break;
      }
    }

    insertTextToTab(activeTabId, sql);
    
    // フォーマットを適用
    setTimeout(() => {
      formatTabSql(activeTabId);
    }, 100);
  };

  if (loading) {
    return (
      <div className="text-center p-3">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
        <div className="mt-2">マスターデータ読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-3">
        <div className="alert alert-danger">
          <h6>エラーが発生しました</h6>
          <p className="mb-2">{error}</p>
          <Button variant="outline-danger" size="sm" onClick={fetchAllMasterData}>
            再試行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.masterDataSidebar}>
      {/* ナビゲーションボタン */}
      <div className={styles.masterNavigationButtons}>
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={handleGoBack}
          disabled={currentStep === 1}
          className="me-2"
        >
          1つ戻る
        </Button>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={handleGoToStart}
          disabled={currentStep === 1}
        >
          最初に戻る
        </Button>
      </div>

      {/* エディタに反映ボタン */}
      <Button 
        onClick={handleApplyToEditor} 
        className="mb-3"
        variant="primary"
        disabled={currentStep !== 5 || checkedItems.size === 0}
      >
        エディタに反映
      </Button>

      {/* ステップ1-4: ステーション選択 */}
      {currentStep < 5 && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h6>ステップ {currentStep}: ステーション選択</h6>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                {currentStep >= 1 && <th>STA_NO1</th>}
                {currentStep >= 1 && <th>PLACE_NAME</th>}
                {currentStep === 2 && <th>STA_NO2 (1桁目)</th>}
                {currentStep >= 3 && <th>STA_NO2</th>}
                {currentStep >= 3 && <th>LINE_NAME</th>}
                {currentStep >= 4 && <th>STA_NO3</th>}
                {currentStep >= 4 && <th>ST_NAME</th>}
              </tr>
            </thead>
            <tbody>
              {getCurrentStepData().map((item, index) => (
                <tr 
                  key={index} 
                  onClick={() => handleRowSelect(item, currentStep)}
                  style={{ cursor: 'pointer' }}
                  className={styles.tableRowHover}
                >
                  <td>{item.sta_no1}</td>
                  <td>{item.place_name}</td>
                  {currentStep === 2 && <td>{item.sta_no2_first}</td>}
                  {currentStep >= 3 && <td>{item.sta_no2}</td>}
                  {currentStep >= 3 && <td>{item.line_name}</td>}
                  {currentStep >= 4 && <td>{item.sta_no3}</td>}
                  {currentStep >= 4 && <td>{item.st_name}</td>}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* ステップ5: マスタータイプ選択とデータ表示 */}
      {currentStep === 5 && selectedStation && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* 選択されたステーション情報 */}
          <div className="mb-3 p-2 bg-light border rounded">
            <strong>選択されたステーション:</strong><br/>
            {selectedStation.sta_no1} - {selectedStation.place_name} - {selectedStation.sta_no2} - {selectedStation.line_name} - {selectedStation.sta_no3} - {selectedStation.st_name}
          </div>

          {/* マスタータイプタブ */}
          <div className="btn-group mb-3" role="group">
            {(['MEASURE', 'SET', 'FREE', 'PARTS', 'TROUBLE'] as MasterType[]).map(type => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm ${activeMasterType === type ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => {
                  setActiveMasterType(type);
                  setCheckedItems(new Set());
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* マスターデータテーブル */}
          <MasterDataTable 
            type={activeMasterType}
            data={getMasterTypeData(activeMasterType)}
            checkedItems={checkedItems}
            onCheckboxChange={handleCheckboxChange}
          />
        </div>
      )}
    </div>
  );
};

// マスターデータテーブルコンポーネント
interface MasterDataTableProps {
  type: MasterType;
  data: (MeasureMaster | SetMaster | FreeMaster | PartsMaster | TroubleMaster)[];
  checkedItems: Set<number>;
  onCheckboxChange: (index: number) => void;
}

const MasterDataTable: React.FC<MasterDataTableProps> = ({ type, data, checkedItems, onCheckboxChange }) => {
  const getColumns = () => {
    switch (type) {
      case 'MEASURE':
        return ['STEP', 'MEASURE', 'ITEM_NAME', 'DIVISION_FIGURE', 'MEASURE_INFO'];
      case 'SET':
        return ['STEP', 'SETDATA', 'ITEM_NAME'];
      case 'FREE':
        return ['STEP', 'FREEDATA', 'ITEM_NAME'];
      case 'PARTS':
        return ['MAIN_PARTS_NAME', 'SUB_PARTS', 'SUB_PARTS_NAME'];
      case 'TROUBLE':
        return ['CODE_NO', 'TROUBLE_NG_INFO'];
      default:
        return [];
    }
  };

  const columns = getColumns();

  if (data.length === 0) {
    return (
      <div className="text-center text-muted p-3">
        選択されたステーションに該当するデータがありません。
      </div>
    );
  }

  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col}>{col}</th>
          ))}
          <th>選択</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            {columns.map(col => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <td key={col}>{(item as any)[col.toLowerCase()]}</td>
            ))}
            <td>
              <input
                type="checkbox"
                checked={checkedItems.has(index)}
                onChange={() => onCheckboxChange(index)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default MasterDataSidebar;