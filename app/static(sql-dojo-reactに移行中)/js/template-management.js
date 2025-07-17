/**
 * テンプレート・パーツ統合管理機能
 */

class TemplateManagement {
    constructor() {
        this.templates = [];
        this.parts = [];
        this.currentEditItem = null;
        this.draggedElement = null;
        this.hasUnsavedChanges = false;
        
        this.init();
    }
    
    async init() {
        try {
            // 初期データ読み込み
            await this.loadTemplates();
            await this.loadParts();
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            // 未保存変更の警告設定
            this.setupUnsavedChangesWarning();
            
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showMessage('初期化に失敗しました: ' + error.message, 'error');
        }
    }
    
    async loadTemplates() {
        this.showLoading('templates', true);
        try {
            const response = await fetch('/api/users/template-preferences', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (!response.ok) {
                throw new Error(`テンプレート取得エラー: ${response.status}`);
            }
            
            const data = await response.json();
            this.templates = data.templates || [];
            this.renderTemplates();
            
        } catch (error) {
            console.error('テンプレート読み込みエラー:', error);
            this.showMessage('テンプレートの読み込みに失敗しました', 'error');
        } finally {
            this.showLoading('templates', false);
        }
    }
    
    async loadParts() {
        this.showLoading('parts', true);
        try {
            const response = await fetch('/api/users/part-preferences', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (!response.ok) {
                throw new Error(`パーツ取得エラー: ${response.status}`);
            }
            
            const data = await response.json();
            this.parts = data.parts || [];
            this.renderParts();
            
        } catch (error) {
            console.error('パーツ読み込みエラー:', error);
            this.showMessage('パーツの読み込みに失敗しました', 'error');
        } finally {
            this.showLoading('parts', false);
        }
    }
    
    renderTemplates() {
        const container = document.getElementById('templates-list');
        
        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-code"></i>
                    <h5>テンプレートがありません</h5>
                    <p>メインページからテンプレートを作成してください</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.templates.map((template, index) => `
            <div class="item-row" data-type="template" data-id="${template.template_id}" data-index="${index}">
                <div class="drag-handle" draggable="true">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                
                <div class="item-visibility">
                    <input type="checkbox" class="form-check-input" ${template.is_visible ? 'checked' : ''} 
                           onchange="templateManagement.toggleVisibility('template', '${template.template_id}', this.checked)">
                </div>
                
                <div class="item-info">
                    <div class="item-name">${this.escapeHtml(template.name)}</div>
                    <div class="item-type">
                        <span class="badge bg-${template.is_common ? 'info' : 'primary'} me-2">
                            ${template.is_common ? '共通' : '個人'}
                        </span>
                        <small class="text-muted">表示順: ${template.display_order}</small>
                    </div>
                    <div class="item-sql-preview">${this.escapeHtml(template.sql.substring(0, 100))}${template.sql.length > 100 ? '...' : ''}</div>
                </div>
                
                <div class="item-controls">
                    <button class="btn-icon" onclick="templateManagement.moveUp('template', ${index})" 
                            ${index === 0 ? 'disabled' : ''} title="上に移動">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="btn-icon" onclick="templateManagement.moveDown('template', ${index})" 
                            ${index === this.templates.length - 1 ? 'disabled' : ''} title="下に移動">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                
                <div class="item-actions">
                    ${!template.is_common ? `
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="templateManagement.editItem('template', '${template.template_id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        this.setupDragAndDrop(container);
    }
    
    renderParts() {
        const container = document.getElementById('parts-list');
        
        if (this.parts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-puzzle-piece"></i>
                    <h5>パーツがありません</h5>
                    <p>メインページからパーツを作成してください</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.parts.map((part, index) => `
            <div class="item-row" data-type="part" data-id="${part.part_id}" data-index="${index}">
                <div class="drag-handle" draggable="true">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                
                <div class="item-visibility">
                    <input type="checkbox" class="form-check-input" ${part.is_visible ? 'checked' : ''} 
                           onchange="templateManagement.toggleVisibility('part', '${part.part_id}', this.checked)">
                </div>
                
                <div class="item-info">
                    <div class="item-name">${this.escapeHtml(part.name)}</div>
                    <div class="item-type">
                        <span class="badge bg-${part.is_common ? 'info' : 'primary'} me-2">
                            ${part.is_common ? '共通' : '個人'}
                        </span>
                        <small class="text-muted">表示順: ${part.display_order}</small>
                    </div>
                    <div class="item-sql-preview">${this.escapeHtml(part.sql.substring(0, 100))}${part.sql.length > 100 ? '...' : ''}</div>
                </div>
                
                <div class="item-controls">
                    <button class="btn-icon" onclick="templateManagement.moveUp('part', ${index})" 
                            ${index === 0 ? 'disabled' : ''} title="上に移動">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="btn-icon" onclick="templateManagement.moveDown('part', ${index})" 
                            ${index === this.parts.length - 1 ? 'disabled' : ''} title="下に移動">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                
                <div class="item-actions">
                    ${!part.is_common ? `
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="templateManagement.editItem('part', '${part.part_id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        this.setupDragAndDrop(container);
    }
    
    setupDragAndDrop(container) {
        const rows = container.querySelectorAll('.item-row');
        
        rows.forEach(row => {
            const dragHandle = row.querySelector('.drag-handle');
            
            dragHandle.addEventListener('dragstart', (e) => {
                this.draggedElement = row;
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            dragHandle.addEventListener('dragend', () => {
                if (this.draggedElement) {
                    this.draggedElement.classList.remove('dragging');
                    this.draggedElement = null;
                }
            });
        });
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (this.draggedElement && this.draggedElement !== afterElement) {
                if (afterElement == null) {
                    container.appendChild(this.draggedElement);
                } else {
                    container.insertBefore(this.draggedElement, afterElement);
                }
            }
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.updateOrderAfterDrop(container);
        });
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.item-row:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    updateOrderAfterDrop(container) {
        const rows = container.querySelectorAll('.item-row');
        const type = rows[0]?.dataset.type;
        
        if (!type) return;
        
        const items = type === 'template' ? this.templates : this.parts;
        const newOrder = [];
        
        rows.forEach((row, index) => {
            const id = row.dataset.id;
            const item = items.find(item => {
                return type === 'template' ? item.template_id === id : item.part_id === id;
            });
            if (item) {
                item.display_order = index + 1;
                newOrder.push(item);
            }
        });
        
        if (type === 'template') {
            this.templates = newOrder;
            this.renderTemplates();
        } else {
            this.parts = newOrder;
            this.renderParts();
        }
        
        this.markAsChanged();
    }
    
    moveUp(type, index) {
        if (index <= 0) return;
        
        const items = type === 'template' ? this.templates : this.parts;
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
        
        this.updateDisplayOrders(items);
        
        if (type === 'template') {
            this.renderTemplates();
        } else {
            this.renderParts();
        }
        
        this.markAsChanged();
    }
    
    moveDown(type, index) {
        const items = type === 'template' ? this.templates : this.parts;
        if (index >= items.length - 1) return;
        
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        
        this.updateDisplayOrders(items);
        
        if (type === 'template') {
            this.renderTemplates();
        } else {
            this.renderParts();
        }
        
        this.markAsChanged();
    }
    
    updateDisplayOrders(items) {
        items.forEach((item, index) => {
            item.display_order = index + 1;
        });
    }
    
    toggleVisibility(type, id, isVisible) {
        const items = type === 'template' ? this.templates : this.parts;
        const item = items.find(item => {
            return type === 'template' ? item.template_id === id : item.part_id === id;
        });
        
        if (item) {
            item.is_visible = isVisible;
            this.markAsChanged();
        }
    }
    
    toggleAllTemplates(isVisible) {
        this.templates.forEach(template => {
            template.is_visible = isVisible;
        });
        this.renderTemplates();
        this.markAsChanged();
    }
    
    toggleAllParts(isVisible) {
        this.parts.forEach(part => {
            part.is_visible = isVisible;
        });
        this.renderParts();
        this.markAsChanged();
    }
    
    async editItem(type, id) {
        const items = type === 'template' ? this.templates : this.parts;
        const item = items.find(item => {
            return type === 'template' ? item.template_id === id : item.part_id === id;
        });
        
        if (!item || item.is_common) {
            this.showMessage('この項目は編集できません', 'warning');
            return;
        }
        
        this.currentEditItem = { type, id, item };
        
        document.getElementById('editModalTitle').textContent = 
            `${type === 'template' ? 'テンプレート' : 'パーツ'}の編集`;
        document.getElementById('edit-name').value = item.name;
        document.getElementById('edit-sql').value = item.sql;
        
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    }
    
    async saveEdit() {
        if (!this.currentEditItem) return;
        
        const name = document.getElementById('edit-name').value.trim();
        const sql = document.getElementById('edit-sql').value.trim();
        
        if (!name || !sql) {
            this.showMessage('名前とSQLを入力してください', 'warning');
            return;
        }
        
        try {
            const { type, id } = this.currentEditItem;
            const endpoint = type === 'template' 
                ? `/api/users/templates/${id}` 
                : `/api/users/parts/${id}`;
            
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name, sql })
            });
            
            if (!response.ok) {
                throw new Error(`保存エラー: ${response.status}`);
            }
            
            // ローカルデータも更新
            this.currentEditItem.item.name = name;
            this.currentEditItem.item.sql = sql;
            
            if (type === 'template') {
                this.renderTemplates();
            } else {
                this.renderParts();
            }
            
            // モーダルを閉じる
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();
            
            this.showMessage('保存しました', 'success');
            
        } catch (error) {
            console.error('編集保存エラー:', error);
            this.showMessage('保存に失敗しました: ' + error.message, 'error');
        }
    }
    
    async saveAllSettings() {
        try {
            const saveBtn = document.getElementById('save-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>保存中...';
            
            // テンプレート設定保存
            const templateResponse = await fetch('/api/users/template-preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    preferences: this.templates.map(t => ({
                        template_id: t.template_id,
                        display_order: t.display_order,
                        is_visible: t.is_visible
                    }))
                })
            });
            
            if (!templateResponse.ok) {
                throw new Error(`テンプレート設定保存エラー: ${templateResponse.status}`);
            }
            
            // パーツ設定保存
            const partResponse = await fetch('/api/users/part-preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    preferences: this.parts.map(p => ({
                        part_id: p.part_id,
                        display_order: p.display_order,
                        is_visible: p.is_visible
                    }))
                })
            });
            
            if (!partResponse.ok) {
                throw new Error(`パーツ設定保存エラー: ${partResponse.status}`);
            }
            
            this.hasUnsavedChanges = false;
            this.showMessage('設定を保存しました', 'success');
            
        } catch (error) {
            console.error('設定保存エラー:', error);
            this.showMessage('設定の保存に失敗しました: ' + error.message, 'error');
        } finally {
            const saveBtn = document.getElementById('save-btn');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>設定を保存';
        }
    }
    
    async resetToDefault() {
        if (!confirm('設定をリセットして、最後に保存した状態に戻しますか？')) {
            return;
        }
        
        try {
            await this.loadTemplates();
            await this.loadParts();
            this.hasUnsavedChanges = false;
            this.showMessage('設定をリセットしました', 'info');
        } catch (error) {
            console.error('リセットエラー:', error);
            this.showMessage('リセットに失敗しました', 'error');
        }
    }
    
    markAsChanged() {
        this.hasUnsavedChanges = true;
    }
    
    setupEventListeners() {
        // モーダル関連
        document.getElementById('editModal').addEventListener('hidden.bs.modal', () => {
            this.currentEditItem = null;
        });
    }
    
    setupUnsavedChangesWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '未保存の変更があります。ページを離れますか？';
            }
        });
    }
    
    showLoading(type, show) {
        const loadingElement = document.getElementById(`${type}-loading`);
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }
    
    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('status-message');
        messageElement.className = `alert alert-${type === 'error' ? 'danger' : type}`;
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// グローバル関数（HTMLから直接呼び出されるため）
let templateManagement;

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    templateManagement = new TemplateManagement();
});

// HTMLから呼び出される関数をグローバルスコープに公開
window.toggleAllTemplates = (isVisible) => templateManagement?.toggleAllTemplates(isVisible);
window.toggleAllParts = (isVisible) => templateManagement?.toggleAllParts(isVisible);
window.saveAllSettings = () => templateManagement?.saveAllSettings();
window.resetToDefault = () => templateManagement?.resetToDefault();
window.saveEdit = () => templateManagement?.saveEdit();
