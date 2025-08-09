import React from 'react';
import AppHeader from './AppHeader';
import styles from '../../styles/Layout.module.css';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { useUIStore } from '../../stores/useUIStore';
import ValidationMessages from '../common/ValidationMessages';
import ShortcutHelpModal from '../help/ShortcutHelpModal';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useGlobalShortcuts();
  const { validationMessages, setValidationMessages } = useUIStore();

  return (
    <div className={styles.appContainer}>
      <AppHeader />
      <div className={styles.mainLayout}>
        <main className={styles.mainContent}>
          <ValidationMessages 
            messages={validationMessages} 
            onClose={() => setValidationMessages([])} 
          />
          {children}
        </main>
      </div>
      <ShortcutHelpModal />
    </div>
  );
};

export default MainLayout; 