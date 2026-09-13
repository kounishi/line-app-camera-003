import { APP_NAME, ASK_MESSAGE, NOTICE_URL, OFFICIAL_ACCOUNT_ID } from '../config.js';
import { RICH_MENU } from '../data/richMenu.js';
import { getLink, unlinkCustomer } from '../lib/account.js';
import { showAlert, showConfirm, showToast } from '../lib/dialogs.js';
import {
  getConnectionLabel,
  getMockReason,
  getProfile,
  isInClient,
  isLiff,
  isLoggedIn,
  login,
  openExternal,
  openOaChat,
} from '../lib/liff.js';
import { getOcrModeLabel } from '../lib/ocr.js';

/**
 * ホーム画面
 *   公式アカウントのリッチメニューと同じ6項目を、同じ並び(2行×3列)・同じ配色のタイルで表示する。
 *   リッチメニューを設定する前でも、ここから全機能に到達できる。
 */
export function renderHomeScreen(root, nav) {
  const link = getLink();

  root.innerHTML = `
    <div class="screen home-screen">
      <header class="app-header">
        <div class="header-user">
          <div class="avatar" data-avatar>👤</div>
          <div class="header-user-text">
            <div class="header-name" data-name>読み込み中…</div>
            <div class="header-sub" data-conn></div>
          </div>
        </div>
        <div class="header-appname">${APP_NAME}</div>
      </header>

      <div class="screen-body">
        <div data-banner></div>
        <div data-link-banner></div>

        <p class="section-title">メニュー(トーク画面のリッチメニューと同じ構成)</p>
        <div class="menu-grid" data-menu></div>

        <section class="card section-gap">
          <div class="card-label">リッチメニューからの起動について</div>
          <ol class="howto-steps">
            <li>トーク画面のリッチメニューをタップすると、このミニアプリの該当画面が1タップで直接開きます(各種申請・ご請求額・契約状況・緊急連絡先)</li>
            <li>「お知らせ」はJAHICのトピックス(Webサイト)が開き、「質問する」はトークにメッセージが送信されてチャットで質問できます</li>
            <li>各種申請・ご請求額・契約状況は、初回のみLINEアカウントと顧客コードの紐付けが必要です。紐付け済みの場合はそのまま該当画面が開きます</li>
          </ol>
        </section>

        <p class="footnote">OCR: ${getOcrModeLabel()}</p>
      </div>
    </div>
  `;

  // ---- 接続状態バナー ----
  const banner = root.querySelector('[data-banner]');
  if (!isLiff()) {
    banner.innerHTML = `
      <div class="banner banner-info">
        <strong>モックモードで動作中</strong><br />
        ${getMockReason()}。LINE連携なしで全画面を確認できます。
      </div>
    `;
  } else if (!isInClient() && !isLoggedIn()) {
    banner.innerHTML = `
      <div class="banner banner-login">
        <span>外部ブラウザで開いています。LINEログインするとプロフィールが表示されます。</span>
        <button type="button" class="btn btn-line btn-small" data-action="login">LINEでログイン</button>
      </div>
    `;
    banner.querySelector('[data-action="login"]').addEventListener('click', login);
  }

  // ---- 顧客コード紐付けバナー ----
  const linkBanner = root.querySelector('[data-link-banner]');
  if (link) {
    linkBanner.innerHTML = `
      <div class="banner banner-ok banner-row">
        <span>✅ 顧客コード <strong data-code></strong>(<span data-cname></span> 様)と紐付け済みです</span>
        <button type="button" class="btn-link-inline" data-action="unlink">紐付けを解除(サンプル用)</button>
      </div>
    `;
    linkBanner.querySelector('[data-code]').textContent = link.customerCode;
    linkBanner.querySelector('[data-cname]').textContent = link.customerName;
    linkBanner.querySelector('[data-action="unlink"]').addEventListener('click', async () => {
      const ok = await showConfirm(
        '紐付けの解除',
        '顧客コードとの紐付けを解除しますか?\n解除すると、各種申請・ご請求額・契約状況は再度最初から紐付け操作が必要になります。',
        { confirmText: '解除する', destructive: true }
      );
      if (ok) {
        unlinkCustomer();
        showToast('紐付けを解除しました');
        renderHomeScreen(root, nav);
      }
    });
  } else {
    linkBanner.innerHTML = `
      <div class="banner banner-warn">
        <span><strong>顧客コードが未紐付けです。</strong>各種申請・ご請求額・契約状況のご利用には、LINEアカウントと顧客コードの紐付け(初回のみ)が必要です。お手持ちのカードの券面を撮影して紐付けできます。</span>
        <button type="button" class="btn btn-primary btn-small" data-action="link">📷 券面を撮影して紐付ける</button>
      </div>
    `;
    linkBanner.querySelector('[data-action="link"]').addEventListener('click', () => nav.goLink('home'));
  }

  // ---- プロフィール(非同期) ----
  root.querySelector('[data-conn]').textContent = getConnectionLabel();
  getProfile()
    .then((profile) => {
      const nameEl = root.querySelector('[data-name]');
      const avatarEl = root.querySelector('[data-avatar]');
      if (!nameEl || !avatarEl) return;
      if (!profile) {
        nameEl.textContent = 'ゲスト';
        return;
      }
      nameEl.textContent = profile.displayName;
      if (profile.pictureUrl) {
        avatarEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = profile.pictureUrl;
        img.alt = '';
        avatarEl.appendChild(img);
      }
    })
    .catch(() => {
      const nameEl = root.querySelector('[data-name]');
      if (nameEl) nameEl.textContent = 'プロフィール取得失敗';
    });

  // ---- メニュータイル(リッチメニューと同じ6項目) ----
  const menuEl = root.querySelector('[data-menu]');
  for (const item of RICH_MENU) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `menu-tile tile-${item.color}`;
    tile.innerHTML = `
      <span class="tile-icon"></span>
      <span class="tile-label"></span>
      <span class="tile-desc"></span>
    `;
    tile.querySelector('.tile-icon').textContent = item.icon;
    tile.querySelector('.tile-label').textContent = item.label;
    tile.querySelector('.tile-desc').textContent = item.desc;

    let badgeText = '';
    let badgeClass = 'tile-badge';
    if (item.requiresLink && !link) {
      badgeText = '要紐付け';
      badgeClass += ' tile-badge-warn';
    } else if (item.kind === 'web') {
      badgeText = 'Web';
    } else if (item.kind === 'chat') {
      badgeText = 'トーク';
    }
    if (badgeText) {
      const badge = document.createElement('span');
      badge.className = badgeClass;
      badge.textContent = badgeText;
      tile.appendChild(badge);
    }
    tile.setAttribute('aria-label', item.label);
    tile.addEventListener('click', () => handleMenu(item));
    menuEl.appendChild(tile);
  }

  function handleMenu(item) {
    switch (item.kind) {
      case 'chat':
        if (OFFICIAL_ACCOUNT_ID) {
          openOaChat(OFFICIAL_ACCOUNT_ID, ASK_MESSAGE);
        } else {
          showAlert(
            '質問する(トーク画面)',
            '公式アカウントのトーク画面でチャットに質問できます。\n\n公式アカウント取得後、ベーシックID(@xxxx)を src/config.js の OFFICIAL_ACCOUNT_ID に設定すると、ここからトーク画面を開けます。'
          );
        }
        break;
      case 'web':
        if (NOTICE_URL) {
          openExternal(NOTICE_URL);
        } else {
          showAlert('お知らせ', 'お知らせページ(Webサイト等)のURLを src/config.js の NOTICE_URL に設定すると、ここから開けます。');
        }
        break;
      default:
        nav.goScreen(item.id);
    }
  }
}
