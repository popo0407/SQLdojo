/**
 * 表示制御テーブルコンポーネント
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: テーブル表示とチェックボックス操作のみ
 * - パフォーマンス: 大量データに対応した最適化
 * - ユーザビリティ: 階層表示と直感的な操作性
 */

import React, { memo } from 'react';
import { Table } from 'react-bootstrap';
import { VisibilityCheckbox } from './VisibilityCheckbox';
import type { VisibilityTableProps } from '../../types/visibility';

const VisibilityTableComponent: React.FC<VisibilityTableProps> = ({
  metadata,
  settings,
  roles,
  onToggleVisibility,
}) => {
  // ロールの表示順序を決定（DEFAULT → その他 → アルファベット順）
  const sortedRoles = React.useMemo(() => {
    return roles.slice().sort((a, b) => {
      if (a === 'DEFAULT') return -1;
      if (b === 'DEFAULT') return 1;
      if (a === 'その他') return 1;
      if (b === 'その他') return -1;
      return a.localeCompare(b, 'ja');
    });
  }, [roles]);

  // オブジェクトの表示状態を取得
  const getVisibilityForObject = React.useCallback((objectName: string, roleName: string): boolean => {
    const objectSettings = settings[objectName];
    
    if (!objectSettings) {
      // 新規オブジェクトのデフォルトは非表示
      return false;
    }
    
    if (roleName in objectSettings) {
      return objectSettings[roleName];
    }
    
    // ロール固有設定がない場合は「その他」ロールの設定を使用
    if (objectSettings['その他'] !== undefined) {
      return objectSettings['その他'];
    }
    
    // 「その他」ロールの設定もない場合はDEFAULTを使用
    return objectSettings['DEFAULT'] ?? false;
  }, [settings]);

  return (
    <div className="table-responsive" style={{ maxHeight: '600px' }}>
      <Table bordered hover className="mb-0">
        <thead className="table-light position-sticky" style={{ top: 0, zIndex: 10 }}>
          <tr>
            <th style={{ minWidth: '300px', backgroundColor: '#f8f9fa' }}>
              オブジェクト
            </th>
            {sortedRoles.map(role => (
              <th key={role} className="text-center" style={{ minWidth: '100px', backgroundColor: '#f8f9fa' }}>
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metadata.map(schema => (
            <React.Fragment key={schema.name}>
              {/* スキーマ行 */}
              <tr>
                <td>
                  <strong>
                    <i className="fas fa-database text-primary me-2" />
                    {schema.name}
                  </strong>
                </td>
                {sortedRoles.map(role => (
                  <td key={role} className="text-center">
                    <VisibilityCheckbox
                      objectName={schema.name}
                      roleName={role}
                      isVisible={getVisibilityForObject(schema.name, role)}
                      onChange={onToggleVisibility}
                    />
                  </td>
                ))}
              </tr>
              
              {/* テーブル行 */}
              {schema.tables?.map(table => {
                const fullTableName = `${schema.name}.${table.name}`;
                return (
                  <tr key={fullTableName}>
                    <td className="ps-4">
                      <div>
                        <i className="fas fa-table text-secondary me-2" />
                        {table.name}
                        {table.comment && (
                          <small className="text-muted ms-2">
                            ({table.comment})
                          </small>
                        )}
                      </div>
                    </td>
                    {sortedRoles.map(role => (
                      <td key={role} className="text-center">
                        <VisibilityCheckbox
                          objectName={fullTableName}
                          roleName={role}
                          isVisible={getVisibilityForObject(fullTableName, role)}
                          onChange={onToggleVisibility}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </Table>
      
      {metadata.length === 0 && (
        <div className="text-center py-4 text-muted">
          <i className="fas fa-database fa-2x mb-2" />
          <div>メタデータがありません</div>
        </div>
      )}
    </div>
  );
};

// パフォーマンス最適化
export const VisibilityTable = memo(VisibilityTableComponent);
