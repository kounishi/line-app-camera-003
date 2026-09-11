/**
 * 各種申請の送信・履歴(サンプル: localStorage)
 *
 * 本番では submitApplication() を自社APIへのPOSTに、loadApplications() をAPIからの取得に置き換える。
 * 申請状況(status)はサーバー側の処理状況を返すのが本来の形。
 * サンプルでは「受付からの経過時間」で 受付済み → 処理中 → 完了 と変化させて画面の見え方を確認できるようにしている。
 */

const STORAGE_KEY = 'line_miniapp_applications_v1';

/**
 * @typedef {Object} Application
 * @property {string} id
 * @property {string} receiptNo    受付番号
 * @property {string} typeId
 * @property {string} typeName
 * @property {Record<string, string>} values  入力値(項目キー → 値)
 * @property {Array<{label: string, value: string}>} summary  表示用(項目名 → 値)
 * @property {string} customerCode
 * @property {string} [lineUserId]
 * @property {string} submittedAt  ISO 8601
 */

/** @returns {Application[]} */
function loadAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** 指定顧客コードの申請を新しい順で返す */
export function loadApplications(customerCode) {
  return loadAll().filter((a) => a.customerCode === customerCode);
}

function makeReceiptNo(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `R${ymd}-${seq}`;
}

/**
 * 申請を送信する(サンプル: 端末内に保存)
 * @returns {Promise<Application>}
 */
export async function submitApplication({ typeId, typeName, values, summary, customerCode, lineUserId }) {
  // TODO(本番): ここで自社APIにPOSTし、返ってきた受付番号を使う
  await new Promise((resolve) => setTimeout(resolve, 600));
  const now = new Date();
  const application = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    receiptNo: makeReceiptNo(now),
    typeId,
    typeName,
    values,
    summary,
    customerCode,
    lineUserId,
    submittedAt: now.toISOString(),
  };
  saveAll([application, ...loadAll()]);
  return application;
}

export function removeApplication(id) {
  saveAll(loadAll().filter((a) => a.id !== id));
}

/** この端末に保存されている申請データをすべて削除する(サンプルデータの初期化用) */
export function clearAllApplications() {
  saveAll([]);
}

/**
 * 申請状況(サンプル: 受付からの経過時間で変化)
 * @returns {{ key: 'accepted' | 'processing' | 'done', label: string }}
 */
export function getApplicationStatus(application) {
  const elapsedMin = (Date.now() - new Date(application.submittedAt).getTime()) / 60000;
  if (elapsedMin < 1) return { key: 'accepted', label: '受付済み' };
  if (elapsedMin < 3) return { key: 'processing', label: '処理中' };
  return { key: 'done', label: '完了' };
}
