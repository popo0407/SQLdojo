import type * as monaco from 'monaco-editor';

/**
 * パラメータ（{}で囲まれた文字列）を1つの塊として扱うカスタムフォーマッター
 * 
 * 対象パターン:
 * - {テキスト}
 * - {テキスト[テキスト,テキスト]}
 * - {テキスト[]}
 * - {テキスト['']}
 */
export class MonacoParameterFormatter {
  /**
   * パラメータパターンを検出する正規表現
   * {}で囲まれた文字列で、内部に[]が含まれる場合も考慮
   */
  private static readonly PARAMETER_PATTERN = /\{[^{}]*(?:\[[^[\]]*\])?[^{}]*\}/g;

  /**
   * SQLテキストをフォーマットし、パラメータ部分を保護する
   */
  static formatSqlWithParameterProtection(text: string): string {
    // 空文字列の場合は何もしない
    if (!text) {
      return text;
    }
    
    // 空白のみの文字列の場合はそのまま返す
    if (text.trim() === '') {
      return text;
    }

    // パラメータ部分を一時的な置換用トークンに変換
    const parameterMap = new Map<string, string>();
    let tokenCounter = 0;

    // パラメータを検出して一時トークンに置換
    const textWithTokens = text.replace(this.PARAMETER_PATTERN, (match) => {
      const token = `__PARAM_TOKEN_${tokenCounter++}__`;
      parameterMap.set(token, match);
      return token;
    });

    // 基本的なSQLフォーマット処理（改行、インデント）
    let formattedText = this.basicSqlFormat(textWithTokens);

    // トークンを元のパラメータに戻す
    parameterMap.forEach((originalParam, token) => {
      formattedText = formattedText.replace(token, originalParam);
    });

    return formattedText;
  }

  /**
   * 基本的なSQLフォーマット処理
   * パラメータトークンは変更せず、SQL構文のみフォーマット
   */
  private static basicSqlFormat(text: string): string {
    // 基本的なSQL整形ルール
    const formatted = text
      // 余分な空白を削除（ただし改行は保持）
      .replace(/[ \t]+/g, ' ')
      .trim()
      // SQLキーワード前に改行を追加
      .replace(/\b(SELECT|FROM|WHERE|AND|OR|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|UNION|EXCEPT|INTERSECT)\b/gi, '\n$1')
      // カンマ後の適切な間隔（SELECT文のフィールド区切りなど）
      .replace(/,\s*/g, ',\n  ')
      // 括弧周りの空白調整
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      // 演算子周りの空白調整（単語境界を考慮してカラム名を分割しないように）
      .replace(/\s*(=|<>|!=|<=|>=|<|>|\bLIKE\b|\bIN\b|\bNOT\s+IN\b|\bIS\b|\bIS\s+NOT\b|\bBETWEEN\b)\s*/gi, ' $1 ');

    // 行毎に処理してインデントを調整
    const lines = formatted.split('\n');
    const formattedLines: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine === '') return; // 空行をスキップ
      
      // 最初の行（通常はSELECT）はインデントなし
      if (index === 0 || trimmedLine.match(/^(SELECT|WITH)/i)) {
        formattedLines.push(trimmedLine);
      }
      // WHERE、ORDER BY、GROUP BY等の主要句
      else if (trimmedLine.match(/^(FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|UNION|EXCEPT|INTERSECT)/i)) {
        formattedLines.push(trimmedLine);
      }
      // AND、OR等の条件句
      else if (trimmedLine.match(/^(AND|OR)/i)) {
        formattedLines.push('  ' + trimmedLine);
      }
      // その他の行（フィールド名、条件等）
      else {
        formattedLines.push('  ' + trimmedLine);
      }
    });

    return formattedLines.join('\n');
  }

  /**
   * Monaco Editorのフォーマッタープロバイダーを登録
   */
  static registerFormattingProvider(monacoApi: typeof monaco): monaco.IDisposable {
    return monacoApi.languages.registerDocumentFormattingEditProvider('sql', {
      provideDocumentFormattingEdits: (
        model: monaco.editor.ITextModel,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _options: monaco.languages.FormattingOptions,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _token: monaco.CancellationToken
      ): monaco.languages.TextEdit[] => {
        try {
          const originalText = model.getValue();
          const formattedText = this.formatSqlWithParameterProtection(originalText);

          // テキストが変更された場合のみ編集を返す
          if (originalText !== formattedText) {
            const fullRange = model.getFullModelRange();
            return [
              {
                range: fullRange,
                text: formattedText
              }
            ];
          }

          return [];
        } catch (error) {
          console.error('SQL formatting error:', error);
          return [];
        }
      }
    });
  }
}