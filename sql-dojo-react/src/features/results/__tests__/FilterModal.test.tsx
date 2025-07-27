import { render, screen, waitFor } from '@testing-library/react';
import { vi, it, expect, describe, beforeEach } from 'vitest';
import FilterModal from '../FilterModal';
import { useResultsSessionStore } from '../../../stores/useResultsSessionStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useResultsFilterStore } from '../../../stores/useResultsFilterStore';
import { getUniqueValues } from '../../../api/metadataService';
import * as metadataService from '../../../api/metadataService';

vi.mock('../../../stores/useResultsSessionStore');
vi.mock('../../../stores/useUIStore');
vi.mock('../../../stores/useResultsFilterStore');
vi.mock('../../../api/metadataService');

let mockSessionStoreState: Record<string, unknown> | null;
let mockUIStoreState: Record<string, unknown> | null;
let mockFilterStoreState: Record<string, unknown> | null;

const defaultSessionStoreState = { sessionId: 'test-session-id' };
const defaultUIStoreState = {
  filterModal: { show: true, columnName: 'test_column', currentFilters: [] },
  setFilterModal: vi.fn()
};
const defaultFilterStoreState = { filters: {}, applyFilter: vi.fn() };

beforeEach(() => {
  mockSessionStoreState = { ...defaultSessionStoreState };
  mockUIStoreState = { ...defaultUIStoreState };
  mockFilterStoreState = { ...defaultFilterStoreState };
  vi.mocked(useResultsSessionStore).mockImplementation(() => mockSessionStoreState);
  vi.mocked(useUIStore).mockImplementation(() => mockUIStoreState);
  vi.mocked(useResultsFilterStore).mockImplementation(() => mockFilterStoreState);
});

describe('FilterModal', () => {
  it('セッションIDがない場合はエラーメッセージを表示', async () => {
    mockSessionStoreState = null;
    vi.mocked(useResultsSessionStore).mockImplementation(() => mockSessionStoreState);
    vi.mocked(getUniqueValues).mockImplementation(() => Promise.resolve({ values: [], truncated: false }));
    render(<FilterModal />);
    expect(await screen.findByText('セッションIDがありません。')).toBeInTheDocument();
  });

  it('ユニーク値取得APIが呼ばれ、値が表示される', async () => {
    const apiSpy = vi.spyOn(metadataService, 'getUniqueValues').mockResolvedValue({ values: ['value1', 'value2'], truncated: false });
    render(<FilterModal />);
    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith(expect.objectContaining({
        session_id: expect.anything(),
        column_name: expect.anything(),
        filters: expect.anything()
      }));
      expect(screen.getByText('value1')).toBeInTheDocument();
      expect(screen.getByText('value2')).toBeInTheDocument();
    });
    apiSpy.mockRestore();
  });

  it('ローディング中はメッセージが表示される', async () => {
    vi.spyOn(metadataService, 'getUniqueValues').mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ values: ['value1'], truncated: false }), 100)));
    render(<FilterModal />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('APIエラー時はエラーメッセージが表示される', async () => {
    vi.spyOn(metadataService, 'getUniqueValues').mockRejectedValue(new Error('API Error'));
    render(<FilterModal />);
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('truncatedフラグtrueで警告メッセージが表示される', async () => {
    vi.spyOn(metadataService, 'getUniqueValues').mockResolvedValue({ values: ['value1'], truncated: true });
    render(<FilterModal />);
    await waitFor(() => {
      expect(screen.getByText(/候補は最大/)).toBeInTheDocument();
    });
  });
}); 