import React, { useEffect, useState } from 'react';
import type { BusinessUser } from '../../api/businessUserApi';
import { useBusinessUser } from '../../hooks/useBusinessUser';

export const BusinessUserManagement: React.FC = () => {
  const { users, loading, error, refreshing, fetchUsers, refreshUsers } = useBusinessUser();
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshMessageType, setRefreshMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = async () => {
    const result = await refreshUsers();
    setRefreshMessage(result.message);
    setRefreshMessageType(result.success ? 'success' : 'error');
    
    // メッセージを3秒後に消去
    setTimeout(() => {
      setRefreshMessage(null);
    }, 3000);
  };

  if (loading && users.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            <i className="fas fa-users me-2" />
            業務システムユーザー管理
          </h5>
          <small className="text-muted">HF3IGM01テーブル（ODBC経由）</small>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              更新中...
            </>
          ) : (
            <>
              <i className="fas fa-sync-alt me-2" />
              更新
            </>
          )}
        </button>
      </div>

      <div className="card-body">
        {/* 更新メッセージ */}
        {refreshMessage && (
          <div className={`alert ${refreshMessageType === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
            <i className={`fas ${refreshMessageType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`} />
            {refreshMessage}
            <button
              type="button"
              className="btn-close"
              onClick={() => setRefreshMessage(null)}
            />
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-triangle me-2" />
            {error}
          </div>
        )}

  {/* ユーザー統計カード削除済み */}

        {/* ユーザー一覧テーブル */}
        {users.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>ユーザーID</th>
                  <th>ユーザー名</th>
                  <th>ロール</th>
                  <th>権限</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: BusinessUser) => (
                  <tr key={user.user_id}>
                    <td>
                      <code>{user.user_id}</code>
                    </td>
                    <td>{user.user_name}</td>
                    <td>
                      <code>{user.role || 'N/A'}</code>
                    </td>
                    <td>
                      {user.role === 'ADMIN' ? (
                        <span className="badge bg-success">
                          <i className="fas fa-crown me-1" />
                          管理者
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          <i className="fas fa-user me-1" />
                          一般ユーザー
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && !error ? (
          <div className="text-center py-5">
            <i className="fas fa-users fa-3x text-muted mb-3" />
            <h5>ユーザーが見つかりません</h5>
            <p className="text-muted">業務システムからユーザー情報を更新してください。</p>
            <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
              <i className="fas fa-sync-alt me-2" />
              今すぐ更新
            </button>
          </div>
        ) : null}

        {/* 使用方法の説明 */}
        <div className="mt-4">
          <div className="alert alert-info">
            <h6><i className="fas fa-info-circle me-2" />使用方法</h6>
            <ul className="mb-0">
              <li><strong>更新</strong>: 業務システム（HF3IGM01テーブル）から最新のユーザー情報を取得します</li>
              <li><strong>データ取得項目</strong>: USER_ID、USER_NAME、ROLE_ID</li>
              <li><strong>権限管理</strong>: ROLE_ID='ADMIN'のユーザーが管理者権限を持ちます</li>
              <li><strong>認証</strong>: このユーザー情報がアプリケーションのログイン認証に使用されます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
