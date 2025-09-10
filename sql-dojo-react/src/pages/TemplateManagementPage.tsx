import React from 'react';
import { UserTemplateManagementPage } from '../features/templates/components/management/user/UserTemplateManagementPage';
import styles from '../styles/Layout.module.css';

/**
 * テンプレート管理ページ
 * Phase 3a: ユーザーテンプレート管理機能を統合
 */
const TemplateManagementPage: React.FC = () => {
  return (
    <div className={styles.scrollablePageContainer}>
      <UserTemplateManagementPage />
    </div>
  );
};

export default TemplateManagementPage; 