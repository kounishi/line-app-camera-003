import { CONTACTS, CONTACT_TYPES } from '../data/contacts.js';

/** 全角英数を半角にして空白を除き小文字化(検索用) */
function normalize(text) {
  return String(text ?? '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * 緊急連絡先
 *   高速道路・ETCに関する連絡先(道路緊急ダイヤル、高速道路各社のお客さまセンター、当社窓口など)を
 *   キーワード(道路名・状況)と種別で検索し、そのまま電話をかけられる。
 *   ※ 次の段階でメニュー化(状況から選ぶ など)を予定。現段階は検索画面のみ。
 */
export function renderContactsScreen(root, { goHome }) {
  const state = {
    keyword: '',
    type: 'すべて',
  };

  root.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button type="button" class="header-back" data-action="back">← ホーム</button>
        <span class="screen-header-title">緊急連絡先</span>
        <span class="header-back"></span>
      </header>

      <div class="screen-body">
        <section class="card urgent-card">
          <div class="card-label">🚨 事故・故障などの緊急時はまずこちら</div>
          <div class="urgent-row" data-urgent></div>
        </section>

        <div class="search-bar section-gap-sm">
          <input class="text-input" type="search" data-keyword autocomplete="off"
            placeholder="道路名・状況で検索(例: 東名、首都高、故障、紛失)" />
        </div>
        <div class="chip-row" data-types></div>
        <p class="result-count" data-count></p>
        <div class="list-content" data-results></div>
        <p class="footnote">
          高速道路会社・公的機関の電話番号は作成時点の公開情報を参考にしたものです。運用前に必ず各社公式サイトで最新の番号・受付時間をご確認ください。
          「(サンプル)」と付いた窓口は架空です。
        </p>
      </div>
    </div>
  `;

  const keywordInput = root.querySelector('[data-keyword]');
  const typesEl = root.querySelector('[data-types]');
  const countEl = root.querySelector('[data-count]');
  const resultsEl = root.querySelector('[data-results]');

  // ---- 緊急時の連絡先(常に上部に表示) ----
  const urgentEl = root.querySelector('[data-urgent]');
  for (const contact of CONTACTS.filter((c) => c.urgent)) {
    const a = document.createElement('a');
    a.className = 'urgent-item';
    a.href = contact.tel;
    a.innerHTML = '<span class="urgent-name"></span><span class="urgent-phone"></span>';
    a.querySelector('.urgent-name').textContent = contact.name.replace('(サンプル)', '');
    a.querySelector('.urgent-phone').textContent = `📞 ${contact.phone}`;
    urgentEl.appendChild(a);
  }

  // ---- 種別チップ ----
  for (const type of CONTACT_TYPES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = type;
    chip.dataset.type = type;
    chip.addEventListener('click', () => {
      state.type = type;
      updateChips();
      renderResults();
    });
    typesEl.appendChild(chip);
  }
  function updateChips() {
    typesEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.type === state.type));
  }

  // ---- キーワード ----
  keywordInput.addEventListener('input', () => {
    state.keyword = keywordInput.value;
    renderResults();
  });

  // ---- 結果 ----
  function filtered() {
    const kw = normalize(state.keyword);
    let list = CONTACTS.filter((c) => state.type === 'すべて' || c.type === state.type);
    if (kw) {
      list = list.filter((c) =>
        [c.name, c.area, c.note, c.phone, ...c.roads, ...c.keywords].some((text) => normalize(text).includes(kw))
      );
    }
    return list;
  }

  function renderResults() {
    const list = filtered();
    countEl.textContent = `${list.length}件`;

    resultsEl.innerHTML = '';
    if (list.length === 0) {
      resultsEl.innerHTML =
        '<p class="list-empty">該当する連絡先がありません。<br />キーワードを変えるか、「お客様センター」へお問い合わせください。</p>';
      return;
    }
    for (const contact of list) {
      resultsEl.appendChild(buildCard(contact));
    }
  }

  function buildCard(contact) {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
      <div class="contact-head">
        <div>
          <div class="contact-type"></div>
          <div class="contact-name"></div>
        </div>
        <div class="contact-hours"></div>
      </div>
      <p class="contact-note"></p>
      <div class="contact-lines">
        <div><span class="contact-key">対象地域</span><span data-area></span></div>
        <div><span class="contact-key">担当道路</span><span data-roads></span></div>
        <div><span class="contact-key">こんなとき</span><span data-keywords></span></div>
      </div>
      <div class="contact-actions">
        <a class="btn btn-line" data-tel>📞 <span></span></a>
      </div>
    `;
    card.querySelector('.contact-type').textContent = contact.type;
    card.querySelector('.contact-name').textContent = contact.name;
    card.querySelector('.contact-hours').textContent = contact.hours;
    card.querySelector('.contact-note').textContent = contact.note;
    card.querySelector('[data-area]').textContent = contact.area;
    card.querySelector('[data-roads]').textContent = contact.roads.join('、');
    card.querySelector('[data-keywords]').textContent = contact.keywords.join('、');

    const tel = card.querySelector('[data-tel]');
    tel.href = contact.tel;
    tel.querySelector('span').textContent = `${contact.phone} に電話する`;
    return card;
  }

  root.querySelector('[data-action="back"]').addEventListener('click', goHome);
  updateChips();
  renderResults();
}
