import React from 'react';
import { Alert } from 'react-bootstrap';

interface ErrorAlertProps {
  error?: Error | null;
  message?: string;
}

/**
 * エラー表示用コンポーネント
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  error, 
  message 
}) => {
  const errorMessage = message || error?.message || 'エラーが発生しました';
  
  return (
    <Alert variant="danger">
      エラー: {errorMessage}
    </Alert>
  );
}; 