import { useEffect } from 'react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useSqlPageStore } from '../stores/useSqlPageStore';

/**
 * レイアウト制御用のカスタムフック
 * SQL実行時の自動最小化機能を提供
 */
export const useLayoutControl = () => {
  const { setEditorMaximized } = useLayoutStore();
  const { isPending } = useSqlPageStore();

  // SQL実行時にエディタを自動最小化
  useEffect(() => {
    if (isPending) {
      setEditorMaximized(false);
    }
  }, [isPending, setEditorMaximized]);

  return {
    // 必要に応じて追加のレイアウト制御機能を提供
  };
}; 