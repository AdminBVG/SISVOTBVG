import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from './react-query';

describe('QueryClient prefix matching', () => {
  it('invalidates queries with matching prefix', () => {
    const qc = new QueryClient();
    const refetch = vi.fn();
    qc.subscribe(['shareholders', 1, 'search'], { refetch, setData: vi.fn() });
    qc.invalidateQueries({ queryKey: ['shareholders', 1] });
    expect(refetch).toHaveBeenCalled();
  });

  it('updates queries with matching prefix', () => {
    const qc = new QueryClient();
    qc.setQueryData(['shareholders', 1, 'search'], 1);
    qc.updateQueriesData(['shareholders', 1], (old) => (old || 0) + 1);
    expect(qc.getQueryData(['shareholders', 1, 'search'])).toBe(2);
  });
});
