/* Copied from UIFoundry packages/react/table/table.tsx at commit c2c6b490e422e8a63739408a21e3c312b55ade34.
 * MIT licence, see src/ui/NOTICE.md. Local changes: none. */
import { useId, type ReactNode } from "react";

export type TableAlign = "start" | "end";
export type TableSortDirection = "ascending" | "descending";
export type TableSort = { key: string; direction: TableSortDirection };

export type TableColumn = {
  key: string;
  header: string;
  sortable?: boolean;
  align?: TableAlign;
};

export type TablePagination = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export type TableProps = {
  /** Names the table; render it visually hidden when the caption should only be read. */
  caption: string;
  captionHidden?: boolean;
  columns: TableColumn[];
  rows: Array<Record<string, ReactNode> & { id: string }>;
  /** Controlled sort; the header button asks for the next direction, the caller applies it. */
  sort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  /** Controlled selection of row ids. */
  selection?: string[];
  onSelectionChange?: (selection: string[]) => void;
  /** Announced beside the count; defaults to the platform's phrasing. */
  selectionLabel?: (selected: number, total: number) => string;
  dense?: boolean;
  stickyHeader?: boolean;
  /** A static skeleton row, never a shimmer. */
  loading?: boolean;
  emptyMessage?: string;
  pagination?: TablePagination;
};

function classes(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(" ");
}

/**
 * Table presents dense data with native table semantics: a caption, th scope, a sort button inside a
 * sortable header with aria-sort on the cell, and a checkbox per row labelled by its row identity.
 * Sorting, selection and pagination are controlled: this component reports the intent and the caller
 * owns the state. Nothing animates; loading is a static skeleton row.
 */
export function Table(props: TableProps): ReactNode {
  const {
    caption,
    captionHidden = false,
    columns,
    rows,
    sort,
    onSortChange,
    selection = [],
    onSelectionChange,
    selectionLabel = (selected, total) => `${selected} of ${total} rows selected`,
    dense = false,
    stickyHeader = false,
    loading = false,
    emptyMessage = "No rows to show.",
    pagination,
  } = props;

  const captionId = useId();
  const selectable = Boolean(onSelectionChange);
  const allSelected = rows.length > 0 && rows.every((row) => selection.includes(row.id));
  const someSelected = rows.some((row) => selection.includes(row.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : rows.map((row) => row.id));
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selection.includes(id) ? selection.filter((value) => value !== id) : [...selection, id],
    );
  };

  const requestSort = (column: TableColumn) => {
    if (!onSortChange) return;
    const direction: TableSortDirection =
      sort && sort.key === column.key && sort.direction === "ascending" ? "descending" : "ascending";
    onSortChange({ key: column.key, direction });
  };

  const ariaSort = (column: TableColumn): "ascending" | "descending" | "none" => {
    if (!column.sortable) return "none";
    return sort && sort.key === column.key ? sort.direction : "none";
  };

  return (
    <>
      <div className="ss-table-scroll" tabIndex={0} role="region" aria-labelledby={captionId}>
        <table className={classes("ss-table", dense && "ss-table--dense", stickyHeader && "ss-table--sticky")}>
          <caption className={classes("ss-table__caption", captionHidden && "ss-visually-hidden")} id={captionId}>
            {caption}
          </caption>
          <thead>
            <tr>
              {selectable ? (
                <th scope="col">
                  <input
                    className="ss-table__check"
                    type="checkbox"
                    aria-label="Select all visible rows"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? ariaSort(column) : undefined}
                  className={column.align === "end" ? "ss-table__numeral" : undefined}
                >
                  {column.sortable ? (
                    <button className="ss-table__sort" type="button" onClick={() => requestSort(column)}>
                      {column.header}
                      <span className="ss-table__sort-indicator" aria-hidden="true" />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="ss-table__state">
                <td colSpan={columns.length + (selectable ? 1 : 0)} role="status" aria-label="Loading rows">
                  <span className="ss-table__skeleton-line" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr className="ss-table__state">
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <p className="ss-table__state-message">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} aria-selected={selection.includes(row.id) ? "true" : undefined}>
                  {selectable ? (
                    <td>
                      <input
                        className="ss-table__check"
                        type="checkbox"
                        aria-label={`Select ${String(row[columns[0]?.key] ?? row.id)}`}
                        checked={selection.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} className={column.align === "end" ? "ss-table__numeral" : undefined}>
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="ss-table__footer">
        <p className="ss-table__range">
          {pagination
            ? `Rows ${(pagination.page - 1) * pagination.pageSize + 1} to ${Math.min(
                pagination.page * pagination.pageSize,
                pagination.total,
              )} of ${pagination.total}`
            : `Rows 1 to ${rows.length} of ${rows.length}`}
        </p>
        {selectable ? (
          <p className="ss-table__range" role="status" aria-live="polite">
            {selection.length === 0 ? "No rows selected" : selectionLabel(selection.length, rows.length)}
          </p>
        ) : null}
        {pagination ? (
          <ul className="ss-table__pagination">
            <li>
              <button
                className="ss-table__page"
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                Previous
              </button>
            </li>
            <li>
              <button className="ss-table__page" type="button" aria-current="page">
                {pagination.page}
              </button>
            </li>
            <li>
              <button
                className="ss-table__page"
                type="button"
                disabled={pagination.page * pagination.pageSize >= pagination.total}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        ) : null}
      </div>
    </>
  );
}
