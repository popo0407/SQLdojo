import React from 'react';
import { Modal, Table } from 'react-bootstrap';
import { useUIStore } from '../../stores/useUIStore';

const shortcuts = [
  { action: 'SQL実行 (選択範囲があればそのSQL)', keys: 'Ctrl + Enter' },
  { action: 'SQL整形', keys: 'Ctrl + Shift + F' },
  { action: 'SQLクリア', keys: 'Ctrl + L' },
  { action: 'ショートカット一覧を開く', keys: 'F1' },
];

const ShortcutHelpModal: React.FC = () => {
  const { showShortcutHelp, setShowShortcutHelp } = useUIStore();

  return (
    <Modal show={showShortcutHelp} onHide={() => setShowShortcutHelp(false)} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>キーボードショートカット</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Table size="sm" bordered hover className="mb-0">
          <thead>
            <tr>
              <th style={{ width: '60%' }}>操作</th>
              <th>キー</th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map(s => (
              <tr key={s.action}>
                <td>{s.action}</td>
                <td><code>{s.keys}</code></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
};

export default ShortcutHelpModal;
