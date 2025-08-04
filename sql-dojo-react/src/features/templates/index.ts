// 型定義
export type * from './types/template';

// Context と Provider
export { TemplateContext } from './stores/TemplateProvider';
export type { TemplateContextValue } from './stores/templateContext';
export { TemplateProvider } from './stores/TemplateProvider';

// Hooks
export { useTemplateContext } from './hooks/useTemplateContext';
export { useTemplates, useTemplateModals, useTemplateOrder } from './hooks/useTemplates';

// Components
export { TemplateDropdown } from './components/TemplateDropdown';
export { TemplateSaveModal } from './components/TemplateSaveModal';
export { default as MainPageTemplate } from './components/MainPageTemplate';
export { TemplateIntegration } from './components/TemplateIntegration';
export { TemplateUsageExample } from './components/TemplateUsageExample';

// Reducer (必要に応じて直接使用可能)
export { templateReducer, initialTemplateState } from './stores/templateReducer';
export { 
  sortTemplatesByDisplayOrder, 
  getVisibleTemplates, 
  recalculateDisplayOrder 
} from './stores/templateReducer';
