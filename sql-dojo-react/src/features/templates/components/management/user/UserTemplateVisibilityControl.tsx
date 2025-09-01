import React, { useState, useCallback, useEffect } from 'react';
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEye, 
  faEyeSlash, 
  faSave, 
  faUndo,
  faUser,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';

import type { TemplatePreference } from '../../../types/template';

// 拡張されたテンプレート設定型
interface ExtendedTemplatePreference extends TemplatePreference {
  template_name: string;
  is_admin: boolean;
}

export interface UserTemplateVisibilityControlProps {
  preferences: ExtendedTemplatePreference[];
  onUpdatePreferences: (preferences: TemplatePreference[]) => Promise<void>;
  isLoading?: boolean;
}

/**
 * ユーザーテンプレート表示/非表示制御
 * 個人テンプレートと管理者テンプレートの表示設定を管理
 */
export const UserTemplateVisibilityControl: React.FC<UserTemplateVisibilityControlProps> = ({
  preferences,
  onUpdatePreferences,
  isLoading = false
}) => {
  const [localPreferences, setLocalPreferences] = useState<ExtendedTemplatePreference[]>(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // propsのpreferencesが変わったら、localPreferencesも更新
  useEffect(() => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  // 設定変更処理
  const handleVisibilityChange = useCallback((templateId: string, isVisible: boolean) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.template_id === templateId 
          ? { ...pref, is_visible: isVisible }
          : pref
      )
    );
    setHasChanges(true);
  }, []);

  // 全体表示/非表示切り替え（修正版）
  const handleToggleAll = useCallback((templateType: 'user' | 'admin', isVisible: boolean) => {
    setLocalPreferences(prev => 
      prev.map(pref => {
        // templateTypeが'user'の場合は管理者テンプレート以外、'admin'の場合は管理者テンプレートのみ
        const shouldToggle = templateType === 'user' ? !pref.is_admin : pref.is_admin;
        return shouldToggle 
          ? { ...pref, is_visible: isVisible }
          : pref;
      })
    );
    setHasChanges(true);
  }, []);

  // 変更保存
  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      // ExtendedTemplatePreferenceからTemplatePreferenceに変換
      const basicPreferences: TemplatePreference[] = localPreferences.map(pref => ({
        template_id: pref.template_id,
        template_type: pref.template_type || 'user', // デフォルトは'user'
        display_order: pref.display_order,
        is_visible: pref.is_visible
      }));
      await onUpdatePreferences(basicPreferences);
      setHasChanges(false);
    } catch (error) {
      console.error('表示設定保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  }, [localPreferences, onUpdatePreferences, hasChanges, isSaving]);

  // 変更リセット
  const handleReset = useCallback(() => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  // テンプレートをタイプ別に分類
  const userTemplates = localPreferences.filter(pref => !pref.is_admin);
  const adminTemplates = localPreferences.filter(pref => pref.is_admin);

  // 統計情報
  const userVisibleCount = userTemplates.filter(t => t.is_visible).length;
  const adminVisibleCount = adminTemplates.filter(t => t.is_visible).length;

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FontAwesomeIcon icon={faEye} className="me-2" />
            テンプレート表示設定
          </h6>
          <div>
            {hasChanges && (
              <>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="me-2"
                >
                  <FontAwesomeIcon icon={faUndo} />
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <FontAwesomeIcon icon={faSave} />
                  )}
                  <span className="ms-1">保存</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* 個人テンプレート */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">
              <FontAwesomeIcon icon={faUser} className="me-2 text-primary" />
              個人テンプレート ({userVisibleCount}/{userTemplates.length} 表示中)
            </h6>
            <div>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleToggleAll('user', true)}
                className="me-1"
              >
                全て表示
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleToggleAll('user', false)}
              >
                全て非表示
              </Button>
            </div>
          </div>

          <div className="row">
            {userTemplates.map(template => (
              <div key={template.template_id} className="col-md-6 col-lg-4 mb-2">
                <Form.Check
                  type="switch"
                  id={`user-template-${template.template_id}`}
                  label={
                    <span className="d-flex align-items-center">
                      <FontAwesomeIcon 
                        icon={template.is_visible ? faEye : faEyeSlash} 
                        className={`me-2 ${template.is_visible ? 'text-success' : 'text-muted'}`}
                      />
                      <span className={template.is_visible ? '' : 'text-muted'}>
                        {template.template_name}
                      </span>
                    </span>
                  }
                  checked={template.is_visible}
                  onChange={(e) => handleVisibilityChange(template.template_id, e.target.checked)}
                  disabled={isLoading || isSaving}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 管理者テンプレート */}
        {adminTemplates.length > 0 && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                <FontAwesomeIcon icon={faUserShield} className="me-2 text-warning" />
                管理者テンプレート ({adminVisibleCount}/{adminTemplates.length} 表示中)
              </h6>
              <div>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => handleToggleAll('admin', true)}
                  className="me-1"
                >
                  全て表示
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleToggleAll('admin', false)}
                >
                  全て非表示
                </Button>
              </div>
            </div>

            <div className="row">
              {adminTemplates.map(template => (
                <div key={template.template_id} className="col-md-6 col-lg-4 mb-2">
                  <Form.Check
                    type="switch"
                    id={`admin-template-${template.template_id}`}
                    label={
                      <span className="d-flex align-items-center">
                        <FontAwesomeIcon 
                          icon={template.is_visible ? faEye : faEyeSlash} 
                          className={`me-2 ${template.is_visible ? 'text-success' : 'text-muted'}`}
                        />
                        <span className={template.is_visible ? '' : 'text-muted'}>
                          {template.template_name}
                        </span>
                      </span>
                    }
                    checked={template.is_visible}
                    onChange={(e) => handleVisibilityChange(template.template_id, e.target.checked)}
                    disabled={isLoading || isSaving}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 変更通知 */}
        {hasChanges && (
          <Alert variant="info" className="mt-3 mb-0">
            <FontAwesomeIcon icon={faSave} className="me-2" />
            表示設定に変更があります。保存ボタンをクリックして変更を適用してください。
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};
