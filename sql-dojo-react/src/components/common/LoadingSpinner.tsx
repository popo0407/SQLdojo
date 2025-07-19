import React from 'react';
import { Spinner } from 'react-bootstrap';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'border' | 'grow';
}

/**
 * ローディング表示用コンポーネント
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "実行中...", 
  size = "border" 
}) => {
  // sizeが'sm'の場合は'border'に変換（React Bootstrapの仕様に合わせる）
  const animation = size === 'sm' ? 'border' : size;
  
  return (
    <div className="text-center p-5">
      <Spinner animation={animation} role="status" size={size === 'sm' ? 'sm' : undefined}>
        <span className="visually-hidden">{message}</span>
      </Spinner>
      <p className="mt-2">{message}</p>
    </div>
  );
}; 