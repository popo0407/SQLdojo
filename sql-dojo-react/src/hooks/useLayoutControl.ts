import { useEffect } from 'react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useTabStore } from '../stores/useTabStore';

/**
 * レイアウト制御用のカスタムフック
 * SQL実行時の自動最小化機能を提供（タブ対応）
 */
export const useLayoutControl = () => {
  const { setEditorMaximized } = useLayoutStore();
  const { hasExecutingTab } = useTabStore();

  // SQL実行時にエディタを自動最小化
  useEffect(() => {
    if (hasExecutingTab()) {
      setEditorMaximized(false);
    }
  }, [hasExecutingTab, setEditorMaximized]);

  return {
    // 必要に応じて追加のレイアウト制御機能を提供
  };
}; 