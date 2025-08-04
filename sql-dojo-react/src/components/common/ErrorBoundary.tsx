import React, { useState, type ReactNode, type ErrorInfo } from 'react';
import { Alert, Button, Container, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faRedo, faBug } from '@fortawesome/free-solid-svg-icons';

/**
 * エラー境界の状態
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * エラー境界のProps
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  level?: 'page' | 'component' | 'feature';
  name?: string;
}

/**
 * エラーをキャッチする関数型のエラーバウンダリフック
 */
function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorBoundaryState>({
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: '',
  });

  const resetError = () => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setErrorState({
      hasError: true,
      error,
      errorInfo: errorInfo || null,
      errorId,
    });

    return errorId;
  };

  return { errorState, resetError, handleError };
}

/**
 * 外部ログサービスにエラーを送信
 */
function sendErrorToLoggingService(
  error: Error, 
  errorInfo: ErrorInfo | null, 
  errorId: string, 
  level?: string, 
  name?: string
) {
  // 実際の実装では Sentry、LogRocket、Bugsnag などを使用
  const errorData = {
    errorId,
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    level,
    componentName: name,
  };

  // 例: fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
  console.info('Error data for logging service:', errorData);
}

/**
 * エラー詳細の表示切り替え
 */
function toggleErrorDetails(errorId: string) {
  const errorDetails = document.getElementById(`error-details-${errorId}`);
  if (errorDetails) {
    errorDetails.style.display = errorDetails.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * React 18対応の関数型エラーバウンダリコンポーネント
 * react-error-boundaryライブラリのパターンに従った実装
 */
class ErrorBoundaryComponent extends React.Component<
  ErrorBoundaryProps & { onErrorCapture: (error: Error, errorInfo: ErrorInfo) => void },
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps & { onErrorCapture: (error: Error, errorInfo: ErrorInfo) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onErrorCapture(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * 汎用エラー境界コンポーネント（関数型）
 * Reactアプリケーション内のJavaScriptエラーをキャッチし、
 * 適切なフォールバックUIを表示する
 */
export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  level = 'component',
  name
}) => {
  const { errorState, resetError, handleError } = useErrorHandler();

  // エラーキャプチャ時の処理
  const handleErrorCapture = (error: Error, errorInfo: ErrorInfo) => {
    const errorId = handleError(error, errorInfo);

    // エラー情報をログに記録
    console.group(`🚨 Error Boundary Caught [${level}${name ? `:${name}` : ''}]`);
    console.error('Error ID:', errorId);
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    console.groupEnd();

    // カスタムエラーハンドラーを呼び出し
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      sendErrorToLoggingService(error, errorInfo, errorId, level, name);
    }
  };

  // エラー状態でのフォールバックUI
  const renderErrorFallback = () => {
    const { hasError, error, errorInfo, errorId } = errorState;

    if (!hasError || !error) return null;

    // カスタムフォールバックが提供されている場合
    if (fallback) {
      return fallback;
    }

    // デフォルトのエラーUI
    const isPageLevel = level === 'page';
    const isFeatureLevel = level === 'feature';

    return (
      <Container className={isPageLevel ? 'mt-5' : 'mt-3'}>
        <Card className="border-danger">
          <Card.Header className="bg-danger text-white">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {isPageLevel && 'ページエラーが発生しました'}
            {isFeatureLevel && `${name || '機能'}でエラーが発生しました`}
            {!isPageLevel && !isFeatureLevel && 'エラーが発生しました'}
          </Card.Header>
          <Card.Body>
            <Alert variant="danger" className="mb-3">
              <Alert.Heading className="fs-6">
                <FontAwesomeIcon icon={faBug} className="me-2" />
                エラーID: <code>{errorId}</code>
              </Alert.Heading>
              <hr />
              <p className="mb-0">
                申し訳ございません。予期しないエラーが発生しました。
                以下のボタンで再試行するか、ページを再読み込みしてください。
              </p>
            </Alert>

            <div className="d-flex gap-2 mb-3">
              <Button 
                variant="primary" 
                onClick={resetError}
                size="sm"
              >
                <FontAwesomeIcon icon={faRedo} className="me-1" />
                再試行
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => window.location.reload()}
                size="sm"
              >
                ページ再読み込み
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  variant="outline-info" 
                  onClick={() => toggleErrorDetails(errorId)}
                  size="sm"
                >
                  <FontAwesomeIcon icon={faBug} className="me-1" />
                  エラー詳細
                </Button>
              )}
            </div>

            {/* 開発環境でのエラー詳細表示 */}
            {process.env.NODE_ENV === 'development' && (
              <div id={`error-details-${errorId}`} style={{ display: 'none' }}>
                <Alert variant="warning">
                  <Alert.Heading className="fs-6">開発者向け情報</Alert.Heading>
                  <hr />
                  <div className="mb-3">
                    <strong>エラーメッセージ:</strong>
                    <pre className="mt-1 p-2 bg-light border rounded">
                      <code>{error.message}</code>
                    </pre>
                  </div>
                  {error.stack && (
                    <div className="mb-3">
                      <strong>スタックトレース:</strong>
                      <pre className="mt-1 p-2 bg-light border rounded" style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                        <code>{error.stack}</code>
                      </pre>
                    </div>
                  )}
                  {errorInfo && (
                    <div>
                      <strong>コンポーネントスタック:</strong>
                      <pre className="mt-1 p-2 bg-light border rounded" style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                        <code>{errorInfo.componentStack}</code>
                      </pre>
                    </div>
                  )}
                </Alert>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    );
  };

  return (
    <ErrorBoundaryComponent
      onErrorCapture={handleErrorCapture}
      fallback={renderErrorFallback()}
    >
      {children}
    </ErrorBoundaryComponent>
  );
};

/**
 * 特定のエラータイプ用のカスタムエラー境界
 */
export const TemplateErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handleTemplateError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // テンプレート固有のエラーログ処理
    console.warn('Template module error detected:', { error, errorInfo, errorId });
  };

  return (
    <ErrorBoundary
      level="feature"
      name="テンプレート管理"
      onError={handleTemplateError}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * ページレベルのエラー境界
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary level="page">
      {children}
    </ErrorBoundary>
  );
};

/**
 * 軽量なコンポーネントレベルエラー境界
 */
export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  name?: string;
  fallback?: ReactNode;
}> = ({ children, name, fallback }) => {
  const defaultFallback = (
    <Alert variant="warning" className="m-2">
      <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
      {name ? `${name}の` : ''}読み込み中にエラーが発生しました
      <Button variant="link" className="p-0 ms-2" onClick={() => window.location.reload()}>
        再読み込み
      </Button>
    </Alert>
  );

  return (
    <ErrorBoundary
      level="component"
      name={name}
      fallback={fallback || defaultFallback}
    >
      {children}
    </ErrorBoundary>
  );
};
