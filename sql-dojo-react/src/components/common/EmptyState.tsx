import React from 'react';

interface EmptyStateProps {
  message?: string;
}

/**
 * 空データ表示用コンポーネント
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message = "実行ボタンを押してSQLを実行してください。" 
}) => {
  return (
    <div className="text-center text-muted p-5">
      {message}
    </div>
  );
}; 