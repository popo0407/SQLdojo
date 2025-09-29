import { MonacoParameterFormatter } from '../monacoParameterFormatter';

describe('MonacoParameterFormatter', () => {
  describe('formatSqlWithParameterProtection', () => {
    it('should preserve parameters in curly braces during formatting', () => {
      const sql = `SELECT name, {age[min,max]}, address FROM users WHERE id = {user_id} AND status = 'active'`;
      
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      
      // パラメータが保護されていることを確認
      expect(result).toContain('{age[min,max]}');
      expect(result).toContain('{user_id}');
      
      // SQLがフォーマットされていることを確認
      expect(result).toContain('SELECT');
      expect(result).toContain('FROM');
      expect(result).toContain('WHERE');
    });

    it('should handle simple parameters without brackets', () => {
      const sql = `SELECT * FROM table WHERE column = {parameter}`;
      
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      
      expect(result).toContain('{parameter}');
    });

    it('should handle parameters with empty brackets', () => {
      const sql = `SELECT {field[]} FROM table`;
      
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      
      expect(result).toContain('{field[]}');
    });

    it('should handle parameters with quoted brackets', () => {
      const sql = `SELECT {field['value']} FROM table`;
      
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      
      expect(result).toContain("{field['value']}");
    });

    it('should handle multiple parameters in one query', () => {
      const sql = `SELECT {field1}, {field2[a,b]}, {field3[]} FROM {table_name} WHERE id = {id}`;
      
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      
      expect(result).toContain('{field1}');
      expect(result).toContain('{field2[a,b]}');
      expect(result).toContain('{field3[]}');
      expect(result).toContain('{table_name}');
      expect(result).toContain('{id}');
    });

    it('should format SQL properly while preserving parameters', () => {
      const sql = `SELECT name,{age[min,max]},address FROM users WHERE id={user_id} AND status='active'`;
      
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      
      // パラメータが保護されている
      expect(result).toContain('{age[min,max]}');
      expect(result).toContain('{user_id}');
      
      // 適切にフォーマットされている（改行とインデント）
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('SELECT');
      expect(result).toMatch(/FROM\s+users/);
      expect(result).toMatch(/WHERE\s+id/);
    });

    it('should return empty string for empty input', () => {
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection('');
      expect(result).toBe('');
    });

    it('should return whitespace-only string unchanged', () => {
      const sql = '   \n  \t  ';
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      expect(result).toBe(sql);
    });

    it('should not break complex parameters across lines', () => {
      // ユーザーが報告した問題のケース
      const sql = `SELECT {SELECT[]} FROM {テーブル}
WHERE 1={1[1,0]} AND STA in ({STA['']})`;
      
      const result = MonacoParameterFormatter.formatSqlWithParameterProtection(sql);
      
      // パラメータが分割されていないことを確認
      expect(result).toContain('{SELECT[]}');
      expect(result).toContain('{1[1,0]}');
      expect(result).toContain(`{STA['']}`);
      
      // パラメータ内にカンマ後の改行が入っていないことを確認
      expect(result).not.toMatch(/\{[^}]*,\s*\n[^}]*\}/);
      
      // SQLがフォーマットされていることを確認
      expect(result).toContain('SELECT');
      expect(result).toContain('FROM');
      expect(result).toContain('WHERE');
    });
  });
});