/**
 * 日時フォーマット関連のユーティリティ関数
 * 日本語ローカライズされた日時表示を提供
 */

/**
 * ISO日時文字列を日本語形式にフォーマット
 * @param isoString ISO形式の日時文字列
 * @returns 日本語フォーマットされた日時文字列
 */
export const formatISODateTime = (isoString: string): string => {
  if (!isoString) return '-';
  
  try {
    const date = new Date(isoString);
    
    // 無効な日付の場合
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('日時フォーマットエラー:', error);
    return '-';
  }
};

/**
 * 相対時間の表示（例: "2時間前"）
 * @param isoString ISO形式の日時文字列
 * @returns 相対時間の文字列
 */
export const formatRelativeTime = (isoString: string): string => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'たった今';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return formatISODateTime(isoString);
    }
  } catch (error) {
    console.error('相対時間フォーマットエラー:', error);
    return '';
  }
};
