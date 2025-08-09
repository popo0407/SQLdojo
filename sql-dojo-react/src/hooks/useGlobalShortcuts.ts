import { useEffect } from 'react';
import { useSqlPageStore } from '../stores/useSqlPageStore';
import { useEditorStore } from '../stores/useEditorStore';
import { useUIStore } from '../stores/useUIStore';

export function useGlobalShortcuts() {
  const executeSql = useSqlPageStore((s) => s.executeSql);
  const formatSql = useSqlPageStore((s) => s.formatSql);
  const clearSql = useEditorStore((s) => s.clearSql);
  const isPending = useSqlPageStore((s) => s.isPending);
  const { setShowShortcutHelp } = useUIStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isPending) return;

      const isCtrl = e.ctrlKey || e.metaKey; // macOS 対応
      const code = e.code; // 'Enter', 'KeyF', 'KeyL'

  // Ctrl + Enter: 実行（テンキーEnter含む）
  if (isCtrl && !e.shiftKey && (code === 'Enter' || code === 'NumpadEnter')) {
        e.preventDefault();
        e.stopPropagation();
        executeSql();
        return;
      }
      // Ctrl + Shift + F: 整形
      if (isCtrl && e.shiftKey && code === 'KeyF') {
        e.preventDefault();
        e.stopPropagation();
        formatSql();
        return;
      }
      // Ctrl + L: クリア（ブラウザのアドレスバー選択を抑止）
      if (isCtrl && !e.shiftKey && code === 'KeyL') {
        e.preventDefault();
        e.stopPropagation();
        clearSql();
        return;
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
  }, [executeSql, formatSql, clearSql, isPending, setShowShortcutHelp]);
}
