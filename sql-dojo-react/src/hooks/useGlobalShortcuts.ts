import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTabStore } from '../stores/useTabStore';
import { useTabPageStore } from '../stores/useTabPageStore';
import { useUIStore } from '../stores/useUIStore';

export function useGlobalShortcuts() {
  const location = useLocation();
  const { setShowShortcutHelp } = useUIStore();
  
  // タブ関連のストア
  const { activeTabId, updateTabSql, hasExecutingTab } = useTabStore();
  const { executeTabSql, formatTabSql } = useTabPageStore();

  const clearSql = useCallback(() => {
    if (activeTabId) {
      updateTabSql(activeTabId, '');
    }
  }, [activeTabId, updateTabSql]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 実行中タブがある場合はショートカットを無効化
      if (hasExecutingTab()) return;

      const isCtrl = e.ctrlKey || e.metaKey; // macOS 対応
      const code = e.code; // 'Enter', 'KeyF', 'KeyL'

      // タブページ（ホームページ「/」）での処理
      const isTabPage = location.pathname === '/';

      // Ctrl + Enter: タブでSQLを実行
      if (isCtrl && !e.shiftKey && (code === 'Enter' || code === 'NumpadEnter')) {
        if (isTabPage && activeTabId) {
          e.preventDefault();
          e.stopPropagation();
          executeTabSql(activeTabId);
          return;
        }
      }
      
      // Ctrl + Shift + F: タブでSQL整形
      if (isCtrl && e.shiftKey && code === 'KeyF') {
        if (isTabPage && activeTabId) {
          e.preventDefault();
          e.stopPropagation();
          formatTabSql(activeTabId);
          return;
        }
      }
      
      // Ctrl + L: タブでSQLクリア（ブラウザのアドレスバー選択を抑止）
      if (isCtrl && !e.shiftKey && code === 'KeyL') {
        if (isTabPage && activeTabId) {
          e.preventDefault();
          e.stopPropagation();
          clearSql();
          return;
        }
      }
      
      // F1: ヘルプ
      if (!isCtrl && !e.shiftKey && code === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        setShowShortcutHelp(true);
        return;
      }
    };

    // キャプチャ段階でフックしてブラウザ/Monacoのデフォルトより先に処理
    window.addEventListener('keydown', handler, true);
    document.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
      document.removeEventListener('keydown', handler, true);
    };
  }, [executeTabSql, formatTabSql, clearSql, hasExecutingTab, setShowShortcutHelp, location.pathname, activeTabId]);
}
