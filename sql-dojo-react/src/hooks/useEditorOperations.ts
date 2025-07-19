import { useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';

/**
 * エディタの操作を提供するカスタムフック
 * テキスト挿入、クリア、フォーマット機能を管理
 */
export const useEditorOperations = () => {
  const { sql, setSql, sqlToInsert, clearSqlToInsert, formatSql } = useEditorStore();

  // sqlToInsertを監視し、エディタに挿入
  useEffect(() => {
    if (sqlToInsert) {
      const editorInstance = useEditorStore.getState().editor;
      if (editorInstance) {
        const position = editorInstance.getPosition();
        if (position) {
          const range = {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          };
          const op = {
            identifier: { major: 1, minor: 1 },
            range,
            text: sqlToInsert,
            forceMoveMarkers: true,
          };
          editorInstance.executeEdits('sidebar-insert', [op]);
          editorInstance.focus();
        }
      }
      clearSqlToInsert();
    }
  }, [sqlToInsert, clearSqlToInsert]);

  const handleClear = () => {
    setSql('');
  };

  const handleFormat = async () => {
    try {
      await formatSql();
      // 成功時はメッセージ非表示（ユーザーが見た目で判断可能）
    } catch (error) {
      // エラーメッセージを表示
      const errorMessage = error instanceof Error ? error.message : 'SQL整形に失敗しました';
      alert(errorMessage);
    }
  };

  return {
    sql,
    setSql,
    handleClear,
    handleFormat
  };
}; 