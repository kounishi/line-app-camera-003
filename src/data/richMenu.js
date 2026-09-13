/**
 * リッチメニューの構成(LINE公式アカウントのトーク画面に表示するリッチメニューと同じ6項目・同じ順序)
 *
 *   上段: お知らせ / 各種申請 / ご請求額
 *   下段: 契約状況 / 質問する / 緊急連絡先
 *
 * リッチメニューの各ボタンのアクション(LINE Official Account Manager で設定する)
 *   action: 'link' … アクション種別「リンク」。ミニアプリの該当画面(?screen=xxx)または外部Webページを
 *                    1タップで直接開く(各種申請 / ご請求額 / 契約状況 / 緊急連絡先 / お知らせ)
 *   action: 'text' … アクション種別「テキスト」。text の文言をトークに送信する(質問する)。
 *                    応答はAIチャット(Webhook)または応答メッセージ(キーワード応答)が行う
 *
 *   id           : 画面名(?screen=xxx)や識別子
 *   label        : ボタンの表示名
 *   kind         : 'screen'(ミニアプリの画面) / 'web'(外部Webページ) / 'chat'(トーク上でチャット)
 *   requiresLink : 顧客コードの紐付けが必要な機能
 *   color        : ホーム画面のタイル色(リッチメニュー画像に合わせたパステル)
 *   text         : action が 'text' のときにトークへ送信される文言
 *   reply        : (任意)text に対する応答メッセージのひな形。応答メッセージのキーワード応答に登録する場合に使う
 */
export const RICH_MENU = [
  {
    id: 'notice',
    label: 'お知らせ',
    icon: '📣',
    color: 'green',
    kind: 'web',
    action: 'link',
    desc: 'JAHICのトピックス(Webサイト)を開きます',
  },
  {
    id: 'apply',
    label: '各種申請',
    icon: '📝',
    color: 'blue',
    kind: 'screen',
    action: 'link',
    requiresLink: true,
    desc: 'カード追加・再発行・登録情報変更など',
  },
  {
    id: 'billing',
    label: 'ご請求額',
    icon: '💴',
    color: 'yellow',
    kind: 'screen',
    action: 'link',
    requiresLink: true,
    desc: '今月のご請求額と過去のご請求',
  },
  {
    id: 'contract',
    label: '契約状況',
    icon: '📋',
    color: 'purple',
    kind: 'screen',
    action: 'link',
    requiresLink: true,
    desc: 'ご契約内容・登録カードの確認',
  },
  {
    id: 'ask',
    label: '質問する',
    icon: '💬',
    color: 'teal',
    kind: 'chat',
    action: 'text',
    text: '質問があります',
    desc: 'このトークでチャットに質問',
    reply: 'ご質問をこのトークにそのまま入力してください。担当者(AIチャット)がお答えします。',
  },
  {
    id: 'contacts',
    label: '緊急連絡先',
    icon: '📞',
    color: 'pink',
    kind: 'screen',
    action: 'link',
    desc: '高速道路・ETCに関する連絡先を検索',
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

/**
 * リッチメニューの各ボタンに設定するアクション(README・マイページの設定値表示用)
 * @returns {{ type: string, value: string, reply?: string }}
 */
export function buildRichMenuAction(item, { liffId, noticeUrl }) {
  if (item.action === 'text') return { type: 'テキスト', value: item.text, reply: item.reply };
  if (item.kind === 'web') return { type: 'リンク', value: noticeUrl };
  return { type: 'リンク', value: buildMiniAppUrl(liffId, item.id) };
}
