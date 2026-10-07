/**
 * Shared pager — First / Prev / windowed numbers / Next / Last plus page size.
 * Same behaviour as renderPagination() in every Apps Script page.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50],
  unit = 'tasks',
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  let from = Math.max(1, current - 2);
  const to = Math.min(totalPages, from + 4);
  if (to - from < 4) from = Math.max(1, to - 4);
  const numbers = [];
  for (let p = from; p <= to; p += 1) numbers.push(p);

  const navBtn =
    'w-8 h-8 grid place-items-center rounded-lg bg-white border border-sand-200 text-sand-600 text-xs ' +
    'hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition';

  return (
    <div
      className={`px-5 py-3 border-t border-sand-200/70 bg-sand-50/60 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <span className="text-xs text-sand-500 tabular">
        Showing {start}–{end} of {total} {unit}
      </span>

      <div className="flex flex-wrap items-center justify-end gap-1">
        {totalPages > 1 && (
          <>
            <button type="button" className={navBtn} disabled={current === 1} onClick={() => onPageChange(1)} aria-label="First page">
              <i className="fas fa-angle-double-left" />
            </button>
            <button type="button" className={navBtn} disabled={current === 1} onClick={() => onPageChange(current - 1)} aria-label="Previous page">
              <i className="fas fa-angle-left" />
            </button>

            <div className="flex gap-1">
              {numbers.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === current ? 'page' : undefined}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold border transition tabular ${
                    p === current
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-sand-600 border-sand-200 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button type="button" className={navBtn} disabled={current === totalPages} onClick={() => onPageChange(current + 1)} aria-label="Next page">
              <i className="fas fa-angle-right" />
            </button>
            <button type="button" className={navBtn} disabled={current === totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
              <i className="fas fa-angle-double-right" />
            </button>
          </>
        )}

        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          aria-label="Rows per page"
          className="ml-2 border border-sand-200 rounded-lg px-2 py-1.5 text-xs text-sand-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        >
          {pageSizes.map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
