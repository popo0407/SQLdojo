import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import SQLEditor from '../../features/editor/SQLEditor';
import ResultsViewer from '../../features/results/ResultsViewer';
import styles from '../../styles/Layout.module.css';

export const MainWorkspaceLayout = () => {
  return (
    <div className={styles.homeContainer} style={{ display: 'flex', height: '100%' }}>
      {/* サイドバーは完全に削除 */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <PanelGroup direction="vertical">
          <Panel defaultSize={50} minSize={20}>
            <SQLEditor />
          </Panel>
          <PanelResizeHandle className={styles.resizeHandle} />
          <Panel>
            <ResultsViewer />
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
};