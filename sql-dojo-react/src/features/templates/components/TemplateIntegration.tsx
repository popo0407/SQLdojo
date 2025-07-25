import React from 'react';
import { TemplateProvider } from '../stores/TemplateProvider';
import MainPageTemplate from './MainPageTemplate';

/**
 * 既存のメインページと統合するためのラッパーコンポーネント
 * TemplateProviderでラップして単体で使用可能
 */
interface TemplateIntegrationProps {
  // エディタとの連携用コールバック
  onInsertTemplate: (sql: string) => void;
  onGetEditorContent: () => string;
  onGetSelectedContent: () => string;
  
  // エディタの選択状態
  hasSelection: boolean;
  
  // 追加のクラス名
  className?: string;
  
  // API設定
  apiBaseUrl?: string;
}

/**
 * テンプレート機能統合コンポーネント
 * 既存のメインページに簡単に組み込めるようにProvider付きで提供
 */
export const TemplateIntegration: React.FC<TemplateIntegrationProps> = ({
  apiBaseUrl,
  ...props
}) => {
  return (
    <TemplateProvider apiBaseUrl={apiBaseUrl}>
      <MainPageTemplate {...props} />
    </TemplateProvider>
  );
};

/**
 * 既存JavaScript環境との互換用のExport
 * 既存のapp_new.jsからの移行時に使用
 */
export default TemplateIntegration;
