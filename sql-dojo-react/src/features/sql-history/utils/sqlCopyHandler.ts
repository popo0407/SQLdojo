/**
 * エディタへのSQLコピー機能
 * Zustandストアを使用した直接的なSQL設定
 */

import { useEditorStore } from '../../../stores/useEditorStore';

/**
 * SQLをメインエディタにコピーする
 * Reactの状態管理を使用してエディタに直接設定
 * @param sql コピーするSQL文
 */
export const copyToEditor = (sql: string): void => {
  try {
    if (!sql) {
      console.warn('コピーするSQLが空です');
      return;
    }
    
    // Zustandストアを使ってエディタに直接SQL設定
    const editorStore = useEditorStore.getState();
    editorStore.setSql(sql);
    
    // バックアップとしてlocalStorageにも保存（ページリロード対応）
    localStorage.setItem('sqlToCopy', sql);
    
    // 成功フィードバック（UI要求に応じて調整）
    console.log('SQLをエディタにコピーしました');
    
  } catch (error) {
    console.error('SQLのコピーに失敗:', error);
    // エラーが発生した場合はユーザーにフィードバック
    alert('SQLのコピーに失敗しました。');
  }
};

/**
 * コピー可能なSQL文かどうかをチェック
 * @param sql チェックするSQL文
 * @returns コピー可能かどうか
 */
export const isValidSqlForCopy = (sql: string): boolean => {
  if (!sql || typeof sql !== 'string') {
    return false;
  }
  
  // 空白のみの場合は無効
  if (sql.trim().length === 0) {
    return false;
  }
  
  return true;
};

/**
 * SQL文を表示用に省略する
 * @param sql 元のSQL文
 * @param maxLength 最大文字数（デフォルト: 50）
 * @returns 省略されたSQL文
 */
export const truncateSql = (sql: string, maxLength: number = 50): string => {
  if (!sql || typeof sql !== 'string') {
    return '';
  }
  
  // 改行や複数のスペースを単一のスペースに変換
  const cleanedSql = sql.replace(/\s+/g, ' ').trim();
  
  if (cleanedSql.length <= maxLength) {
    return cleanedSql;
  }
  
  return cleanedSql.substring(0, maxLength) + '...';
};
