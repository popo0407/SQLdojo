import { act } from 'react-dom/test-utils';
import { useResultsExecutionStore } from './useResultsExecutionStore';

describe('useResultsExecutionStore', () => {
  it('executeSqlは最低限呼び出しできる', async () => {
    await act(async () => {
      await useResultsExecutionStore.getState().executeSql('SELECT 1');
    });
    expect(true).toBe(true);
  });
}); 