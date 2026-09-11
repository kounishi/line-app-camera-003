import { LIFF_ID } from '../config.js';

/**
 * LIFF(LINE Front-end Framework)のラッパー
 *
 * - LIFF_ID が設定され、LIFF SDK が読み込めた場合 → 'liff' モード(実際にLINEと連携)
 * - それ以外                                     → 'mock' モード(LINE非連携。通常のブラウザで動作確認)
 *
 * 画面側はこのモジュールだけを参照し、window.liff を直接触らないようにしている。
 * そのため公式アカウント・LIFF取得前でも、モックモードで全画面の開発・確認ができる。
 */

const MOCK_PROFILE = {
  userId: 'U00000000000000000000000000mock00',
  displayName: 'テストユーザー',
  pictureUrl: '',
  statusMessage: 'LIFF未接続(モック表示)',
};

const state = {
  /** @type {'liff' | 'mock'} */
  mode: 'mock',
  /** モックモードになった理由(表示用) */
  reason: '',
  /** @type {null | { userId: string, displayName: string, pictureUrl?: string, statusMessage?: string }} */
  profile: null,
};

function sdk() {
  return window.liff;
}

/** LIFFを初期化する。失敗してもthrowせず、モックモードで続行できるようにする */
export async function initLiff() {
  // 開発用: URLに ?mock=1 を付けるとLINE非連携(モック)で起動できる(PCブラウザで全画面を確認する用途)
  if (new URLSearchParams(window.location.search).get('mock') === '1') {
    state.reason = 'URLに ?mock=1 が指定されたためモックで起動';
    return state;
  }
  if (!LIFF_ID) {
    state.reason = 'LIFF IDが未設定(src/config.js)';
    return state;
  }
  if (!sdk()) {
    state.reason = 'LIFF SDKを読み込めませんでした(オフライン/ブロック)';
    return state;
  }
  try {
    await sdk().init({ liffId: LIFF_ID });
    state.mode = 'liff';
  } catch (e) {
    state.reason = `liff.init に失敗: ${e?.message ?? e}`;
  }
  return state;
}

export function isLiff() {
  return state.mode === 'liff';
}

export function getMockReason() {
  return state.reason;
}

/** LINEアプリ内(LIFFブラウザ)で開かれているか */
export function isInClient() {
  return isLiff() && sdk().isInClient();
}

/** ログイン済みか。モックモードでは常にログイン済み扱い */
export function isLoggedIn() {
  return isLiff() ? sdk().isLoggedIn() : true;
}

/** 表示用の接続状態ラベル */
export function getConnectionLabel() {
  if (!isLiff()) return 'モック(LINE非連携)';
  if (isInClient()) return 'LINEアプリ内';
  return isLoggedIn() ? '外部ブラウザ(ログイン済み)' : '外部ブラウザ(未ログイン)';
}

/** 外部ブラウザでLINEログインを開始する(LINEアプリ内では不要) */
export function login() {
  if (!isLiff() || isLoggedIn()) return;
  sdk().login({ redirectUri: window.location.href });
}

export function logout() {
  if (!isLiff() || !isLoggedIn()) return;
  sdk().logout();
  window.location.reload();
}

/**
 * LINEプロフィールを取得する。
 * モックモードではダミー、LIFFモードで未ログインなら null。
 */
export async function getProfile() {
  if (!isLiff()) return MOCK_PROFILE;
  if (!isLoggedIn()) return null;
  if (!state.profile) {
    state.profile = await sdk().getProfile();
  }
  return state.profile;
}

/** 公式アカウントとの友だち状態。true / false、判定できない場合は null */
export async function getFriendFlag() {
  if (!isLiff() || !isLoggedIn()) return null;
  try {
    const { friendFlag } = await sdk().getFriendship();
    return friendFlag;
  } catch {
    return null;
  }
}

/** マイページの環境情報表示用 */
export function getEnvInfo() {
  if (!isLiff()) {
    const ua = navigator.userAgent;
    return {
      モード: 'モック(LINE非連携)',
      理由: state.reason,
      ブラウザ: ua.length > 70 ? `${ua.slice(0, 70)}…` : ua,
    };
  }
  const l = sdk();
  return {
    モード: 'LIFF(LINE連携中)',
    LINEアプリ内: l.isInClient() ? 'はい' : 'いいえ(外部ブラウザ)',
    ログイン: l.isLoggedIn() ? '済み' : '未ログイン',
    OS: l.getOS() ?? '-',
    言語: l.getLanguage() ?? '-',
    LIFFバージョン: l.getVersion() ?? '-',
    LINEバージョン: l.getLineVersion() ?? '-(外部ブラウザ)',
    起動元: l.getContext()?.type ?? '-',
  };
}

/** 「LINEの友だち・グループに送る」(shareTargetPicker)が使えるか */
export function canShare() {
  return isLiff() && isLoggedIn() && sdk().isApiAvailable('shareTargetPicker');
}

/** 送信先を選んでテキストを送る。送信したら true、キャンセルは false */
export async function shareText(text) {
  const result = await sdk().shareTargetPicker([{ type: 'text', text }]);
  return Boolean(result);
}

/**
 * 開いているトークにメッセージを直接送れるか。
 * 公式アカウントとの1対1トーク(utou)・グループ・複数人トークから開いた場合のみ。
 */
export function canSendMessages() {
  if (!isInClient()) return false;
  const type = sdk().getContext()?.type;
  return type === 'utou' || type === 'room' || type === 'group';
}

export async function sendText(text) {
  await sdk().sendMessages([{ type: 'text', text }]);
}

/** 外部URLを開く(LINEアプリ内では外部ブラウザで開く) */
export function openExternal(url) {
  if (isLiff()) {
    sdk().openWindow({ url, external: true });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

/** LIFFアプリを閉じる(LINEアプリ内のみ有効) */
export function closeWindow() {
  if (isInClient()) sdk().closeWindow();
}

/**
 * 公式アカウントのトーク画面を開く(LINE URLスキーム)
 *   LINEアプリ内: そのままトーク画面に切り替わる
 *   外部ブラウザ: LINEアプリが起動してトーク画面が開く
 * @param {string} basicId 公式アカウントのベーシックID(例: '@123abcde')
 * @param {string} [text]  入力欄にあらかじめセットする文言
 */
export function openOaChat(basicId, text = '') {
  const id = basicId.startsWith('@') ? basicId : `@${basicId}`;
  const url = `https://line.me/R/oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(text)}`;
  window.location.href = url;
}
