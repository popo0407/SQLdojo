import React from 'react';
import AppHeader from './AppHeader';
import styles from '../../styles/Layout.module.css';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className={styles.appContainer}>
      <AppHeader />
      <div className={styles.mainLayout}>
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout; 