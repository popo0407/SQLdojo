import { describe, it, expect } from 'vitest';
import { parsePlaceholders } from '../ParameterParser';

describe('ParameterParser', () => {
  describe('JSON配列の除外', () => {
    it('通常のパラメータは正常に解析される', () => {
      const sql = 'SELECT * FROM table WHERE id = {ユーザーID}';
      const placeholders = parsePlaceholders(sql);
      
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].displayName).toBe('ユーザーID');
      expect(placeholders[0].type).toBe('text');
    });

    it('選択肢付きパラメータは正常に解析される', () => {
      const sql = 'SELECT * FROM table WHERE status = {状態[アクティブ,非アクティブ]}';
      const placeholders = parsePlaceholders(sql);
      
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].displayName).toBe('状態');
      expect(placeholders[0].type).toBe('select');
      expect(placeholders[0].choices).toEqual(['アクティブ', '非アクティブ']);
    });

    it('出力方法パラメータは正常に解析される', () => {
      const sql = 'SELECT * FROM table -- <output>{出力方法[ブラウザ,Excel]}</output>';
      const placeholders = parsePlaceholders(sql);
      
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].displayName).toBe('出力方法');
      expect(placeholders[0].type).toBe('select');
      expect(placeholders[0].choices).toEqual(['ブラウザ', 'Excel']);
    });

    it('Y軸カラム設定のJSON配列は除外される', () => {
      const sql = `
        SELECT * FROM sales 
        -- <y_columns>["売上高","利益"]</y_columns>
        -- <y_column_configs>[{"name":"売上高","dataType":"number","color":"#4F81BD"}]</y_column_configs>
        -- <output>{出力方法[ブラウザ,Excel]}</output>
      `;
      const placeholders = parsePlaceholders(sql);
      
      // JSON配列は除外され、出力方法パラメータのみが検出される
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].displayName).toBe('出力方法');
    });

    it('複雑なJSON配列は除外される', () => {
      const sql = `
        SELECT * FROM table 
        -- <config>[{"name":"test","value":123,"enabled":true}]</config>
        WHERE id = {ユーザーID}
      `;
      const placeholders = parsePlaceholders(sql);
      
      // JSON配列は除外され、通常のパラメータのみが検出される
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].displayName).toBe('ユーザーID');
    });

    it('JSONオブジェクト形式も除外される', () => {
      const sql = `
        SELECT * FROM table 
        -- {"key": "value", "number": 123}
        WHERE id = {ユーザーID}
      `;
      const placeholders = parsePlaceholders(sql);
      
      // JSONオブジェクトは除外され、通常のパラメータのみが検出される
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].displayName).toBe('ユーザーID');
    });

    it('不正なJSON形式は通常のパラメータとして扱われる', () => {
      const sql = 'SELECT * FROM table WHERE config = {設定[invalid json]}';
      const placeholders = parsePlaceholders(sql);
      
      // 不正なJSONなので通常のパラメータとして解析される
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].displayName).toBe('設定');
      expect(placeholders[0].type).toBe('select');
    });
  });
});