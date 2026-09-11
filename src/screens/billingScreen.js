import { getLink } from '../lib/account.js';
import { BILLING_STATUS_LABELS, formatYearMonth, formatYen, getBillingInfo } from '../lib/billing.js';
import { formatDateTime } from '../lib/format.js';

const formatDate = (iso) => formatDateTime(iso).slice(0, 10);

/**
 * ご請求額(サンプルデータ)
 *   今月のご請求額(前月ご利用分)・内訳・お支払い情報・過去6か月のご請求を表示する。
 *   紐付け済みであることは app.js 側で保証される。本番では自社の請求システムから取得する。
 */
export function renderBillingScreen(root, { goHome, goApply, goContract }) {
  const link = getLink();
  const billing = getBillingInfo(link);
  const current = billing.current;
  const currentStatus = BILLING_STATUS_LABELS[current.status];

  root.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button type="button" class="header-back" data-action="back">← ホーム</button>
        <span class="screen-header-title">ご請求額</span>
        <span class="header-back"></span>
      </header>

      <div class="screen-body">
        <div class="banner banner-ok" data-customer></div>

        <section class="card billing-hero">
          <div class="billing-hero-label" data-period></div>
          <div class="billing-hero-amount" data-amount></div>
          <span class="status-badge" data-status></span>
          <div class="billing-hero-sub" data-payment-note></div>
        </section>

        <section class="card">
          <div class="card-label">内訳</div>
          <div class="kv-table" data-breakdown></div>
          <div class="kv-row kv-row-total"><span>合計(税込)</span><span data-total></span></div>
        </section>

        <section class="card">
          <div class="card-label">お支払い</div>
          <div class="kv-table" data-payment></div>
        </section>

        <section class="card">
          <div class="card-label">過去6か月のご請求</div>
          <div class="billing-history" data-history></div>
          <div class="kv-row kv-row-total"><span>6か月合計</span><span data-history-total></span></div>
        </section>

        <button type="button" class="btn btn-secondary btn-block section-gap" data-action="contract">契約状況を見る</button>
        <button type="button" class="btn btn-secondary btn-block" data-action="change">お支払い方法を変更する</button>
        <p class="footnote">表示内容はサンプルです。本番ではご請求情報を自社システムから取得して表示します。ご利用明細の詳細はETC利用照会サービス等をご確認ください。</p>
      </div>
    </div>
  `;

  root.querySelector('[data-customer]').textContent = `顧客コード ${billing.customerCode}(${billing.customerName} 様)`;

  // ---- 今月のご請求額 ----
  root.querySelector('[data-period]').textContent =
    `${formatYearMonth(current.yearMonth)}ご請求分(${formatYearMonth(current.usageMonth)}ご利用分)`;
  root.querySelector('[data-amount]').textContent = formatYen(current.amount);
  const statusEl = root.querySelector('[data-status]');
  statusEl.textContent = currentStatus.label;
  statusEl.classList.add(`status-${currentStatus.key}`);
  root.querySelector('[data-payment-note]').textContent =
    current.status === 'estimated'
      ? `${formatDate(current.fixDate)} に請求額が確定し、${formatDate(current.paymentDate)} にお支払い(${billing.paymentMethod})の予定です。表示は見込額です。`
      : current.status === 'fixed'
        ? `お支払い予定日 ${formatDate(current.paymentDate)}(${billing.paymentMethod})`
        : `${formatDate(current.paymentDate)} にお支払い済み(${billing.paymentMethod})`;

  // ---- 内訳 ----
  fillTable(
    root.querySelector('[data-breakdown]'),
    current.breakdown.map((row) => [row.label, formatYen(row.amount), row.amount < 0 ? 'amount-discount' : ''])
  );
  root.querySelector('[data-total]').textContent = formatYen(current.amount);

  // ---- お支払い ----
  fillTable(root.querySelector('[data-payment]'), [
    ['お支払い方法', billing.paymentMethod],
    ['請求確定日', '毎月10日(前月ご利用分)'],
    ['お支払い日', '毎月27日(金融機関休業日の場合は翌営業日)'],
    ['ご利用カード枚数', `${billing.cardCount}枚`],
  ]);

  // ---- 過去のご請求 ----
  const historyEl = root.querySelector('[data-history]');
  for (const month of billing.history) {
    const status = BILLING_STATUS_LABELS[month.status];
    const row = document.createElement('div');
    row.className = 'billing-history-row';

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'billing-history-head';
    head.innerHTML = `
      <span class="billing-history-month"></span>
      <span class="status-badge"></span>
      <span class="billing-history-amount"></span>
    `;
    head.querySelector('.billing-history-month').textContent = `${formatYearMonth(month.yearMonth)}分`;
    const badge = head.querySelector('.status-badge');
    badge.textContent = status.label;
    badge.classList.add(`status-${status.key}`);
    head.querySelector('.billing-history-amount').textContent = formatYen(month.amount);

    const details = document.createElement('div');
    details.className = 'status-details hidden';
    fillTable(details, [
      ['ご利用月', formatYearMonth(month.usageMonth)],
      ...month.breakdown.map((b) => [b.label, formatYen(b.amount), b.amount < 0 ? 'amount-discount' : '']),
      ['お支払い日', formatDate(month.paymentDate)],
    ]);
    head.addEventListener('click', () => details.classList.toggle('hidden'));

    row.appendChild(head);
    row.appendChild(details);
    historyEl.appendChild(row);
  }
  root.querySelector('[data-history-total]').textContent = formatYen(billing.historyTotal);

  root.querySelector('[data-action="back"]').addEventListener('click', goHome);
  root.querySelector('[data-action="contract"]').addEventListener('click', goContract);
  root.querySelector('[data-action="change"]').addEventListener('click', () => goApply('info-change'));
}

function fillTable(el, rows) {
  for (const [key, value, valueClass] of rows) {
    const row = document.createElement('div');
    row.className = 'kv-row';
    const k = document.createElement('span');
    k.textContent = key;
    const v = document.createElement('span');
    v.textContent = value;
    if (valueClass) v.className = valueClass;
    row.appendChild(k);
    row.appendChild(v);
    el.appendChild(row);
  }
}
