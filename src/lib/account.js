import { CARD_NUMBER_LENGTH, CUSTOMER_CODE_PATTERN } from '../config.js';

/**
 * LINEアカウント(userId)と顧客コードの紐付け
 *
 * ■ 紐付け方法
 *   方法1: 券面撮影      linkByCard()  カードの券面を撮影 → カード番号を読み取り → カード所有者の顧客を検索して紐付ける
 *   方法2: コード入力    linkByCode()  顧客コードと登録電話番号を入力して紐付ける
 *
 * ■ サンプル実装(現状)
 *   - 紐付け情報はブラウザ内(localStorage)に、LINE userId ごとに保存する
 *   - 方法1 は「検索処理なし」で見かけ上の紐付けを行う: カード番号から顧客コード・氏名を決定的に生成する
 *   - 方法2 は形式チェックのみで、実在確認はしない
 *   - 契約情報・請求情報は顧客コードから決定的に生成したダミー
 *
 * ■ 本番での置き換え方針
 *   - linkByCard(): 券面画像(またはOCR結果のカード番号)を自社APIへ送り、カード番号 → 顧客コードを検索して
 *     一致した顧客と LINE userId を紐付ける(紐付け状態はサーバーが正)
 *   - linkByCode(): { lineUserId, customerCode, 本人確認情報 } を自社APIへ送り、顧客マスタと照合する
 *   - getLink() / getContractInfo(): 自社APIから取得する
 *   - LINE userId はなりすまし防止のため、IDトークン(liff.getIDToken())をサーバーで検証して確定させる
 */

const STORAGE_KEY = 'line_miniapp_account_links_v2';

/** 現在のユーザーのキー(LINE userId。未ログイン/モック時は 'anonymous' 等) */
let currentUserKey = 'anonymous';

/**
 * @typedef {Object} AccountLink
 * @property {string} customerCode
 * @property {string} customerName
 * @property {'card' | 'code'} method   紐付けに使った方法
 * @property {string} [cardLast4]       方法1: 読み取ったカード番号の下4桁
 * @property {string} [cardThumbnail]   方法1: 撮影した券面のサムネイル(JPEG data URL)
 * @property {string} [phoneLast4]      方法2: 入力した電話番号の下4桁
 * @property {string} lineUserId
 * @property {string} linkedAt ISO 8601
 */

export const LINK_METHOD_LABELS = {
  card: '券面撮影',
  code: '顧客コード入力',
};

export function initAccount(profile) {
  currentUserKey = profile?.userId ?? 'anonymous';
}

export function getCurrentUserKey() {
  return currentUserKey;
}

function loadAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** @returns {AccountLink | null} */
export function getLink() {
  return loadAll()[currentUserKey] ?? null;
}

export function isLinked() {
  return getLink() !== null;
}

function saveLink(link) {
  const all = loadAll();
  all[currentUserKey] = link;
  saveAll(all);
  return link;
}

/** 紐付けを解除する(サンプル: 解除すると、次回は最初から紐付け操作が必要になる) */
export function unlinkCustomer() {
  const all = loadAll();
  delete all[currentUserKey];
  saveAll(all);
}

// ============================================================
// 方法1: 券面撮影
// ============================================================

/** 全角数字を半角にし、数字以外を除く */
export function digitsOnly(value) {
  return String(value ?? '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '');
}

/** カード番号を4桁区切りで表示用に整形する */
export function formatCardNumber(cardNumber) {
  return digitsOnly(cardNumber).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** カード番号を下4桁以外マスクする */
export function maskCardNumber(cardNumber) {
  const digits = digitsOnly(cardNumber);
  if (digits.length <= 4) return digits;
  const masked = '*'.repeat(digits.length - 4) + digits.slice(-4);
  return masked.replace(/(.{4})(?=.)/g, '$1 ');
}

/** カード番号の形式チェック。問題があればエラーメッセージ、なければ null */
export function validateCardNumber(cardNumber) {
  const digits = digitsOnly(cardNumber);
  if (digits.length === 0) return 'カード番号が読み取れませんでした。券面を撮り直すか、番号を入力してください。';
  if (digits.length !== CARD_NUMBER_LENGTH) return `カード番号は${CARD_NUMBER_LENGTH}桁の数字で入力してください(現在 ${digits.length}桁)。`;
  return null;
}

/**
 * 方法1: 券面のカード番号から顧客を検索して紐付ける
 *   サンプルでは検索処理は行わず、カード番号から顧客コード・氏名を決定的に生成して「見かけ上」紐付けを完了する。
 *
 * @param {{ cardNumber: string, cardThumbnail?: string, onProgress?: (step: number) => void }} params
 *   onProgress は進捗表示用(0: 送信, 1: 検索, 2: 紐付け)
 * @returns {Promise<AccountLink>}
 */
export async function linkByCard({ cardNumber, cardThumbnail, onProgress }) {
  const digits = digitsOnly(cardNumber);
  const error = validateCardNumber(digits);
  if (error) throw new Error(error);

  // TODO(本番): 券面画像 or カード番号を自社APIへ送信し、カード所有者の顧客コードを検索する
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  onProgress?.(0);
  await wait(700);
  onProgress?.(1);
  await wait(1100);
  onProgress?.(2);
  await wait(600);

  const customerCode = sampleCustomerCodeFromCard(digits);
  return saveLink({
    customerCode,
    customerName: sampleCustomerName(customerCode),
    method: 'card',
    cardLast4: digits.slice(-4),
    cardThumbnail: cardThumbnail ?? '',
    lineUserId: currentUserKey,
    linkedAt: new Date().toISOString(),
  });
}

/** カード番号から8桁の顧客コードを決定的に生成する(サンプル) */
function sampleCustomerCodeFromCard(digits) {
  let hash = 7;
  for (const ch of digits) hash = (hash * 31 + ch.charCodeAt(0)) % 100000000;
  return String(hash).padStart(8, '0');
}

// ============================================================
// 方法2: 顧客コード + 電話番号
// ============================================================

/** 入力値の形式チェック。問題があればエラーメッセージ、なければ null */
export function validateCodeInput({ customerCode, phone }) {
  if (!CUSTOMER_CODE_PATTERN.test(customerCode)) return '顧客コードの形式が正しくありません。';
  if (!/^0\d{9,10}$/.test(phone)) return '電話番号は市外局番から、ハイフンなしの数字で入力してください。';
  return null;
}

/**
 * 方法2: 顧客コードを紐付ける(サンプル: 形式チェックのみで成功する)
 * @returns {Promise<AccountLink>}
 */
export async function linkByCode({ customerCode, phone }) {
  const error = validateCodeInput({ customerCode, phone });
  if (error) throw new Error(error);

  // TODO(本番): ここで自社APIに照合リクエストを送る
  await new Promise((resolve) => setTimeout(resolve, 700));

  return saveLink({
    customerCode,
    customerName: sampleCustomerName(customerCode),
    method: 'code',
    phoneLast4: phone.slice(-4),
    lineUserId: currentUserKey,
    linkedAt: new Date().toISOString(),
  });
}

// ============================================================
// サンプルデータ生成
// ============================================================

/** 顧客コードからサンプルの契約者名を決定的に生成する */
function sampleCustomerName(code) {
  const surnames = ['山田', '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '中村', '小林', '加藤'];
  const given = ['太郎', '花子', '一郎', '美咲', '健', '恵子', '大輔', '直子', '翔', '由美'];
  const a = Number(code.slice(-1));
  const b = Number(code.slice(-2, -1));
  return `${surnames[a]} ${given[b]}`;
}

/**
 * 契約状況(サンプル: 顧客コードから決定的に生成)
 * 本番では自社APIから取得する
 */
export function getContractInfo() {
  const link = getLink();
  if (!link) return null;
  const n = Number(link.customerCode.slice(-2));
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1 - (n % 5));
  start.setMonth(n % 12, 1);
  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1, 27);

  const cardCount = 1 + (n % 4);
  const cards = [];
  for (let i = 0; i < cardCount; i++) {
    const last4 = i === 0 && link.cardLast4 ? link.cardLast4 : String((n * 37 + i * 1111 + 1234) % 10000).padStart(4, '0');
    cards.push({
      label: `カード${i + 1}`,
      masked: `**** **** **** ${last4}`,
      vehicle: i === 0 ? '登録車両あり' : '車両未登録',
      linked: i === 0 && link.method === 'card',
    });
  }

  return {
    customerCode: link.customerCode,
    customerName: link.customerName,
    contractType: n % 2 === 0 ? '個人' : '法人',
    plan: ['スタンダード', 'ビジネス', 'プレミアム'][n % 3],
    status: '有効',
    startDate: start.toISOString(),
    cardCount,
    cards,
    paymentMethod: n % 2 === 0 ? 'クレジットカード' : '口座振替',
    nextBillingDate: nextBilling.toISOString(),
    phoneMasked: link.phoneLast4 ? `***-****-${link.phoneLast4}` : '***-****-****',
  };
}
