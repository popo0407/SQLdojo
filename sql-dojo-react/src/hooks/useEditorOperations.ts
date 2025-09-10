import { useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';

/**
 * エディタの操作を提供するカスタムフック
 * テキスト挿入、クリア、フォーマット機能を管理
 */
export const useEditorOperations = () => {
  const { sql, setSql, sqlToInsert, clearSqlToInsert, formatSql, insertText } = useEditorStore();

  // 初期化時にlocalStorageからSQLを復元（SQL履歴からのコピー対応）
  useEffect(() => {
    const sqlToCopy = localStorage.getItem('sqlToCopy');
    if (sqlToCopy) {
      setSql(sqlToCopy);
      localStorage.removeItem('sqlToCopy'); // 使用後は削除
    }
  }, [setSql]); // setSQL を依存関係に追加

  // sqlToInsertを監視し、統一されたinsertTextを使用
  useEffect(() => {
    if (sqlToInsert) {
      insertText(sqlToInsert);
      clearSqlToInsert();
    }
  }, [sqlToInsert, clearSqlToInsert, insertText]);

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