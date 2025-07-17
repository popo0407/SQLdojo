import { MainWorkspaceLayout } from '../components/layout/MainWorkspaceLayout';
import styles from '../styles/Layout.module.css';

const HomePage = () => {
  return (
    <div className={styles.homeContainer}>
      <MainWorkspaceLayout />
    </div>
  );
};

export default HomePage;