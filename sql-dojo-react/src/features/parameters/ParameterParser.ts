import type { Placeholder } from '../../types/parameters';

/**
 * SQLからプレースホルダーを解析
 * @param sql - 解析対象のSQL
 * @returns プレースホルダー情報の配列
 */
export function parsePlaceholders(sql: string): Placeholder[] {
  const placeholderRegex = /\{([^}]+)\}/g;
  const placeholders: Placeholder[] = [];
  let match;

  while ((match = placeholderRegex.exec(sql)) !== null) {
    const fullMatch = match[0]; // {入力欄の説明} または {入力欄の説明[選択肢1,選択肢2]}
    const content = match[1]; // 入力欄の説明 または 入力欄の説明[選択肢1,選択肢2,選択肢3]
    
    // 複数項目入力（引用符付き）の判定
    const quotedMultiMatch = content.match(/^(.+?)\[''\]$/);
    if (quotedMultiMatch) {
      // パターン④: {フォーム表示文章['']}
      const displayName = quotedMultiMatch[1].trim();
      
      placeholders.push({
        fullMatch: fullMatch,
        displayName: displayName,
        type: 'multi-text-quoted',
        startIndex: match.index,
        endIndex: match.index + fullMatch.length
      });
      continue;
    }
    
    // 複数項目入力の判定
    const multiMatch = content.match(/^(.+?)\[\]$/);
    if (multiMatch) {
      // パターン③: {フォーム表示文章[]}
      const displayName = multiMatch[1].trim();
      
      placeholders.push({
        fullMatch: fullMatch,
        displayName: displayName,
        type: 'multi-text',
        startIndex: match.index,
        endIndex: match.index + fullMatch.length
      });
      continue;
    }
    
    // 選択肢があるかどうかを判定（角括弧を使用）
    const choiceMatch = content.match(/^(.+?)\[([^\]]+)\]$/);
    if (choiceMatch) {
      // パターン②: {入力欄の説明[選択肢1,選択肢2,選択肢3]}
      const displayName = choiceMatch[1].trim();
      const choices = choiceMatch[2].split(',').map(choice => choice.trim());
      
      placeholders.push({
        fullMatch: fullMatch,
        displayName: displayName,
        type: 'select',
        choices: choices,
        startIndex: match.index,
        endIndex: match.index + fullMatch.length
      });
    } else {
      // パターン①: {入力欄の説明}
      placeholders.push({
        fullMatch: fullMatch,
        displayName: content.trim(),
        type: 'text',
        startIndex: match.index,
        endIndex: match.index + fullMatch.length
      });
    }
  }

      // プレースホルダー解析結果
  return placeholders;
}

/**
 * プレースホルダーを実際の値に置換
 * @param sql - 元のSQL
 * @param placeholderValues - プレースホルダーと値のマッピング
 * @returns 置換後のSQL
 */
export function replacePlaceholders(sql: string, placeholderValues: { [key: string]: string | string[] }): string {
  let result = sql;
  
  // プレースホルダーを解析
  const placeholders = parsePlaceholders(sql);
  
  // 後ろから置換（インデックスがずれるのを防ぐ）
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const placeholder = placeholders[i];
    const key = placeholder.displayName;
    const value = placeholderValues[key];
    
    if (value !== undefined && value !== '') {
      let replacementValue: string;
      
      if (Array.isArray(value)) {
        // 複数項目の場合 - 空文字列を除外してから処理
        const filteredValue = value.filter(v => v.trim() !== '');
        if (filteredValue.length > 0) {
          if (placeholder.type === 'multi-text-quoted') {
            // シングルクォート付きの場合（SQLインジェクション対策）
            replacementValue = filteredValue.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
          } else {
            // 通常の複数項目の場合
            replacementValue = filteredValue.join(', ');
          }
        } else {
          // 空の配列の場合は置換しない
          continue;
        }
      } else {
        // 単一項目の場合
        replacementValue = String(value);
      }
      
      result = result.substring(0, placeholder.startIndex) + 
              replacementValue + 
              result.substring(placeholder.endIndex);
    }
  }
  
  return result;
} 