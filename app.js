import { APP_NAME } from './src/config.js';
import { initAccount, isLinked } from './src/lib/account.js';
import { getProfile, initLiff } from './src/lib/liff.js';
import { renderApplyScreen } from './src/screens/applyScreen.js';
import { renderBillingScreen } from './src/screens/billingScreen.js';
import { renderContactsScreen } from './src/screens/contactsScreen.js';
import { renderContractScreen } from './src/screens/contractScreen.js';
import { renderHomeScreen } from './src/screens/homeScreen.js';
import { renderLinkRequiredScreen } from './src/screens/linkRequiredScreen.js';
import { renderLinkScreen } from './src/screens/linkScreen.js';
import { renderMyPageScreen } from './src/screens/myPageScreen.js';
import { renderStatusScreen } from './src/screens/statusScreen.js';

/**
 * 画面一覧
 *   リッチメニュー → トークに送信されたテキスト → 応答メッセージ内のリンク(LIFF URL + ?screen=xxx)から
 *   該当画面を直接開く。
 *   例: https://miniapp.line.me/{LIFF_ID}?screen=apply
 *
 *   requiresLink: 顧客コードの紐付けが必要な画面。未紐付けなら案内画面(linkRequiredScreen)を表示し、
 *                 紐付け完了後にこの画面へ自動的に進む。
 */
const SCREENS = {
  home: { title: 'ホーム' },
  apply: { title: '各種申請', requiresLink: true },
  status: { title: '申請状況', requiresLink: true },
  billing: { title: 'ご請求額', requiresLink: true },
  contract: { title: '契約状況', requiresLink: true },
  contacts: { title: '緊急連絡先' },
  link: { title: '顧客コードの紐付け' },
  mypage: { title: 'マイページ' },
};

/** 下部タブバーを表示する画面 */
const TAB_SCREENS = ['home', 'contacts', 'mypage'];

const app = document.getElementById('app');
const tabBar = document.getElementById('tab-bar');

/** 現在の画面の後始末関数(カメラ停止など) */
let cleanup = null;

const nav = {
  goHome: () => show('home'),
  /** 画面名で遷移(ホームのメニュータイルから) */
  goScreen: (screen) => show(screen),
  goApply: (typeId) => show('apply', { typeId }),
  goStatus: () => show('status'),
  goBilling: () => show('billing'),
  goContract: () => show('contract'),
  goContacts: () => show('contacts'),
  /** 紐付け画面へ。完了後に returnTo の画面へ戻る */
  goLink: (returnTo) => show('link', { returnTo }),
  goMyPage: () => show('mypage'),
};

function show(screen, params = {}) {
  if (!SCREENS[screen]) screen = 'home';

  if (cleanup) {
    cleanup();
    cleanup = null;
  }

  tabBar.classList.toggle('hidden', !TAB_SCREENS.includes(screen));
  for (const item of tabBar.querySelectorAll('[data-tab]')) {
    item.classList.toggle('active', item.dataset.tab === screen);
  }

  app.innerHTML = '';
  window.scrollTo(0, 0);

  // 顧客コード紐付けが必要な機能は、未紐付けなら紐付けを促す案内画面を表示する
  if (SCREENS[screen].requiresLink && !isLinked()) {
    renderLinkRequiredScreen(app, {
      featureName: SCREENS[screen].title,
      onLink: () => nav.goLink(screen),
      onBack: nav.goHome,
    });
    return;
  }

  switch (screen) {
    case 'apply':
      renderApplyScreen(app, { ...nav, initialTypeId: params.typeId });
      break;
    case 'status':
      renderStatusScreen(app, nav);
      break;
    case 'billing':
      renderBillingScreen(app, nav);
      break;
    case 'contract':
      renderContractScreen(app, nav);
      break;
    case 'contacts':
      renderContactsScreen(app, nav);
      break;
    case 'link': {
      const returnTo =
        params.returnTo && params.returnTo !== 'link' && SCREENS[params.returnTo] ? params.returnTo : 'home';
      const featureName = SCREENS[returnTo].requiresLink ? SCREENS[returnTo].title : '';
      cleanup = renderLinkScreen(app, { ...nav, featureName, onLinked: () => show(returnTo) });
      break;
    }
    case 'mypage':
      renderMyPageScreen(app, nav);
      break;
    default:
      renderHomeScreen(app, nav);
  }
}

tabBar.addEventListener('click', (event) => {
  const item = event.target.closest('[data-tab]');
  if (item) show(item.dataset.tab);
});

/**
 * 起動時URLから初期画面を決める
 *   ?screen=xxx            トークのリンクからの直接起動(LIFF初期化後はこの形になる)
 *   ?liff.state=?screen=x  LIFF初期化前の形(念のため対応)
 *   #xxx                   外部ブラウザでの動作確認用
 */
function readInitialScreen() {
  const params = new URLSearchParams(window.location.search);
  let screen = params.get('screen');
  if (!screen && params.get('liff.state')) {
    const matched = params.get('liff.state').match(/screen=([a-z]+)/);
    if (matched) screen = matched[1];
  }
  if (!screen && window.location.hash) {
    screen = window.location.hash.replace(/^#\/?/, '');
  }
  return screen && SCREENS[screen] ? screen : 'home';
}

async function main() {
  document.title = APP_NAME;
  app.innerHTML = `
    <div class="splash">
      <div class="spinner spinner-dark"></div>
      <p class="splash-text">読み込み中…</p>
    </div>
  `;

  // LIFF初期化(LIFF ID未設定・SDK読み込み失敗時はモックモードで続行)
  await initLiff();

  // 顧客コード紐付けは LINE userId ごとに管理する
  const profile = await getProfile().catch(() => null);
  initAccount(profile);

  const initial = readInitialScreen();
  // 画面指定のクエリ/ハッシュは消しておく(再読み込みでホームに戻るように)
  if (window.location.search || window.location.hash) {
    history.replaceState(null, '', window.location.pathname);
  }
  show(initial);
}

main();
