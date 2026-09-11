import { APPLICATION_TYPES, findApplicationType } from '../data/applicationTypes.js';
import { getCurrentUserKey, getLink } from '../lib/account.js';
import { submitApplication } from '../lib/applications.js';
import { showAlert, showConfirm, showToast } from '../lib/dialogs.js';

/**
 * 各種申請
 *   申請の種類一覧 → 入力フォーム → 確認 → 送信(サンプル: 端末内に保存) → 申請状況へ
 *   紐付け済みであることは app.js 側で保証される
 */
export function renderApplyScreen(root, { goHome, goStatus, initialTypeId }) {
  const link = getLink();

  // ================= 申請の種類一覧 =================
  function renderTypes() {
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="back">← ホーム</button>
          <span class="screen-header-title">各種申請</span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <div class="banner banner-ok" data-customer></div>
          <p class="section-title">申請の種類を選んでください</p>
          <div class="menu-list" data-types></div>
          <button type="button" class="btn btn-secondary btn-block section-gap" data-action="status">申請状況を確認する</button>
        </div>
      </div>
    `;
    root.querySelector('[data-customer]').textContent =
      `顧客コード ${link.customerCode}(${link.customerName} 様)として申請します`;

    const listEl = root.querySelector('[data-types]');
    for (const type of APPLICATION_TYPES) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'menu-row';
      row.innerHTML = `
        <span class="menu-row-icon"></span>
        <span class="menu-row-text">
          <span class="menu-row-label"></span>
          <span class="menu-row-desc"></span>
        </span>
        <span class="menu-row-chevron">›</span>
      `;
      row.querySelector('.menu-row-icon').textContent = type.icon;
      row.querySelector('.menu-row-label').textContent = type.name;
      row.querySelector('.menu-row-desc').textContent = type.description;
      row.addEventListener('click', () => renderForm(type));
      listEl.appendChild(row);
    }

    root.querySelector('[data-action="back"]').addEventListener('click', goHome);
    root.querySelector('[data-action="status"]').addEventListener('click', goStatus);
  }

  // ================= 入力フォーム =================
  function renderForm(type) {
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="types">← 申請の種類</button>
          <span class="screen-header-title" data-title></span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <section class="card">
            <div class="card-label">申請内容</div>
            <p class="card-text" data-desc></p>
            <div class="kv-row"><span>顧客コード</span><span data-code></span></div>
            <div class="kv-row"><span>お名前</span><span data-name></span></div>
          </section>

          <form class="card" data-form novalidate>
            <div data-fields></div>
            <p class="form-note">送信後は「申請状況」から受付・処理状況を確認できます。</p>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-block" data-action="submit">申請内容を確認して送信</button>
            </div>
          </form>

          <button type="button" class="btn-link" data-action="types">申請の種類に戻る</button>
        </div>
      </div>
    `;
    root.querySelector('[data-title]').textContent = type.name;
    root.querySelector('[data-desc]').textContent = type.description;
    root.querySelector('[data-code]').textContent = link.customerCode;
    root.querySelector('[data-name]').textContent = `${link.customerName} 様`;

    const fieldsEl = root.querySelector('[data-fields]');
    for (const field of type.fields) {
      fieldsEl.appendChild(buildField(field));
    }

    const form = root.querySelector('[data-form]');
    let busy = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;

      const values = {};
      const summary = [];
      for (const field of type.fields) {
        const el = form.querySelector(`[name="${field.key}"]`);
        const value = (el?.value ?? '').trim();
        if (field.required && !value) {
          await showAlert('未入力の項目があります', `「${field.label}」を入力してください。`);
          el?.focus();
          return;
        }
        values[field.key] = value;
        if (value) summary.push({ label: field.label, value });
      }

      const ok = await showConfirm(
        '申請内容の確認',
        [`${type.name}`, '', ...summary.map((s) => `${s.label}: ${s.value}`), '', 'この内容で送信しますか?'].join('\n'),
        { confirmText: '送信する' }
      );
      if (!ok) return;

      busy = true;
      const submitBtn = root.querySelector('[data-action="submit"]');
      submitBtn.classList.add('btn-disabled');
      submitBtn.textContent = '送信中…';
      try {
        const application = await submitApplication({
          typeId: type.id,
          typeName: type.name,
          values,
          summary,
          customerCode: link.customerCode,
          lineUserId: getCurrentUserKey(),
        });
        await showAlert('申請を受け付けました', `受付番号: ${application.receiptNo}\n\n処理状況は「申請状況」からご確認いただけます。`);
        showToast('申請を送信しました');
        goStatus();
      } catch (e) {
        busy = false;
        submitBtn.classList.remove('btn-disabled');
        submitBtn.textContent = '申請内容を確認して送信';
        await showAlert('送信できませんでした', e instanceof Error ? e.message : String(e));
      }
    });

    root.querySelectorAll('[data-action="types"]').forEach((el) => el.addEventListener('click', renderTypes));
  }

  /** 入力項目の定義から DOM を作る */
  function buildField(field) {
    const wrap = document.createElement('div');
    wrap.className = 'form-field';

    const label = document.createElement('label');
    label.className = 'input-label';
    label.htmlFor = `field-${field.key}`;
    label.textContent = field.label;
    if (field.required) {
      const req = document.createElement('span');
      req.className = 'form-required';
      req.textContent = '必須';
      label.appendChild(req);
    }
    wrap.appendChild(label);

    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '選択してください';
      input.appendChild(placeholder);
      for (const option of field.options ?? []) {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        input.appendChild(opt);
      }
    } else {
      input = document.createElement('input');
      input.type = field.type === 'date' ? 'date' : field.type === 'tel' ? 'tel' : 'text';
      if (field.inputmode) input.inputMode = field.inputmode;
      if (field.maxlength) input.maxLength = field.maxlength;
      input.autocomplete = 'off';
    }
    input.id = `field-${field.key}`;
    input.name = field.key;
    input.className = 'text-input';
    if (field.placeholder) input.placeholder = field.placeholder;
    wrap.appendChild(input);
    return wrap;
  }

  const initialType = initialTypeId ? findApplicationType(initialTypeId) : null;
  if (initialType) renderForm(initialType);
  else renderTypes();
}
