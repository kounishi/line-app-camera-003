/**
 * 各種申請の種別と入力項目(サンプル)
 * 実際の申請メニューに合わせて自由に追加・変更してください。
 *
 * field.type: 'text' | 'textarea' | 'select' | 'date' | 'tel'
 */
export const APPLICATION_TYPES = [
  {
    id: 'card-add',
    icon: '💳',
    name: 'カード追加発行',
    description: 'ETCカードを追加で発行します',
    fields: [
      { key: 'count', label: '発行枚数', type: 'select', options: ['1', '2', '3', '4', '5'], required: true },
      { key: 'vehicle', label: '車両番号(任意)', type: 'text', placeholder: '例: 品川 300 あ 12-34' },
      { key: 'note', label: '備考(任意)', type: 'textarea' },
    ],
  },
  {
    id: 'card-reissue',
    icon: '🔁',
    name: 'カード再発行(紛失・破損)',
    description: '紛失・盗難・破損したカードを再発行します',
    fields: [
      { key: 'last4', label: '対象カード番号(下4桁)', type: 'text', inputmode: 'numeric', maxlength: 4, placeholder: '1234', required: true },
      { key: 'reason', label: '理由', type: 'select', options: ['紛失', '盗難', '破損', '磁気不良', 'その他'], required: true },
      { key: 'stop', label: '現在のカードの利用停止', type: 'select', options: ['停止する', '停止しない(手元にある)'], required: true },
    ],
  },
  {
    id: 'info-change',
    icon: '✏️',
    name: '登録情報変更',
    description: '住所・電話番号・支払方法などの変更',
    fields: [
      { key: 'item', label: '変更する項目', type: 'select', options: ['住所', '電話番号', 'メールアドレス', '支払方法', 'その他'], required: true },
      { key: 'detail', label: '変更内容', type: 'textarea', placeholder: '変更後の内容を入力してください', required: true },
    ],
  },
  {
    id: 'cancel',
    icon: '⛔',
    name: '利用停止・解約',
    description: 'カードの利用停止、または契約の解約',
    fields: [
      { key: 'target', label: '対象', type: 'select', options: ['カード1枚の利用停止', '契約全体の解約'], required: true },
      { key: 'date', label: '希望日', type: 'date', required: true },
      { key: 'reason', label: '理由(任意)', type: 'textarea' },
    ],
  },
  {
    id: 'other',
    icon: '📨',
    name: 'その他の申請・お問い合わせ',
    description: '上記以外の申請やご相談',
    fields: [{ key: 'detail', label: '内容', type: 'textarea', required: true }],
  },
];

export function findApplicationType(id) {
  return APPLICATION_TYPES.find((t) => t.id === id);
}
