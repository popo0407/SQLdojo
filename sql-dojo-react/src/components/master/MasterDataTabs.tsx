import React, { useEffect } from 'react';
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import type { StationInfo } from '../../api/masterDataService';
import './MasterDataTabs.css';

const MasterDataTabs: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    stations,
    selectedStation,
    masterData,
    selectedItems,
    sidebarWidth,
    isLoading,
    isUpdating,
    error,
    updateResult,
    loadStations,
    updateAllMasterData,
    selectStation,
    loadMasterDataByStation,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    generateSql,
    toggleSidebarWidth,
    clearError
  } = useMasterDataStore();

  // 初期化時にステーション一覧を読み込み
  useEffect(() => {
    loadStations();
  }, [loadStations]);

  // タブ定義
  const tabs = [
    { id: 'station', label: 'ステーション', count: stations.length },
    { id: 'measure', label: 'MEASURE', count: masterData.measure.length },
    { id: 'set', label: 'SET', count: masterData.set.length },
    { id: 'free', label: 'FREE', count: masterData.free.length },
    { id: 'parts', label: 'PARTS', count: masterData.parts.length },
    { id: 'trouble', label: 'TROUBLE', count: masterData.trouble.length }
  ];

  // ステーション選択時の処理
  const handleStationSelect = async (station: StationInfo) => {
    selectStation(station);
    
    // 全マスターデータタブのデータを読み込み
    const masterTypes = ['measure', 'set', 'free', 'parts', 'trouble'];
    for (const masterType of masterTypes) {
      await loadMasterDataByStation(masterType, station.sta_no1, '', '');
    }
  };

  // 選択アイテム数の取得
  const getSelectedCount = (masterType: string) => {
    return selectedItems[masterType as keyof typeof selectedItems]?.length || 0;
  };

  return (
    <div className="master-data-container">
      {/* ヘッダー部分 */}
      <div className="master-data-header">
        <div className="header-left">
          <h2>マスターデータ管理</h2>
          <button
            onClick={updateAllMasterData}
            disabled={isUpdating}
            className="update-button"
          >
            {isUpdating ? '更新中...' : 'マスターデータ更新'}
          </button>
          
          <button
            onClick={toggleSidebarWidth}
            className="width-toggle-button"
          >
            幅: {sidebarWidth}px
          </button>
        </div>

        {updateResult && (
          <div className="update-result">
            <span className="success-message">✓ {updateResult.message}</span>
            {updateResult.results && (
              <span className="update-counts">
                (合計: {Object.values(updateResult.results).reduce((a, b) => a + b, 0)}件)
              </span>
            )}
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
            <span className="tab-count">({tab.count})</span>
            {tab.id !== 'station' && getSelectedCount(tab.id) > 0 && (
              <span className="selected-count">[{getSelectedCount(tab.id)}選択]</span>
            )}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div 
        className="tab-content"
        style={{ width: `${sidebarWidth}px` }}
      >
        {isLoading && <div className="loading">読み込み中...</div>}

        {/* ステーションタブ */}
        {activeTab === 'station' && (
          <div className="station-tab">
            <h3>ステーション一覧</h3>
            <div className="station-list">
              {stations.map((station, index) => (
                <div
                  key={index}
                  onClick={() => handleStationSelect(station)}
                  className={`station-item ${selectedStation?.sta_no1 === station.sta_no1 ? 'selected' : ''}`}
                >
                  <div className="station-code">{station.sta_no1}</div>
                  <div className="station-name">{station.place_name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* マスターデータタブ */}
        {['measure', 'set', 'free', 'parts', 'trouble'].includes(activeTab) && (
          <div className="master-data-tab">
            <div className="tab-header">
              <h3>{tabs.find(t => t.id === activeTab)?.label}マスター</h3>
              
              {selectedStation && (
                <div className="selected-station-info">
                  選択中: {selectedStation.sta_no1} - {selectedStation.place_name}
                </div>
              )}

              <div className="tab-actions">
                <button
                  onClick={() => selectAllItems(activeTab)}
                  disabled={masterData[activeTab as keyof typeof masterData].length === 0}
                >
                  全選択
                </button>
                <button
                  onClick={() => clearSelection(activeTab)}
                  disabled={getSelectedCount(activeTab) === 0}
                >
                  選択解除
                </button>
                <button
                  onClick={() => generateSql(activeTab)}
                  disabled={getSelectedCount(activeTab) === 0}
                >
                  SQL生成
                </button>
              </div>
            </div>

            <div className="master-data-list">
              {masterData[activeTab as keyof typeof masterData].map((item, index) => {
                const isSelected = selectedItems[activeTab as keyof typeof selectedItems]
                  ?.some(selected => JSON.stringify(selected) === JSON.stringify(item));

                return (
                  <div
                    key={index}
                    onClick={() => toggleItemSelection(activeTab, item)}
                    className={`master-data-item ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // ハンドリングはonClickで行う
                    />
                    <div className="item-content">
                      {Object.entries(item).map(([key, value]) => (
                        <div key={key} className="item-field">
                          <span className="field-name">{key}:</span>
                          <span className="field-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {masterData[activeTab as keyof typeof masterData].length === 0 && (
              <div className="no-data">
                {selectedStation ? 'データがありません' : 'ステーションを選択してください'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterDataTabs;