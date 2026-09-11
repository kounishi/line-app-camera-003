import { APP_NAME, APP_VERSION, LIFF_ID, NOTICE_URL, OFFICIAL_ACCOUNT_URL } from '../config.js';
import { RICH_MENU, buildReplyMessage } from '../data/richMenu.js';
import { LINK_METHOD_LABELS, getLink, unlinkCustomer } from '../lib/account.js';
import { clearAllApplications, loadApplications } from '../lib/applications.js';
import { showAlert, showConfirm, showToast } from '../lib/dialogs.js';
import { formatDateTime } from '../lib/format.js';
import {
  closeWindow,
  getEnvInfo,
  getFriendFlag,
  getProfile,
  isInClient,
  isLiff,
  isLoggedIn,
  login,
  logout,
  openExternal,
} from '../lib/liff.js';
import { getOcrModeLabel } from '../lib/ocr.js';

/**
 * マイページ
 *   - LINEプロフィール
 *   - 顧客コード紐付けの状態(紐付け方法・使用した券面 / 解除)
 *   - 公式アカウントとの友だち状態 / 友だち追加
 *   - リッチメニュー設定値(開発用: 各ボタンの送信テキストと応答メッセージ)
 *   - 環境情報(開発時の確認用)
 *   - サンプルデータの初期化
 */
export function renderMyPageScreen(root, { goHome, goLink }) {
  const link = getLink();
  const applicationCount = link ? loadApplications(link.customerCode).length : 0;

  root.innerHTML = `
    <div class="screen mypage-screen">
      <header class="screen-header">
        <span class="header-back"></span>
        <span class="screen-header-title">マイページ</span>
        <span class="header-back"></span>
      </header>

      <div class="screen-body">
        <section class="card profile-card">
          <div class="avatar avatar-large" data-avatar>👤</div>
          <div class="profile-name" data-name>読み込み中…</div>
          <div class="profile-status" data-status></div>
          <div class="profile-id" data-userid></div>
          <div class="profile-actions" data-auth></div>
        </section>

        <section class="card">
          <div class="card-label">顧客コード紐付け</div>
          <div data-link-area></div>
        </section>

        <section class="card">
          <div class="card-label">公式アカウント</div>
          <div class="kv-row"><span>友だち状態</span><span data-friend>確認中…</span></div>
          <button type="button" class="btn btn-line btn-block" data-action="friend">公式アカウントを友だち追加</button>
        </section>

        <section class="card">
          <details class="dev-details">
            <summary class="card-label">リッチメニュー設定値(開発用)</summary>
            <p class="card-text">LINE Official Account Manager で、リッチメニューの各ボタンを「テキスト」アクションにし、送信テキストをキーワードにした応答メッセージを設定します。</p>
            <div class="richmenu-settings" data-richmenu></div>
          </details>
        </section>

        <section class="card">
          <details class="dev-details">
            <summary class="card-label">環境情報</summary>
            <div class="kv-table" data-env></div>
          </details>
        </section>

        <section class="card">
          <div class="card-label">保存データ(この端末のブラウザ内)</div>
          <div class="kv-row"><span>顧客コード紐付け</span><span>${link ? '紐付け済み' : '未紐付け'}</span></div>
          <div class="kv-row"><span>申請データ件数</span><span>${applicationCount}件</span></div>
          <div class="kv-row"><span>OCRモード</span><span>${getOcrModeLabel()}</span></div>
          <button type="button" class="btn btn-clear btn-block" data-action="reset">サンプルデータを初期化(紐付け・申請を削除)</button>
        </section>

        <section class="card">
          <div class="card-label">このアプリについて</div>
          <div class="kv-row"><span>アプリ名</span><span>${APP_NAME}</span></div>
          <div class="kv-row"><span>バージョン</span><span>${APP_VERSION}</span></div>
          <p class="about-text">
            LINE公式アカウントのリッチメニューから起動するミニアプリ(LIFF)のサンプルです。
            券面撮影による顧客コード紐付け、各種申請、ご請求額・契約状況の確認、緊急連絡先の検索ができます。
          </p>
        </section>

        <div data-close></div>
      </div>
    </div>
  `;

  // ---- プロフィール ----
  getProfile()
    .then((profile) => {
      const nameEl = root.querySelector('[data-name]');
      if (!nameEl) return;
      if (!profile) {
        nameEl.textContent = 'ゲスト(未ログイン)';
        root.querySelector('[data-status]').textContent = 'LINEログインするとプロフィールが表示されます';
        return;
      }
      nameEl.textContent = profile.displayName;
      root.querySelector('[data-status]').textContent = profile.statusMessage ?? '';
      root.querySelector('[data-userid]').textContent = `ユーザーID: ${profile.userId}`;
      if (profile.pictureUrl) {
        const avatar = root.querySelector('[data-avatar]');
        avatar.innerHTML = '';
        const img = document.createElement('img');
        img.src = profile.pictureUrl;
        img.alt = '';
        avatar.appendChild(img);
      }
    })
    .catch((e) => {
      const nameEl = root.querySelector('[data-name]');
      if (nameEl) nameEl.textContent = `プロフィール取得失敗: ${e?.message ?? e}`;
    });

  // ---- ログイン / ログアウト(外部ブラウザでLIFF接続時のみ) ----
  const authEl = root.querySelector('[data-auth]');
  if (isLiff() && !isInClient()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (isLoggedIn()) {
      btn.className = 'btn btn-secondary btn-small';
      btn.textContent = 'ログアウト';
      btn.addEventListener('click', logout);
    } else {
      btn.className = 'btn btn-line btn-small';
      btn.textContent = 'LINEでログイン';
      btn.addEventListener('click', login);
    }
    authEl.appendChild(btn);
  }

  // ---- 顧客コード紐付け ----
  const linkArea = root.querySelector('[data-link-area]');
  if (link) {
    linkArea.innerHTML = `
      <div class="kv-row"><span>状態</span><span class="badge badge-ok">紐付け済み</span></div>
      <div class="kv-row"><span>顧客コード</span><span data-code></span></div>
      <div class="kv-row"><span>お名前</span><span data-cname></span></div>
      <div class="kv-row"><span>紐付け方法</span><span data-method></span></div>
      <div class="kv-row" data-card-row><span>使用したカード</span><span data-card></span></div>
      <div class="kv-row"><span>紐付け日時</span><span data-linked-at></span></div>
      <div class="linked-card-thumb hidden" data-thumb-wrap>
        <img alt="紐付けに使用した券面" data-thumb />
        <span>紐付けに使用した券面(この端末内のみ保存)</span>
      </div>
      <button type="button" class="btn btn-clear btn-block" data-action="unlink">紐付けを解除する</button>
      <p class="form-note">サンプル: 解除すると、各種申請・ご請求額・契約状況は再度最初から紐付け操作が必要になります。</p>
    `;
    linkArea.querySelector('[data-code]').textContent = link.customerCode;
    linkArea.querySelector('[data-cname]').textContent = `${link.customerName} 様`;
    linkArea.querySelector('[data-method]').textContent = LINK_METHOD_LABELS[link.method] ?? link.method ?? '-';
    if (link.cardLast4) {
      linkArea.querySelector('[data-card]').textContent = `**** **** **** ${link.cardLast4}`;
    } else {
      linkArea.querySelector('[data-card-row]').remove();
    }
    linkArea.querySelector('[data-linked-at]').textContent = formatDateTime(link.linkedAt);
    if (link.cardThumbnail) {
      linkArea.querySelector('[data-thumb]').src = link.cardThumbnail;
      linkArea.querySelector('[data-thumb-wrap]').classList.remove('hidden');
    }
    linkArea.querySelector('[data-action="unlink"]').addEventListener('click', async () => {
      const ok = await showConfirm(
        '紐付けの解除',
        '顧客コードとの紐付けを解除しますか?\n各種申請・ご請求額・契約状況は再度紐付けするまで利用できなくなります。',
        { confirmText: '解除する', destructive: true }
      );
      if (ok) {
        unlinkCustomer();
        showToast('紐付けを解除しました');
        renderMyPageScreen(root, { goHome, goLink });
      }
    });
  } else {
    linkArea.innerHTML = `
      <div class="kv-row"><span>状態</span><span class="badge">未紐付け</span></div>
      <p class="card-text">各種申請・ご請求額・契約状況のご利用には、LINEアカウントと顧客コードの紐付けが必要です。お手持ちのカードの券面を撮影して紐付けできます。</p>
      <button type="button" class="btn btn-primary btn-block" data-action="link">顧客コードを紐付ける</button>
    `;
    linkArea.querySelector('[data-action="link"]').addEventListener('click', () => goLink('mypage'));
  }

  // ---- 友だち状態 ----
  getFriendFlag().then((flag) => {
    const el = root.querySelector('[data-friend]');
    if (!el) return;
    el.textContent = flag === true ? '友だち追加済み' : flag === false ? '未追加(またはブロック中)' : '不明(LINE非連携)';
  });
  root.querySelector('[data-action="friend"]').addEventListener('click', () => {
    if (OFFICIAL_ACCOUNT_URL) {
      openExternal(OFFICIAL_ACCOUNT_URL);
    } else {
      showAlert(
        '公式アカウント未設定',
        '公式アカウント取得後、友だち追加URL(https://lin.ee/...)を src/config.js の OFFICIAL_ACCOUNT_URL に設定してください。'
      );
    }
  });

  // ---- リッチメニュー設定値(開発用) ----
  const richmenuEl = root.querySelector('[data-richmenu]');
  for (const item of RICH_MENU) {
    const block = document.createElement('div');
    block.className = 'richmenu-setting';
    block.innerHTML = `
      <div class="richmenu-setting-title"><span data-icon></span> <span data-label></span></div>
      <div class="kv-row"><span>送信テキスト</span><span data-text></span></div>
      <div class="richmenu-reply-label">応答メッセージ</div>
      <pre class="richmenu-reply" data-reply></pre>
    `;
    block.querySelector('[data-icon]').textContent = item.icon;
    block.querySelector('[data-label]').textContent = item.label;
    block.querySelector('[data-text]').textContent = item.text;
    block.querySelector('[data-reply]').textContent = buildReplyMessage(item, { liffId: LIFF_ID, noticeUrl: NOTICE_URL });
    richmenuEl.appendChild(block);
  }

  // ---- 環境情報 ----
  const envEl = root.querySelector('[data-env]');
  for (const [key, value] of Object.entries(getEnvInfo())) {
    const row = document.createElement('div');
    row.className = 'kv-row';
    const k = document.createElement('span');
    k.textContent = key;
    const v = document.createElement('span');
    v.textContent = String(value);
    row.appendChild(k);
    row.appendChild(v);
    envEl.appendChild(row);
  }

  // ---- サンプルデータの初期化 ----
  root.querySelector('[data-action="reset"]').addEventListener('click', async () => {
    const ok = await showConfirm(
      'サンプルデータの初期化',
      'この端末に保存されている顧客コードの紐付けと申請データをすべて削除します。よろしいですか?',
      { confirmText: '初期化する', destructive: true }
    );
    if (ok) {
      unlinkCustomer();
      clearAllApplications();
      showToast('初期化しました');
      goHome();
    }
  });

  // ---- LINEアプリ内なら「閉じる」ボタン ----
  if (isInClient()) {
    const closeEl = root.querySelector('[data-close]');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-link';
    btn.textContent = 'ミニアプリを閉じる';
    btn.addEventListener('click', closeWindow);
    closeEl.appendChild(btn);
  }
}
