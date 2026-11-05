/*
 * Adapted from BeUI's use-row-selection.ts via t3grp/t3UI commit
 * 66ff17008ebf30e73e7662234e3f14660f8a5c14, originally starc007/ui-components
 * fa3279fd8ae52b78b7bef089dab5a703003a5ed9. Bootstrap removes the generic
 * row wrapper; selection is keyed by canonical row IDs, including filtered views.
 *
 * MIT License
 * Copyright (c) 2026 Saurabh Chauhan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { useCallback, useMemo, useState } from "react";

export function useRowSelection({
  sortedRows,
  selectedRowIds,
  defaultSelectedRowIds,
  onSelectionChange,
}: {
  sortedRows: { id: string }[];
  selectedRowIds?: string[];
  defaultSelectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [internalSelected, setInternalSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedRowIds),
  );
  const selected = useMemo(
    () =>
      selectedRowIds !== undefined ? new Set(selectedRowIds) : internalSelected,
    [selectedRowIds, internalSelected],
  );
  const commit = useCallback(
    (next: Set<string>) => {
      if (selectedRowIds === undefined) setInternalSelected(next);
      onSelectionChange?.([...next]);
    },
    [selectedRowIds, onSelectionChange],
  );

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((row) => selected.has(row.id));
  const someSelected = sortedRows.some((row) => selected.has(row.id));
  const toggleAll = useCallback(() => {
    const next = new Set(selected);
    if (allSelected) for (const row of sortedRows) next.delete(row.id);
    else for (const row of sortedRows) next.add(row.id);
    commit(next);
  }, [allSelected, sortedRows, selected, commit]);
  const toggleRow = useCallback(
    (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      commit(next);
    },
    [selected, commit],
  );

  return { selected, allSelected, someSelected, toggleAll, toggleRow };
}
