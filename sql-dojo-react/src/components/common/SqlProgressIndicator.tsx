import React from 'react';
import { createPortal } from 'react-dom';
import { ProgressBar } from 'react-bootstrap';
import styles from './SqlProgressIndicator.module.css';

interface SqlProgressIndicatorProps {
  total_count?: number;
  current_count?: number;
  progress_percentage?: number;
  isVisible: boolean;
  message?: string;
  showProgress?: boolean; // 進捗バーを表示するかどうか
}

export const SqlProgressIndicator: React.FC<SqlProgressIndicatorProps> = ({
  total_count = 0,
  current_count = 0,
  progress_percentage = 0,
  isVisible,
  message,
  showProgress = true
}) => {
  if (!isVisible) {
    return null;
  }

  const progressElement = (
    <div 
      className={styles.progressContainer}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '320px',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 1050,
        backdropFilter: 'blur(4px)',
      }}
    >
      {showProgress && total_count > 0 && (
        <>
          <div className={styles.progressHeader}>
            <span className={styles.progressText} style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
              進捗率 {progress_percentage.toFixed(1)}% ({current_count.toLocaleString()} / {total_count.toLocaleString()} レコード)
            </span>
          </div>
          <ProgressBar 
            now={progress_percentage} 
            className={styles.progressBar}
            animated
            striped
            variant="info"
            style={{ height: '8px', marginBottom: '8px' }}
          />
        </>
      )}
      {message && (
        <div className={styles.progressMessage} style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center' }}>
          {message}
        </div>
      )}
    </div>
  );

  // document.bodyに直接ポータルでレンダリング
  return createPortal(progressElement, document.body);
};