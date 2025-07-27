import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ParameterForm } from '../ParameterForm';
import type { Placeholder, ParameterType } from '../../../types/parameters';

// テスト用のモック関数
const mockOnChange = vi.fn();

// テスト用のプレースホルダー
const createPlaceholder = (type: string, displayName: string, choices?: string[]): Placeholder => ({
  type: type as ParameterType,
  displayName,
  choices,
  fullMatch: `{{${displayName}}}`,
  startIndex: 0,
  endIndex: displayName.length + 4
});

describe('ParameterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('text タイプ', () => {
    const placeholder = createPlaceholder('text', 'テストパラメータ');

    it('単一テキスト入力が正常に動作する', async () => {
      // const user = userEvent.setup();
      
      render(
        <ParameterForm
          placeholder={placeholder}
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByPlaceholderText('テストパラメータ');
      expect(input).toBeInTheDocument();

      // await user.type(input, 'test value');
      fireEvent.change(input, { target: { value: 'test value' } });

      // 最後の呼び出しを確認
      expect(mockOnChange).toHaveBeenLastCalledWith('test value');
    });

    it('既存の値が正しく表示される', () => {
      render(
        <ParameterForm
          placeholder={placeholder}
          value="existing value"
          onChange={mockOnChange}
        />
      );

      const input = screen.getByDisplayValue('existing value');
      expect(input).toBeInTheDocument();
    });
  });

  describe('select タイプ', () => {
    const placeholder = createPlaceholder('select', '選択パラメータ', ['選択肢1', '選択肢2', '選択肢3']);

    it('セレクトボックスが正常に動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterForm
          placeholder={placeholder}
          value=""
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      await user.selectOptions(select, '選択肢2');
      
      expect(mockOnChange).toHaveBeenCalledWith('選択肢2');
    });

    it('選択肢が正しく表示される', () => {
      render(
        <ParameterForm
          placeholder={placeholder}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('選択肢1')).toBeInTheDocument();
      expect(screen.getByText('選択肢2')).toBeInTheDocument();
      expect(screen.getByText('選択肢3')).toBeInTheDocument();
    });
  });

  describe('multi-text タイプ', () => {
    const placeholder = createPlaceholder('multi-text', '複数パラメータ');

    it('複数項目入力が正常に動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['']}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByPlaceholderText('値を入力（Excelからペースト可）');
      expect(inputs).toHaveLength(1);

      await user.type(inputs[0], 'value1');
      
      expect(mockOnChange).toHaveBeenCalledWith(['value1']);
    });

    it('行の追加が正常に動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['']}
          onChange={mockOnChange}
        />
      );

      const addButton = screen.getByText('行を追加');
      await user.click(addButton);

      const inputs = screen.getAllByPlaceholderText('値を入力（Excelからペースト可）');
      expect(inputs).toHaveLength(2);
    });

    it('行の削除が正常に動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['value1', 'value2']}
          onChange={mockOnChange}
        />
      );

      const removeButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('i.fa-minus'));
      expect(removeButtons).toHaveLength(2);

      await user.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith(['value2']);
    });

    it('最小1行は維持される', async () => {
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['value1']}
          onChange={mockOnChange}
        />
      );

      const removeButton = screen.getAllByRole('button').find(btn => btn.querySelector('i.fa-minus'));
      expect(removeButton).toBeDisabled();
    });
  });

  describe('Excelペースト機能', () => {
    const placeholder = createPlaceholder('multi-text', 'Excelペーストテスト');

    beforeEach(() => {
      // クリップボードのモックは削除（実際のペーストイベントを使用）
    });

    it('Excelデータのペーストが正常に動作する', async () => {
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['']}
          onChange={mockOnChange}
        />
      );

      const container = screen.getByText('Excelペーストテスト').closest('.mb-3');
      expect(container).toBeInTheDocument();

      // ペーストイベントをシミュレート
      const input = container!.querySelector('input');
      input!.focus();
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => 'value1\tvalue2\nvalue3\tvalue4'
        }
      });

      fireEvent.paste(input!, pasteEvent);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['value1', 'value2', 'value3', 'value4']);
      });
    });

    it('空のデータのペーストは無視される', async () => {
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['']}
          onChange={mockOnChange}
        />
      );

      const container = screen.getByText('Excelペーストテスト').closest('.mb-3');
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => ''
        }
      });

      fireEvent.paste(container!, pasteEvent);

      // onChangeは呼ばれない
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('個別入力フィールドでのペーストも動作する', async () => {
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['']}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByPlaceholderText('値を入力（Excelからペースト可）');
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => 'value1\tvalue2'
        }
      });

      fireEvent.paste(input, pasteEvent);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['value1', 'value2']);
      });
    });
  });

  describe('値の変更通知', () => {
    it('単一項目の値変更が正しく通知される', async () => {
      // const user = userEvent.setup();
      const textPlaceholder = createPlaceholder('text', 'テキストテスト');
      render(
        <ParameterForm
          placeholder={textPlaceholder}
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByPlaceholderText('テキストテスト');
      // await user.type(input, 'new value');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(mockOnChange).toHaveBeenLastCalledWith('new value');
    });

    it('複数項目の値変更が正しく通知される', async () => {
      const user = userEvent.setup();
      const multiPlaceholder = createPlaceholder('multi-text', '複数テスト');
      
      render(
        <ParameterForm
          placeholder={multiPlaceholder}
          value={['value1', 'value2']}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByPlaceholderText('値を入力（Excelからペースト可）');
      await user.clear(inputs[0]);
      await user.type(inputs[0], 'updated value');

      expect(mockOnChange).toHaveBeenCalledWith(['updated value', 'value2']);
    });

    it('空の値は適切に処理される', async () => {
      const user = userEvent.setup();
      const multiPlaceholder = createPlaceholder('multi-text', '空値テスト');
      
      render(
        <ParameterForm
          placeholder={multiPlaceholder}
          value={['value1', 'value2']}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByPlaceholderText('値を入力（Excelからペースト可）');
      await user.clear(inputs[0]);

      // 空の値は除外される
      expect(mockOnChange).toHaveBeenCalledWith(['value2']);
    });
  });

  describe('UI状態', () => {
    const placeholder = createPlaceholder('multi-text', 'UI状態テスト');

    it('選択中の行がハイライトされる', async () => {
      const user = userEvent.setup();
      
      render(
        <ParameterForm
          placeholder={placeholder}
          value={['value1', 'value2']}
          onChange={mockOnChange}
        />
      );

      const inputs = screen.getAllByPlaceholderText('値を入力（Excelからペースト可）');
      
      await user.click(inputs[0]);
      
      // 選択中の行がハイライトされていることを確認
      expect(inputs[0].style.backgroundColor).toBe('rgb(227, 242, 253)');
      expect(inputs[1].style.backgroundColor).toBe('white');
    });

    it('説明テキストが正しく表示される', () => {
      const multiTextPlaceholder = createPlaceholder('multi-text', '自由入力テスト');
      const multiTextQuotedPlaceholder = createPlaceholder('multi-text-quoted', 'クォート付きテスト');
      
      const { rerender } = render(
        <ParameterForm
          placeholder={multiTextPlaceholder}
          value={['']}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('自由入力 ,区切り挿入')).toBeInTheDocument();

      rerender(
        <ParameterForm
          placeholder={multiTextQuotedPlaceholder}
          value={['']}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('自由入力 \'\'付き,区切り挿入')).toBeInTheDocument();
    });
  });
}); 