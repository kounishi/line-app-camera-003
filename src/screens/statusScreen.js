import { getLink } from '../lib/account.js';
import { getApplicationStatus, loadApplications, removeApplication } from '../lib/applications.js';
import { showConfirm, showToast } from '../lib/dialogs.js';
import { formatDateTime } from '../lib/format.js';

/**
 * 申請状況
 *   自分(紐付けた顧客コード)の申請を新しい順に表示。行をタップすると申請内容を展開。
 *   受付済みのうちは取り消しできる(サンプル)。
 */
export function renderStatusScreen(root, { goHome, goApply }) {
  const link = getLink();
  let applications = loadApplications(link.customerCode);

  function render() {
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="back">← ホーム</button>
          <span class="screen-header-title">申請状況(${applications.length}件)</span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <div class="banner banner-ok" data-customer></div>
          <div class="list-content section-gap" data-list></div>
          <button type="button" class="btn btn-secondary btn-block section-gap" data-action="apply">新しく申請する</button>
          <p class="footnote">サンプル: 受付から1分で「処理中」、3分で「完了」に変わります。本番ではサーバーの処理状況を表示します。</p>
        </div>
      </div>
    `;
    root.querySelector('[data-customer]').textContent = `顧客コード ${link.customerCode}(${link.customerName} 様)`;

    const listEl = root.querySelector('[data-list]');
    if (applications.length === 0) {
      listEl.innerHTML = `
        <div class="list-empty">
          <p>まだ申請はありません。</p>
          <button type="button" class="btn btn-primary" data-action="apply">📝 各種申請へ</button>
        </div>
      `;
      listEl.querySelector('[data-action="apply"]').addEventListener('click', () => goApply());
    } else {
      for (const application of applications) {
        listEl.appendChild(buildRow(application));
      }
    }

    root.querySelector('[data-action="back"]').addEventListener('click', goHome);
    root.querySelector('.screen-body > [data-action="apply"]').addEventListener('click', () => goApply());
  }

  function buildRow(application) {
    const status = getApplicationStatus(application);

    const row = document.createElement('div');
    row.className = 'status-row';

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'status-row-head';
    head.innerHTML = `
      <span class="status-row-text">
        <span class="status-title"></span>
        <span class="status-meta"></span>
      </span>
      <span class="status-badge"></span>
    `;
    head.querySelector('.status-title').textContent = application.typeName;
    head.querySelector('.status-meta').textContent =
      `受付番号 ${application.receiptNo} ・ ${formatDateTime(application.submittedAt)}`;
    const badge = head.querySelector('.status-badge');
    badge.textContent = status.label;
    badge.classList.add(`status-${status.key}`);

    const details = document.createElement('div');
    details.className = 'status-details hidden';
    for (const item of application.summary ?? []) {
      const kv = document.createElement('div');
      kv.className = 'kv-row';
      const k = document.createElement('span');
      k.textContent = item.label;
      const v = document.createElement('span');
      v.textContent = item.value;
      kv.appendChild(k);
      kv.appendChild(v);
      details.appendChild(kv);
    }
    if (status.key === 'accepted') {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn btn-clear btn-block';
      cancel.textContent = 'この申請を取り消す';
      cancel.addEventListener('click', async () => {
        const ok = await showConfirm('申請の取り消し', `受付番号 ${application.receiptNo} の申請を取り消しますか?`, {
          confirmText: '取り消す',
          destructive: true,
        });
        if (ok) {
          removeApplication(application.id);
          applications = loadApplications(link.customerCode);
          showToast('申請を取り消しました');
          render();
        }
      });
      details.appendChild(cancel);
    }

    head.addEventListener('click', () => details.classList.toggle('hidden'));

    row.appendChild(head);
    row.appendChild(details);
    return row;
  }

  render();
}
