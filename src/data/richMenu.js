/**
 * リッチメニューの構成(LINE公式アカウントのトーク画面に表示するリッチメニューと同じ6項目・同じ順序)
 *
 *   上段: お知らせ / 各種申請 / ご請求額
 *   下段: 契約状況 / 質問する / 緊急連絡先
 *
 * リッチメニューの各ボタンはアクション種別「テキスト」にし、text の文言をトークに送信させる。
 * その文言をキーワードにした応答メッセージ(LINE Official Account Manager)または Webhook が、
 * ミニアプリの該当画面を開くリンク(?screen=xxx)を返信する。
 *
 *   id           : 画面名(?screen=xxx)や識別子
 *   label        : ボタンの表示名
 *   text         : リッチメニューのボタンを押したときにトークに送信されるテキスト
 *   kind         : 'screen'(ミニアプリの画面) / 'web'(外部Webページ) / 'chat'(トーク上でチャット)
 *   requiresLink : 顧客コードの紐付けが必要な機能
 *   color        : ホーム画面のタイル色(リッチメニュー画像に合わせたパステル)
 *   reply        : 応答メッセージの本文。{url} はミニアプリのURL(またはお知らせURL)に置き換える
 */
export const RICH_MENU = [
  {
    id: 'notice',
    label: 'お知らせ',
    icon: '📣',
    color: 'green',
    text: 'お知らせ',
    kind: 'web',
    desc: 'JAHICのトピックス(Webサイト)を開きます',
    reply: '最新のお知らせ・トピックスはこちらをご覧ください。\n{url}',
  },
  {
    id: 'apply',
    label: '各種申請',
    icon: '📝',
    color: 'blue',
    text: '各種申請',
    kind: 'screen',
    requiresLink: true,
    desc: 'カード追加・再発行・登録情報変更など',
    reply: '各種申請はこちらからお手続きいただけます。\n{url}\n※初回のみ、お客様の顧客コードとLINEアカウントの紐付けが必要です。',
  },
  {
    id: 'billing',
    label: 'ご請求額',
    icon: '💴',
    color: 'yellow',
    text: 'ご請求額',
    kind: 'screen',
    requiresLink: true,
    desc: '今月のご請求額と過去のご請求',
    reply: 'ご請求額はこちらからご確認いただけます。\n{url}\n※初回のみ、お客様の顧客コードとLINEアカウントの紐付けが必要です。',
  },
  {
    id: 'contract',
    label: '契約状況',
    icon: '📋',
    color: 'purple',
    text: '契約状況',
    kind: 'screen',
    requiresLink: true,
    desc: 'ご契約内容・登録カードの確認',
    reply: 'ご契約状況はこちらからご確認いただけます。\n{url}\n※初回のみ、お客様の顧客コードとLINEアカウントの紐付けが必要です。',
  },
  {
    id: 'ask',
    label: '質問する',
    icon: '💬',
    color: 'teal',
    text: '質問があります',
    kind: 'chat',
    desc: 'このトークでチャットに質問',
    reply: 'ご質問をこのトークにそのまま入力してください。担当者(AIチャット)がお答えします。',
  },
  {
    id: 'contacts',
    label: '緊急連絡先',
    icon: '📞',
    color: 'pink',
    text: '緊急連絡先',
    kind: 'screen',
    desc: '高速道路・ETCに関する連絡先を検索',
    reply: '高速道路・ETCに関する緊急連絡先はこちらから検索できます。\n{url}\n事故・故障など緊急の場合は、道路緊急ダイヤル #9910 へ。',
  },
];

export function findRichMenuItem(id) {
  return RICH_MENU.find((item) => item.id === id);
}

/**
 * ミニアプリを指定画面で開くLIFF URL
 *   LIFF ID 未設定(モック)のときは公開URL相当のハッシュ形式を返す
 */
export function buildMiniAppUrl(liffId, screen) {
  if (liffId) return `https://miniapp.line.me/${liffId}?screen=${screen}`;
  return `${window.location.origin}${window.location.pathname}#${screen}`;
}

/** 応答メッセージの本文を組み立てる(README・マイページの設定値表示用) */
export function buildReplyMessage(item, { liffId, noticeUrl }) {
  const url = item.kind === 'web' ? noticeUrl : item.kind === 'screen' ? buildMiniAppUrl(liffId, item.id) : '';
  return item.reply.replace('{url}', url);
}
