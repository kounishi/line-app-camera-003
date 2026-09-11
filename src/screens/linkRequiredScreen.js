import { COMPANY_NAME } from '../config.js';

/**
 * 顧客コード未紐付けのユーザーが、紐付けが必要な機能(各種申請・ご請求額・契約状況)を開いたときの案内画面
 *   リッチメニュー → トークのリンク → ?screen=apply などで直接開いた場合も、この画面を経由して紐付けに進む
 */
export function renderLinkRequiredScreen(root, { featureName, onLink, onBack }) {
  root.innerHTML = `
    <div class="screen">
      <header class="screen-header">
        <button type="button" class="header-back" data-action="back">← ホーム</button>
        <span class="screen-header-title" data-title></span>
        <span class="header-back"></span>
      </header>

      <div class="screen-body">
        <div class="notice-box">
          <div class="notice-box-icon">🔗</div>
          <h2>顧客コードの紐付けが必要です</h2>
          <p data-message></p>
          <ul class="notice-list">
            <li>お手持ちのETCカード(券面)をカメラで撮影して紐付けできます</li>
            <li>カード番号から${COMPANY_NAME}の顧客データを検索し、お客様の顧客コードとLINEアカウントを紐付けます</li>
            <li>紐付けは初回のみです。次回以降はそのままご利用いただけます</li>
          </ul>
          <button type="button" class="btn btn-primary btn-block" data-action="link">紐付けを行う</button>
          <button type="button" class="btn-link" data-action="back">ホームに戻る</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector('[data-title]').textContent = featureName;
  root.querySelector('[data-message]').textContent =
    `「${featureName}」をご利用いただくには、LINEアカウントとお客様の顧客コードの紐付けが必要です。紐付けが完了すると、そのまま「${featureName}」に進みます。`;
  root.querySelector('[data-action="link"]').addEventListener('click', onLink);
  root.querySelectorAll('[data-action="back"]').forEach((el) => el.addEventListener('click', onBack));
}
