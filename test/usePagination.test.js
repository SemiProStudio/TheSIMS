// =============================================================================
// usePagination Hook Tests
// Tests the pagination logic hook
// =============================================================================

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../hooks/usePagination.js';

// Helper to generate items
const makeItems = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe('usePagination', () => {
  it('returns first page of items', () => {
    const items = makeItems(50);
    const { result } = renderHook(() => usePagination(items, 20));
    expect(result.current.paginatedItems).toHaveLength(20);
    expect(result.current.paginatedItems[0].id).toBe(1);
    expect(result.current.paginatedItems[19].id).toBe(20);
  });

  it('calculates totalPages correctly', () => {
    expect(renderHook(() => usePagination(makeItems(50), 20)).result.current.totalPages).toBe(3);
    expect(renderHook(() => usePagination(makeItems(40), 20)).result.current.totalPages).toBe(2);
    expect(renderHook(() => usePagination(makeItems(20), 20)).result.current.totalPages).toBe(1);
    expect(renderHook(() => usePagination(makeItems(0), 20)).result.current.totalPages).toBe(0);
  });

  it('starts on page 1', () => {
    const { result } = renderHook(() => usePagination(makeItems(50), 20));
    expect(result.current.page).toBe(1);
  });

  it('navigates to next page', () => {
    const items = makeItems(50);
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
    expect(result.current.paginatedItems[0].id).toBe(21);
  });

  it('navigates to previous page', () => {
    const items = makeItems(50);
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.nextPage());
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });

  it('does not go below page 1', () => {
    const { result } = renderHook(() => usePagination(makeItems(50), 20));
    act(() => result.current.prevPage());
    expect(result.current.page).toBe(1);
  });

  it('does not go above totalPages', () => {
    const items = makeItems(50);
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.goToPage(100));
    expect(result.current.page).toBe(3);
  });

  it('goToPage navigates to specific page', () => {
    const items = makeItems(100);
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.goToPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.paginatedItems[0].id).toBe(41);
  });

  it('hasNext is true when not on last page', () => {
    const { result } = renderHook(() => usePagination(makeItems(50), 20));
    expect(result.current.hasNext).toBe(true);
  });

  it('hasNext is false on last page', () => {
    const items = makeItems(50);
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.goToPage(3));
    expect(result.current.hasNext).toBe(false);
  });

  it('hasPrev is false on first page', () => {
    const { result } = renderHook(() => usePagination(makeItems(50), 20));
    expect(result.current.hasPrev).toBe(false);
  });

  it('hasPrev is true when not on first page', () => {
    const items = makeItems(50);
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.nextPage());
    expect(result.current.hasPrev).toBe(true);
  });

  it('handles last page with fewer items', () => {
    const items = makeItems(25);
    const { result } = renderHook(() => usePagination(items, 20));
    act(() => result.current.goToPage(2));
    expect(result.current.paginatedItems).toHaveLength(5);
    expect(result.current.paginatedItems[0].id).toBe(21);
  });

  it('handles empty items array', () => {
    const { result } = renderHook(() => usePagination([], 20));
    expect(result.current.paginatedItems).toHaveLength(0);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.page).toBe(1);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrev).toBe(false);
  });

  it('uses default pageSize of 20', () => {
    const items = makeItems(25);
    const { result } = renderHook(() => usePagination(items));
    expect(result.current.paginatedItems).toHaveLength(20);
    expect(result.current.totalPages).toBe(2);
  });

  it('resets to page 1 when items shrink below current page', () => {
    let items = makeItems(100);
    const { result, rerender } = renderHook(
      ({ items: i }) => usePagination(i, 20),
      { initialProps: { items } }
    );
    // Go to page 5
    act(() => result.current.goToPage(5));
    expect(result.current.page).toBe(5);

    // Shrink items so page 5 no longer exists
    items = makeItems(10);
    rerender({ items });
    // Hook should reset to page 1
    expect(result.current.page).toBe(1);
  });

  it('updates paginatedItems when items change', () => {
    let items = makeItems(50);
    const { result, rerender } = renderHook(
      ({ items: i }) => usePagination(i, 20),
      { initialProps: { items } }
    );
    expect(result.current.paginatedItems[0].id).toBe(1);

    // Replace with different items
    items = Array.from({ length: 50 }, (_, i) => ({ id: i + 100 }));
    rerender({ items });
    expect(result.current.paginatedItems[0].id).toBe(100);
  });
});
