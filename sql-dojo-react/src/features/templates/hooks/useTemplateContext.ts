import { useContext } from 'react';
import { TemplateContext } from '../stores/templateContext';
import type { TemplateContextValue } from '../stores/templateContext';

/**
 * テンプレートコンテキストを使用するためのカスタムフック
 * @returns テンプレートコンテキストの値
 * @throws TemplateProvider外で使用された場合はエラー
 */
export const useTemplateContext = (): TemplateContextValue => {
  const context = useContext(TemplateContext);
  
  if (context === undefined) {
    throw new Error('useTemplateContext must be used within a TemplateProvider');
  }
  
  return context;
};
