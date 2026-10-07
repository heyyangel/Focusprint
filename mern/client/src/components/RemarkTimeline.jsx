import { fmtFullTimestamp, remarkHistory } from '../utils/format';
import { htmlDialog, alertDialog } from '../utils/ui';

const esc = (s) =>
  String(s === null || s === undefined ? '' : s).replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );

/**
 * Opens the remark history timeline — port of viewRemarkHistory() from the
 * Delegation and Tasks pages. Rendered through SweetAlert2 so it behaves the
 * same everywhere it is triggered from.
 */
export function showRemarkTimeline(remarks) {
  const history = remarkHistory(remarks);

  if (!history.length) {
    return alertDialog({
      title: 'No History',
      text: 'No remarks have been recorded for this task yet.',
    });
  }

  const rows = history
    .map((h, index) => {
      const isLast = index === history.length - 1;
      const when = h.time === 'Original' ? 'Original' : fmtFullTimestamp(h.time, '');
      const statusPill =
        h.status && h.status !== 'No Change'
          ? `<span style="background:#f9e8dc;color:#763c1b;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;">${esc(h.status)}</span>`
          : '';
      const userPill = h.user
        ? `<span style="background:#e8e1d7;color:#63564a;font-size:9px;font-weight:500;padding:2px 6px;border-radius:4px;">${esc(h.user)}</span>`
        : '';

      return `
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
          <div style="width:10px;height:10px;border-radius:50%;background:${isLast ? '#904a20' : '#d6cabb'};box-shadow:${isLast ? '0 0 0 4px #f9e8dc' : 'none'};"></div>
          ${!isLast ? '<div style="width:2px;flex:1;background:#e8e1d7;margin:4px 0;"></div>' : ''}
        </div>
        <div style="background:#faf8f5;border:1px solid #e8e1d7;border-radius:12px;padding:12px;flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-family:monospace;color:#9a8874;font-size:10px;">${esc(when)}</span>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">${userPill}${statusPill}</div>
          </div>
          <div style="font-weight:600;color:#332c26;font-size:12px;line-height:1.5;word-break:break-word;text-align:left;">${esc(h.remark) || '—'}</div>
        </div>
      </div>`;
    })
    .join('');

  return htmlDialog({
    title:
      '<span style="font-size:18px;font-weight:700;color:#332c26;display:flex;align-items:center;gap:8px;justify-content:center;">' +
      '<i class="fas fa-clock-rotate-left" style="color:#904a20"></i> Remark Timeline</span>',
    html: `<div style="text-align:left;max-height:350px;overflow-y:auto;padding-right:4px;">${rows}</div>`,
  });
}

export default showRemarkTimeline;
