import React from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { useMetadata } from '../../../../hooks/useMetadata';

interface MetadataRefreshButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline-primary';
  size?: 'sm' | 'lg';
}

/**
 * 管理者用メタデータ・マスター情報強制更新ボタン
 */
const MetadataRefreshButton: React.FC<MetadataRefreshButtonProps> = ({
  className = '',
  variant = 'outline-primary',
  size,
}) => {
  const { refreshing, error, refreshMetadataForce, clearError } = useMetadata();

  const handleRefresh = async () => {
    try {
      await refreshMetadataForce();
      // 成功通知は視覚的に明らかなので不要（Rule 11）
    } catch (error) {
      // エラーハンドリングはフックで処理済み
      console.error('更新処理でエラーが発生しました:', error);
    }
  };

  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        onClick={handleRefresh}
        disabled={refreshing}
        className="d-flex align-items-center"
        title="データベースから最新のメタデータとマスター情報を取得します（処理時間: 最大5分）"
      >
        {refreshing ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
              className="me-2"
            />
            更新中...
          </>
        ) : (
          <>
            <i className="fas fa-sync-alt me-2" />
            メタデータ・マスター更新
          </>
        )}
      </Button>
      
      {error && (
        <Alert 
          variant="danger" 
          className="mt-2" 
          dismissible 
          onClose={clearError}
        >
          <i className="fas fa-exclamation-triangle me-2" />
          更新に失敗しました: {error}
          <br />
          <small>データベース接続を確認してください。</small>
        </Alert>
      )}
    </div>
  );
};

export default MetadataRefreshButton;
