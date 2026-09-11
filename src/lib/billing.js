/**
 * ご請求額(サンプル: 顧客コードから決定的に生成)
 *
 * 本番では自社の請求システム / APIから取得する。
 * サンプルの請求サイクル:
 *   - 利用月の翌月10日に請求額が確定し、27日にお支払い(口座振替 / カード決済)
 *   - 「今月のご請求額」= 前月ご利用分。10日より前は「集計中(見込額)」として表示する
 */

const BILLING_FIX_DAY = 10;
const PAYMENT_DAY = 27;

/** 乱数(mulberry32)。同じ顧客コードなら毎回同じ請求額になる */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round10 = (n) => Math.round(n / 10) * 10;

/**
 * @typedef {Object} BillingMonth
 * @property {string} yearMonth      請求年月 "2026-09"
 * @property {string} usageMonth     利用年月 "2026-08"
 * @property {number} amount         請求額(税込・割引後)
 * @property {'estimated' | 'fixed' | 'paid'} status
 * @property {string} paymentDate    お支払い(予定)日 ISO
 * @property {Array<{label: string, amount: number}>} breakdown
 */

/**
 * @param {{ customerCode: string, customerName: string }} link
 * @param {Date} [today]
 */
export function getBillingInfo(link, today = new Date()) {
  const rand = seeded(Number(link.customerCode) || 1);
  const n = Number(link.customerCode.slice(-2));
  const cardCount = 1 + (n % 4);
  const paymentMethod = n % 2 === 0 ? 'クレジットカード' : '口座振替';
  const baseMonthly = 8000 + Math.floor(rand() * 60000) * cardCount * 0.5;

  /** 指定した請求年月(offset: 0 = 今月, -1 = 先月 …)の請求を生成する */
  function buildMonth(offset) {
    const billing = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const usage = new Date(billing.getFullYear(), billing.getMonth() - 1, 1);
    const fixDate = new Date(billing.getFullYear(), billing.getMonth(), BILLING_FIX_DAY);
    const paymentDate = new Date(billing.getFullYear(), billing.getMonth(), PAYMENT_DAY);

    const toll = round10(baseMonthly * (0.7 + rand() * 0.6));
    const nightDiscount = -round10(toll * (0.05 + rand() * 0.15));
    const holidayDiscount = -round10(toll * rand() * 0.08);
    const fee = usage.getMonth() === (n % 12) ? 550 * cardCount : 0; // 年に1回カード年会費(サンプル)
    const subtotal = toll + nightDiscount + holidayDiscount + fee;
    const tax = 0; // 通行料金は税込表示のため、サンプルでは内税扱い
    const amount = Math.max(0, subtotal + tax);

    let status = 'paid';
    if (offset === 0) status = today < fixDate ? 'estimated' : today < paymentDate ? 'fixed' : 'paid';
    if (offset > 0) status = 'estimated';

    const breakdown = [
      { label: `ETC通行料金(${cardCount}枚)`, amount: toll },
      { label: '深夜割引', amount: nightDiscount },
      { label: '休日割引', amount: holidayDiscount },
    ];
    if (fee) breakdown.push({ label: 'カード年会費', amount: fee });

    return {
      yearMonth: ym(billing),
      usageMonth: ym(usage),
      amount,
      status,
      fixDate: fixDate.toISOString(),
      paymentDate: paymentDate.toISOString(),
      breakdown,
    };
  }

  const history = [];
  for (let offset = -1; offset >= -6; offset--) history.push(buildMonth(offset));

  return {
    customerCode: link.customerCode,
    customerName: link.customerName,
    paymentMethod,
    cardCount,
    current: buildMonth(0),
    history,
    historyTotal: history.reduce((sum, m) => sum + m.amount, 0),
  };
}

function ym(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-09" → "2026年9月" */
export function formatYearMonth(yearMonth) {
  const [y, m] = yearMonth.split('-');
  return `${y}年${Number(m)}月`;
}

export function formatYen(amount) {
  const sign = amount < 0 ? '-' : '';
  return `${sign}¥${Math.abs(amount).toLocaleString('ja-JP')}`;
}

export const BILLING_STATUS_LABELS = {
  estimated: { label: '集計中', key: 'processing' },
  fixed: { label: '請求確定', key: 'accepted' },
  paid: { label: 'お支払い済み', key: 'done' },
};
