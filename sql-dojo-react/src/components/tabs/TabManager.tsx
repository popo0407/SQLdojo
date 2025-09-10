import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Tab, Tabs, Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faEdit, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTabStore } from '../../stores/useTabStore';
import { useTabPageStore } from '../../stores/useTabPageStore';
import styles from './TabManager.module.css';

interface TabManagerProps {
  children: (activeTabId: string | null) => React.ReactNode;
}

export const TabManager: React.FC<TabManagerProps> = ({ children }) => {
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    setActiveTab,
    updateTabName,
    canCreateNewTab,
    hasExecutingTab,
  } = useTabStore();

  // SQL履歴からのタブ作成機能
  const { applySqlToTabFromNewTab } = useTabPageStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tempTabName, setTempTabName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // グローバルなSQL履歴監視（アプリ起動時とlocalStorageの変化）
  useEffect(() => {
    // 初回チェック
    applySqlToTabFromNewTab();

    // StorageEventでlocalStorageの変化を監視
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sqlToCopy' && event.newValue) {
        applySqlToTabFromNewTab();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [applySqlToTabFromNewTab]);

  // 新しいタブを作成
  const handleCreateTab = () => {
    if (canCreateNewTab()) {
      createTab();
    }
  };

  // タブを閉じる
  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // タブの選択を防ぐ
    closeTab(tabId);
  };

  // タブ名編集開始
  const handleStartEditTabName = (tabId: string, currentName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTabId(tabId);
    setTempTabName(currentName);
    // 次のレンダリング後にフォーカス
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  // タブ名編集完了
  const handleCompleteEditTabName = () => {
    if (editingTabId && tempTabName.trim()) {
      updateTabName(editingTabId, tempTabName.trim());
    }
    setEditingTabId(null);
    setTempTabName('');
  };

  // タブ名編集キャンセル
  const handleCancelEditTabName = () => {
    setEditingTabId(null);
    setTempTabName('');
  };

  // エンターキーで編集完了、ESCでキャンセル
  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCompleteEditTabName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEditTabName();
    }
  };

  const initializationRef = useRef(false);

  // タブが存在しない場合、最初のタブを作成（StrictMode対応）
  React.useEffect(() => {
    if (tabs.length === 0 && !initializationRef.current) {
      initializationRef.current = true;
      createTab();
    }
  }, [tabs.length, createTab]);

  return (
    <div className={styles.tabManagerContainer}>
      {/* タブヘッダー部分 */}
      <div className={styles.tabHeader}>
        <div className={styles.tabsContainer}>
          <Tabs
            activeKey={activeTabId || undefined}
            onSelect={(tabId) => {
              if (tabId) {
                setActiveTab(tabId);
              }
            }}
            className={styles.customTabs}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                eventKey={tab.id}
                title={
                  <div className={styles.tabTitle}>
                    {editingTabId === tab.id ? (
                      <InputGroup size="sm" className={styles.editInput}>
                        <Form.Control
                          ref={editInputRef}
                          type="text"
                          value={tempTabName}
                          onChange={(e) => setTempTabName(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleCompleteEditTabName}
                          className={styles.editInputField}
                        />
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={handleCompleteEditTabName}
                          className={styles.editConfirmButton}
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </Button>
                      </InputGroup>
                    ) : (
                      <>
                        <div className={styles.tabName}
                          onDoubleClick={(e) => handleStartEditTabName(tab.id, tab.name, e)}
                        >
                          {tab.name}
                        </div>
                        
                        <div className={styles.tabActions}>
                          <span
                            className={styles.editButton}
                            onClick={(e) => handleStartEditTabName(tab.id, tab.name, e)}
                            title="タブ名を編集"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleStartEditTabName(tab.id, tab.name, e as unknown as React.MouseEvent<Element, MouseEvent>);
                              }
                            }}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </span>
                          
                          {tabs.length > 1 && (
                            <span
                              className={styles.closeButton}
                              onClick={(e) => handleCloseTab(tab.id, e)}
                              title="タブを閉じる"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleCloseTab(tab.id, e as unknown as React.MouseEvent<Element, MouseEvent>);
                                }
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    
                    {/* 実行状態インジケーター */}
                    {tab.isExecuting && (
                      <div className={styles.executingIndicator} title="実行中">
                        <div className={styles.spinner} />
                      </div>
                    )}
                  </div>
                }
              >
                {/* タブの内容は外部から注入 */}
              </Tab>
            ))}
          </Tabs>
          
          {/* 新しいタブ追加ボタンをタブの右側に配置 */}
          {canCreateNewTab() && (
            <button
              className={styles.addTabButton}
              onClick={handleCreateTab}
              disabled={hasExecutingTab()}
              title={
                hasExecutingTab() 
                  ? "実行中は新しいタブを作成できません"
                  : "新しいタブを追加"
              }
            >
              <FontAwesomeIcon 
                icon={faPlus} 
                className={hasExecutingTab() ? styles.addButtonDisabled : styles.addButton}
              />
            </button>
          )}
        </div>
      </div>

      {/* タブの内容エリア */}
      <div className={styles.tabContent}>
        {children(activeTabId)}
      </div>
    </div>
  );
};
