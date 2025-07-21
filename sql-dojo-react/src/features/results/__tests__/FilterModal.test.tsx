import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterModal from '../FilterModal';
import { useUIStore } from '../../../stores/useUIStore';
import { useResultsStore } from '../../../stores/useResultsStore';
import { getUniqueValues } from '../../../api/metadataService';

// モックの設定
jest.mock('../../../api/metadataService');
jest.mock('../../../stores/useUIStore');
jest.mock('../../../stores/useResultsStore');

const mockGetUniqueValues = getUniqueValues as jest.MockedFunction<typeof getUniqueValues>;
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;
const mockUseResultsStore = useResultsStore as jest.MockedFunction<typeof useResultsStore>;

describe('FilterModal', () => {
  const mockSetFilterModal = jest.fn();
  const mockApplyFilter = jest.fn();
  
  const defaultUIStoreState = {
    filterModal: {
      show: true,
      columnName: 'test_column',
      currentFilters: []
    },
    setFilterModal: mockSetFilterModal
  };

  const defaultResultsStoreState = {
    sessionId: 'test-session-id',
    filters: {},
    applyFilter: mockApplyFilter
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseUIStore.mockReturnValue(defaultUIStoreState);
    mockUseResultsStore.mockReturnValue(defaultResultsStoreState);
    
    mockGetUniqueValues.mockResolvedValue({
      values: ['value1', 'value2', 'value3'],
      truncated: false
    });
  });

  describe('初期表示', () => {
    it('モーダルが正しく表示される', () => {
      render(<FilterModal />);
      
      expect(screen.getByText('test_column のフィルタ')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('値を検索...')).toBeInTheDocument();
    });

    it('モーダルが非表示の場合は何も表示しない', () => {
      mockUseUIStore.mockReturnValue({
        ...defaultUIStoreState,
        filterModal: { ...defaultUIStoreState.filterModal, show: false }
      });

      render(<FilterModal />);
      
      expect(screen.queryByText('test_column のフィルタ')).not.toBeInTheDocument();
    });
  });

  describe('ユニーク値の取得', () => {
    it('モーダルが開かれたときにユニーク値を取得する', async () => {
      render(<FilterModal />);

      await waitFor(() => {
        expect(mockGetUniqueValues).toHaveBeenCalledWith({
          session_id: 'test-session-id',
          column_name: 'test_column',
          filters: {}
        });
      });
    });

    it('ローディング中は適切なメッセージを表示する', async () => {
      // ローディング状態をシミュレート
      mockGetUniqueValues.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          values: ['value1', 'value2'],
          truncated: false
        }), 100))
      );

      render(<FilterModal />);
      
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('エラー時は適切なエラーメッセージを表示する', async () => {
      mockGetUniqueValues.mockRejectedValue(new Error('API Error'));

      render(<FilterModal />);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('セッションIDがない場合はエラーメッセージを表示する', async () => {
      mockUseResultsStore.mockReturnValue({
        ...defaultResultsStoreState,
        sessionId: null
      });

      render(<FilterModal />);

      await waitFor(() => {
        expect(screen.getByText('セッションIDがありません。')).toBeInTheDocument();
      });
    });

    it('truncatedフラグがtrueの場合は警告メッセージを表示する', async () => {
      mockGetUniqueValues.mockResolvedValue({
        values: ['value1', 'value2'],
        truncated: true
      });

      render(<FilterModal />);

      await waitFor(() => {
        expect(screen.getByText('※ 候補は最大100件まで表示されます')).toBeInTheDocument();
      });
    });
  });

  describe('検索機能', () => {
    beforeEach(async () => {
      render(<FilterModal />);
      await waitFor(() => {
        expect(screen.getByText('value1')).toBeInTheDocument();
      });
    });

    it('検索ボックスに入力すると値が絞り込まれる', async () => {
      const searchInput = screen.getByPlaceholderText('値を検索...');
      await userEvent.type(searchInput, 'value1');

      expect(screen.getByText('value1')).toBeInTheDocument();
      expect(screen.queryByText('value2')).not.toBeInTheDocument();
      expect(screen.queryByText('value3')).not.toBeInTheDocument();
    });

    it('大文字小文字を区別しない検索ができる', async () => {
      const searchInput = screen.getByPlaceholderText('値を検索...');
      await userEvent.type(searchInput, 'VALUE1');

      expect(screen.getByText('value1')).toBeInTheDocument();
    });
  });

  describe('値の選択', () => {
    beforeEach(async () => {
      render(<FilterModal />);
      await waitFor(() => {
        expect(screen.getByText('value1')).toBeInTheDocument();
      });
    });

    it('値をクリックすると選択状態になる', async () => {
      const valueItem = screen.getByText('value1');
      await userEvent.click(valueItem);

      expect(valueItem.closest('.list-group-item')).toHaveClass('active');
      // 選択状態の確認は、バッジの存在で判定する
      expect(screen.getByText('選択された値:')).toBeInTheDocument();
    });

    it('選択された値はバッジとして表示される', async () => {
      const valueItem = screen.getByText('value1');
      await userEvent.click(valueItem);

      expect(screen.getByText('選択された値:')).toBeInTheDocument();
      expect(screen.getByText('value1', { selector: '.badge' })).toBeInTheDocument();
    });

    it('バッジをクリックすると選択が解除される', async () => {
      const valueItem = screen.getByText('value1');
      await userEvent.click(valueItem);

      const badge = screen.getByText('value1', { selector: '.badge' });
      if (badge) {
        await userEvent.click(badge);
      }

      expect(screen.queryByText('選択された値:')).not.toBeInTheDocument();
    });
  });

  describe('全選択/全解除機能', () => {
    beforeEach(async () => {
      render(<FilterModal />);
      await waitFor(() => {
        expect(screen.getByText('value1')).toBeInTheDocument();
      });
    });

    it('全て選択ボタンで全ての値が選択される', async () => {
      const selectAllButton = screen.getByText('全て選択');
      await userEvent.click(selectAllButton);

      expect(screen.getByText(/3 個の値から 3 個を選択/)).toBeInTheDocument();
    });

    it('選択解除ボタンで全ての選択が解除される', async () => {
      const selectAllButton = screen.getByText('全て選択');
      await userEvent.click(selectAllButton);

      const deselectAllButton = screen.getByText('選択解除');
      await userEvent.click(deselectAllButton);

      expect(screen.getByText(/3 個の値から 0 個を選択/)).toBeInTheDocument();
    });
  });

  describe('フィルタの適用', () => {
    beforeEach(async () => {
      render(<FilterModal />);
      await waitFor(() => {
        expect(screen.getByText('value1')).toBeInTheDocument();
      });
    });

    it('適用ボタンをクリックするとフィルタが適用される', async () => {
      const valueItem = screen.getByText('value1');
      await userEvent.click(valueItem);

      const applyButton = screen.getByText('適用');
      await userEvent.click(applyButton);

      expect(mockApplyFilter).toHaveBeenCalledWith('test_column', ['value1']);
      expect(mockSetFilterModal).toHaveBeenCalledWith(
        expect.objectContaining({ show: false })
      );
    });

    it('クリアボタンをクリックすると選択がクリアされる', async () => {
      const valueItem = screen.getByText('value1');
      await userEvent.click(valueItem);

      const clearButton = screen.getByText('クリア');
      await userEvent.click(clearButton);

      expect(screen.getByText(/3 個の値から 0 個を選択/)).toBeInTheDocument();
    });

    it('キャンセルボタンをクリックするとモーダルが閉じる', async () => {
      const cancelButton = screen.getByText('キャンセル');
      await userEvent.click(cancelButton);

      expect(mockSetFilterModal).toHaveBeenCalledWith(
        expect.objectContaining({ show: false })
      );
    });
  });

  describe('既存フィルタの復元', () => {
    it('モーダルが開かれたときに既存のフィルタが復元される', async () => {
      mockUseUIStore.mockReturnValue({
        ...defaultUIStoreState,
        filterModal: {
          ...defaultUIStoreState.filterModal,
          currentFilters: ['existing_value']
        }
      });

      render(<FilterModal />);

      await waitFor(() => {
        expect(screen.getByText('選択された値:')).toBeInTheDocument();
        expect(screen.getByText('existing_value', { selector: '.badge' })).toBeInTheDocument();
      });
    });
  });
}); 