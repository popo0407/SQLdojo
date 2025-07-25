import React, { useState, useRef } from 'react';
import { TemplateIntegration } from './TemplateIntegration';

/**
 * テンプレート機能の使用例を示すサンプルコンポーネント
 * 実際の統合時の参考として使用
 */
export const TemplateUsageExample: React.FC = () => {
  const [editorContent, setEditorContent] = useState('SELECT * FROM users WHERE ');
  const [selectedContent, setSelectedContent] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * テンプレートをエディタに挿入
   */
  const handleInsertTemplate = (sql: string) => {
    if (hasSelection && textareaRef.current) {
      // 選択範囲を置換
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        editorContent.substring(0, start) + 
        sql + 
        editorContent.substring(end);
      
      setEditorContent(newContent);
      
      // カーソル位置を調整
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + sql.length, start + sql.length);
      }, 0);
    } else {
      // 全体を置換
      setEditorContent(sql);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  /**
   * エディタの全内容を取得
   */
  const handleGetEditorContent = (): string => {
    return editorContent;
  };

  /**
   * 選択された内容を取得
   */
  const handleGetSelectedContent = (): string => {
    return selectedContent;
  };

  /**
   * テキストエリアの選択変更を処理
   */
  const handleSelectionChange = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        const selected = editorContent.substring(start, end);
        setSelectedContent(selected);
        setHasSelection(true);
      } else {
        setSelectedContent('');
        setHasSelection(false);
      }
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2>テンプレート機能 使用例</h2>
          <p className="text-muted">
            実際のメインページでの統合イメージです。以下のコンポーネントをそのまま使用できます。
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          {/* テンプレート統合コンポーネント */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-file-code me-2"></i>
                テンプレート機能
              </h5>
            </div>
            <div className="card-body">
              <TemplateIntegration
                onInsertTemplate={handleInsertTemplate}
                onGetEditorContent={handleGetEditorContent}
                onGetSelectedContent={handleGetSelectedContent}
                hasSelection={hasSelection}
              />
            </div>
          </div>

          {/* サンプルエディタ */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-edit me-2"></i>
                SQLエディタ（サンプル）
              </h5>
            </div>
            <div className="card-body">
              <textarea
                ref={textareaRef}
                className="form-control"
                rows={10}
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                onSelect={handleSelectionChange}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                placeholder="SQLを入力してください..."
                style={{
                  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                  fontSize: '14px'
                }}
              />
              
              {/* 状態表示 */}
              <div className="mt-2 d-flex justify-content-between text-muted small">
                <div>
                  文字数: {editorContent.length}
                </div>
                <div>
                  {hasSelection ? (
                    <>選択中: {selectedContent.length}文字</>
                  ) : (
                    '選択なし'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 統合ガイド */}
          <div className="card mt-3">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-info-circle me-2"></i>
                既存コードとの統合方法
              </h5>
            </div>
            <div className="card-body">
              <h6>1. 簡単な統合（推奨）</h6>
              <pre className="bg-light p-3 rounded">
{`import { TemplateIntegration } from './features/templates';

// 既存のエディタ連携関数
const handleInsertTemplate = (sql) => {
  // Monaco EditorやCodeMirrorに挿入する処理
  editor.replaceContent(sql);
};

const handleGetContent = () => {
  return editor.getValue();
};

// コンポーネントで使用
<TemplateIntegration
  onInsertTemplate={handleInsertTemplate}
  onGetEditorContent={handleGetContent}
  onGetSelectedContent={() => editor.getSelectedText()}
  hasSelection={editor.hasSelection()}
/>`}
              </pre>

              <h6 className="mt-4">2. Provider を直接使用</h6>
              <pre className="bg-light p-3 rounded">
{`import { TemplateProvider, MainPageTemplate } from './features/templates';

<TemplateProvider>
  <MainPageTemplate {...props} />
</TemplateProvider>`}
              </pre>

              <h6 className="mt-4">3. 既存JavaScriptとの段階的移行</h6>
              <ol>
                <li>既存のテンプレート関連HTMLを残したまま、このコンポーネントを追加</li>
                <li>新機能をテストして動作確認</li>
                <li>問題なければ既存のJavaScriptコードを削除</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
