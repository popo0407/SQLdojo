/**
 * 表示制御メインパネルコンポーネント
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: 表示制御機能の統合管理
 * - 関心の分離: UI表示とビジネスロジックを分離
 * - エラーハンドリング: 適切なエラー表示とローディング状態
 */

import React, { useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { VisibilityTable } from './VisibilityTable';
import { RoleColumnManager } from './RoleColumnManager';
import { useVisibility } from '../../stores/VisibilityContext';

export const VisibilityControlPanel: React.FC = () => {
  const {
    state,
    loadData,
    saveSettings,
    toggleVisibility,
    addRole,
    deleteRole,
    getRoleList,
  } = useVisibility();

  // 初回データ読み込み
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 保存処理
  const handleSave = useCallback(async () => {
    try {
      await saveSettings();
    } catch (error) {
      console.error('設定保存エラー:', error);
    }
  }, [saveSettings]);

  // ロール一覧取得
  const roles = getRoleList();

  return (
    <Card>
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h5 className="mb-0">
              <i className="fas fa-eye-slash me-2 text-primary" />
              メタデータ表示制御
            </h5>
            <small className="text-muted">
              ロールごとに表示するスキーマ・テーブルを制限します。
              「DEFAULT」列は、どのロールにも個別設定がない場合の共通設定です。
            </small>
          </Col>
          <Col xs="auto">
            <Button
              variant="success"
              onClick={handleSave}
              disabled={state.saving || state.loading}
              className="d-flex align-items-center"
            >
              {state.saving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  保存中...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2" />
                  設定を保存
                </>
              )}
            </Button>
          </Col>
        </Row>
      </Card.Header>

      <Card.Body>
        {/* エラー表示 */}
        {state.error && (
          <Alert variant="danger" dismissible onClose={() => {
            // エラークリア機能が必要な場合はdispatchを使用
          }}>
            <i className="fas fa-exclamation-triangle me-2" />
            {state.error}
          </Alert>
        )}

        {/* ローディング状態 */}
        {state.loading && (
          <div className="text-center py-4">
            <Spinner animation="border" role="status" className="me-2" />
            <span>データを読み込み中...</span>
          </div>
        )}

        {/* ロール管理 */}
        {!state.loading && (
          <RoleColumnManager
            roles={roles}
            onAddRole={addRole}
            onDeleteRole={deleteRole}
          />
        )}

        {/* 表示制御テーブル */}
        {!state.loading && (
          <VisibilityTable
            metadata={state.metadata}
            settings={state.settings}
            roles={roles}
            onToggleVisibility={toggleVisibility}
          />
        )}

        {/* データ件数表示 */}
        {!state.loading && state.metadata.length > 0 && (
          <div className="mt-3 text-muted small">
            <i className="fas fa-info-circle me-1" />
            スキーマ: {state.metadata.length}件、
            テーブル: {state.metadata.reduce((sum, schema) => sum + (schema.tables?.length || 0), 0)}件、
            ロール: {roles.length}件
          </div>
        )}
      </Card.Body>
    </Card>
  );
};
