import { getContractInfo } from '../lib/account.js';
import { formatDateTime } from '../lib/format.js';

const formatDate = (iso) => formatDateTime(iso).slice(0, 10);

/**
 * 契約状況(サンプルデータ)
 *   紐付けた顧客コードの契約内容・登録カードを表示。本番では自社APIから取得する。
 */
export function renderContractScreen(root, { goHome, goApply, goBilling }) {
  const contract = getContractInfo();

  root.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button type="button" class="header-back" data-action="back">← ホーム</button>
        <span class="screen-header-title">契約状況</span>
        <span class="header-back"></span>
      </header>

      <div class="screen-body">
        <section class="card contract-hero">
          <div class="contract-hero-name" data-name></div>
          <div class="contract-hero-code" data-code></div>
          <span class="status-badge status-done" data-status></span>
        </section>

        <section class="card">
          <div class="card-label">契約者情報</div>
          <div class="kv-table" data-owner></div>
        </section>

        <section class="card">
          <div class="card-label">契約内容</div>
          <div class="kv-table" data-plan></div>
        </section>

        <section class="card">
          <div class="card-label">登録カード(<span data-card-count></span>枚)</div>
          <div class="card-list" data-cards></div>
        </section>

        <section class="card">
          <div class="card-label">お支払い</div>
          <div class="kv-table" data-payment></div>
          <button type="button" class="btn btn-secondary btn-block section-gap-sm" data-action="billing">ご請求額を見る</button>
        </section>

        <button type="button" class="btn btn-primary btn-block section-gap" data-action="add-card">カードを追加発行する</button>
        <button type="button" class="btn btn-secondary btn-block" data-action="change">登録情報を変更する</button>
        <p class="footnote">表示内容はサンプルです。本番ではご契約情報を自社システムから取得して表示します。</p>
      </div>
    </div>
  `;

  root.querySelector('[data-name]').textContent = `${contract.customerName} 様`;
  root.querySelector('[data-code]').textContent = `顧客コード ${contract.customerCode}`;
  root.querySelector('[data-status]').textContent = `契約${contract.status}`;
  root.querySelector('[data-card-count]').textContent = String(contract.cardCount);

  fillTable(root.querySelector('[data-owner]'), [
    ['契約種別', contract.contractType],
    ['ご登録電話番号', contract.phoneMasked],
  ]);
  fillTable(root.querySelector('[data-plan]'), [
    ['プラン', contract.plan],
    ['契約状態', contract.status],
    ['契約開始日', formatDate(contract.startDate)],
  ]);
  fillTable(root.querySelector('[data-payment]'), [
    ['お支払い方法', contract.paymentMethod],
    ['次回お支払い予定日', formatDate(contract.nextBillingDate)],
  ]);

  // ---- 登録カード ----
  const cardsEl = root.querySelector('[data-cards]');
  for (const card of contract.cards) {
    const row = document.createElement('div');
    row.className = 'card-row';
    row.innerHTML = `
      <span class="card-row-icon">💳</span>
      <span class="card-row-text">
        <span class="card-row-number"></span>
        <span class="card-row-sub"></span>
      </span>
    `;
    row.querySelector('.card-row-number').textContent = card.masked;
    row.querySelector('.card-row-sub').textContent = `${card.label} ・ ${card.vehicle}`;
    if (card.linked) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-ok';
      badge.textContent = '紐付けに使用';
      row.appendChild(badge);
    }
    cardsEl.appendChild(row);
  }

  root.querySelector('[data-action="back"]').addEventListener('click', goHome);
  root.querySelector('[data-action="billing"]').addEventListener('click', goBilling);
  root.querySelector('[data-action="add-card"]').addEventListener('click', () => goApply('card-add'));
  root.querySelector('[data-action="change"]').addEventListener('click', () => goApply('info-change'));
}

function fillTable(el, rows) {
  for (const [key, value] of rows) {
    const row = document.createElement('div');
    row.className = 'kv-row';
    const k = document.createElement('span');
    k.textContent = key;
    const v = document.createElement('span');
    v.textContent = value;
    row.appendChild(k);
    row.appendChild(v);
    el.appendChild(row);
  }
}
