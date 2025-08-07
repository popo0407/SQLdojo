/**
 * 表示制御機能のProvider
 * 
 * 開発憲章準拠:
 * - 関心の分離: ビジネスロジックとUIロジックを分離
 * - 依存性注入: 外部依存関係を注入可能にする
 * - エラーハンドリング: 適切なエラー処理とユーザーフィードバック
 */

import React, { useReducer, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { VisibilityContext } from './VisibilityContext';
import { 
  visibilityReducer, 
  initialVisibilityState,
  getRoleListFromState,
  getVisibilityForObject
} from './visibilityReducer';
import { AdminVisibilityService } from '../services/VisibilityService';
import type { VisibilitySetting } from '../types/visibility';

interface VisibilityProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

const DEFAULT_API_BASE_URL = '/api/v1';

export const VisibilityProvider: React.FC<VisibilityProviderProps> = ({ 
  children, 
  apiBaseUrl = DEFAULT_API_BASE_URL 
}) => {
  const [state, dispatch] = useReducer(visibilityReducer, initialVisibilityState);

  /**
   * 共通のfetch処理
   */
  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const fullUrl = `${apiBaseUrl}${endpoint}`;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        credentials: 'include', // セッションCookieを含める
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // JSONパースエラーは無視
        }
        
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('不明なエラーが発生しました');
    }
  }, [apiBaseUrl]);

  // APIサービスのインスタンス化（依存性注入）
  const visibilityService = useMemo(() => new AdminVisibilityService(fetchWithAuth), [fetchWithAuth]);

  /**
   * データ読み込み（メタデータ + 設定）
   */
  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const { metadata, settings } = await visibilityService.loadAllData();
      
      // メタデータ設定
      dispatch({ type: 'SET_METADATA', payload: metadata });
      
      // 表示設定設定
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      
      // ロール一覧を設定から抽出
      const rolesFromSettings = new Set<string>();
      Object.values(settings).forEach(objectSettings => {
        Object.keys(objectSettings).forEach(role => rolesFromSettings.add(role));
      });
      dispatch({ type: 'SET_ROLES', payload: Array.from(rolesFromSettings) });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'データの読み込みに失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [visibilityService]);

  /**
   * 設定保存
   */
  const saveSettings = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true });
    
    try {
      // 現在の設定を保存用形式に変換
      const settingsForSave: VisibilitySetting[] = [];
      
      Object.entries(state.settings).forEach(([objectName, roleSettings]) => {
        Object.entries(roleSettings).forEach(([roleName, isVisible]) => {
          settingsForSave.push({
            object_name: objectName,
            role_name: roleName,
            is_visible: isVisible,
          });
        });
      });
      
      await visibilityService.saveVisibilitySettings(settingsForSave);
      dispatch({ type: 'SET_SAVING', payload: false });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '設定の保存に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.settings, visibilityService]);

  /**
   * 表示状態切り替え
   */
  const toggleVisibility = useCallback((objectName: string, roleName: string, isVisible: boolean) => {
    dispatch({ 
      type: 'TOGGLE_VISIBILITY', 
      payload: { objectName, roleName, isVisible } 
    });
  }, []);

  /**
   * ロール追加
   */
  const addRole = useCallback((roleName: string) => {
    dispatch({ type: 'ADD_ROLE', payload: roleName });
  }, []);

  /**
   * ロール削除
   */
  const deleteRole = useCallback((roleName: string) => {
    dispatch({ type: 'DELETE_ROLE', payload: roleName });
  }, []);

  /**
   * ロール一覧取得
   */
  const getRoleList = useCallback(() => {
    return getRoleListFromState(state);
  }, [state]);

  /**
   * オブジェクトの表示状態取得
   */
  const getVisibilityForObjectCallback = useCallback((objectName: string, roleName: string) => {
    return getVisibilityForObject(state, objectName, roleName);
  }, [state]);

  /**
   * 保存用設定データ取得
   */
  const getSettingsForSave = useCallback((): VisibilitySetting[] => {
    const settingsForSave: VisibilitySetting[] = [];
    
    Object.entries(state.settings).forEach(([objectName, roleSettings]) => {
      Object.entries(roleSettings).forEach(([roleName, isVisible]) => {
        settingsForSave.push({
          object_name: objectName,
          role_name: roleName,
          is_visible: isVisible,
        });
      });
    });
    
    return settingsForSave;
  }, [state.settings]);

  // Context値の構築
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    loadData,
    saveSettings,
    toggleVisibility,
    addRole,
    deleteRole,
    getRoleList,
    getVisibilityForObject: getVisibilityForObjectCallback,
    getSettingsForSave,
  }), [
    state,
    loadData,
    saveSettings,
    toggleVisibility,
    addRole,
    deleteRole,
    getRoleList,
    getVisibilityForObjectCallback,
    getSettingsForSave,
  ]);

  return (
    <VisibilityContext.Provider value={contextValue}>
      {children}
    </VisibilityContext.Provider>
  );
};
