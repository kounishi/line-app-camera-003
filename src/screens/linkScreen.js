import {
  CARD_NUMBER_LENGTH,
  CARD_THUMBNAIL_QUALITY,
  CARD_THUMBNAIL_WIDTH,
  COMPANY_NAME,
  CUSTOMER_CODE_HINT,
  OCR_IMAGE_WIDTH,
} from '../config.js';
import {
  digitsOnly,
  formatCardNumber,
  linkByCard,
  linkByCode,
  validateCardNumber,
  validateCodeInput,
} from '../lib/account.js';
import { mountCameraCapture } from '../lib/camera.js';
import { showAlert, showToast } from '../lib/dialogs.js';
import { dataUrlToBase64, resizeDataUrl } from '../lib/image.js';
import { isLiff, isLoggedIn, login } from '../lib/liff.js';
import { getOcrMode, recognizeCardNumber } from '../lib/ocr.js';

/**
 * 顧客コード紐付け画面
 *
 *   紐付け方法の選択
 *     ├─ 方法1: 券面撮影   説明 → カメラ撮影(or 写真選択) → カード番号の確認 → 送信・検索・紐付け(見かけ上) → 完了
 *     └─ 方法2: コード入力 顧客コード + 電話番号 → 形式チェック → 完了
 *
 *   LIFFモードの外部ブラウザで未ログインの場合は、先にLINEログインを求める(LINE userId に紐付けるため)
 *   完了時は onLinked() を呼ぶ(呼び出し側で元の画面 = 各種申請などへ進む)
 *
 * @returns {() => void} 後始末関数(カメラ停止)
 */
export function renderLinkScreen(root, { onLinked, goHome, featureName }) {
  let camera = null;
  let disposed = false;

  function disposeCamera() {
    if (camera) {
      camera.dispose();
      camera = null;
    }
  }

  function bindBack(selector, handler) {
    root.querySelectorAll(selector).forEach((el) => el.addEventListener('click', handler));
  }

  // ============================================================
  // LINEログインが必要(LIFF外部ブラウザ・未ログイン)
  // ============================================================
  function renderLoginRequired() {
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="back">← ホーム</button>
          <span class="screen-header-title">顧客コードの紐付け</span>
          <span class="header-back"></span>
        </header>
        <div class="screen-body">
          <div class="notice-box">
            <div class="notice-box-icon">🔐</div>
            <h2>LINEログインが必要です</h2>
            <p>紐付けはLINEアカウントごとに保存するため、先にLINEログインしてください。LINEアプリ内で開いた場合は自動でログインされます。</p>
            <button type="button" class="btn btn-line btn-block" data-action="login">LINEでログイン</button>
            <button type="button" class="btn-link" data-action="back">ホームに戻る</button>
          </div>
        </div>
      </div>
    `;
    root.querySelector('[data-action="login"]').addEventListener('click', login);
    bindBack('[data-action="back"]', goHome);
  }

  // ============================================================
  // 紐付け方法の選択
  // ============================================================
  function renderMethods() {
    disposeCamera();
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="back">← 戻る</button>
          <span class="screen-header-title">顧客コードの紐付け</span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <section class="card">
            <p class="card-text">
              LINEアカウントと、${COMPANY_NAME}の顧客データにあるお客様の顧客コードを紐付けます(初回のみ)。
              紐付け方法を選んでください。
            </p>
            <p class="card-text link-return-note hidden" data-return></p>
          </section>

          <p class="section-title">紐付け方法</p>
          <div class="menu-list">
            <button type="button" class="menu-row menu-row-primary" data-action="card">
              <span class="menu-row-icon">📷</span>
              <span class="menu-row-text">
                <span class="menu-row-label">方法1: カードの券面を撮影して紐付ける <span class="badge badge-recommend">おすすめ</span></span>
                <span class="menu-row-desc">お手持ちのETCカードを撮影するだけ。カード番号からお客様を検索します</span>
              </span>
              <span class="menu-row-chevron">›</span>
            </button>
            <button type="button" class="menu-row" data-action="code">
              <span class="menu-row-icon">🔢</span>
              <span class="menu-row-text">
                <span class="menu-row-label">方法2: 顧客コードと電話番号を入力して紐付ける</span>
                <span class="menu-row-desc">ご契約時にお知らせした顧客コードをご用意ください</span>
              </span>
              <span class="menu-row-chevron">›</span>
            </button>
          </div>
          <p class="footnote">その他の紐付け方法は今後追加予定です。</p>
        </div>
      </div>
    `;
    if (featureName) {
      const note = root.querySelector('[data-return]');
      note.textContent = `紐付けが完了すると「${featureName}」に進みます。`;
      note.classList.remove('hidden');
    }
    root.querySelector('[data-action="card"]').addEventListener('click', renderCardIntro);
    root.querySelector('[data-action="code"]').addEventListener('click', renderCodeForm);
    bindBack('[data-action="back"]', goHome);
  }

  // ============================================================
  // 方法1: 券面撮影
  // ============================================================

  // ---- 説明 ----
  function renderCardIntro() {
    disposeCamera();
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="methods">← 紐付け方法</button>
          <span class="screen-header-title">券面を撮影して紐付け</span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <div class="notice-box">
            <div class="notice-box-icon">💳</div>
            <h2>カードの券面を撮影します</h2>
            <p>お手持ちのETCカードの、カード番号が印字されている面を撮影してください。撮影した画像とカード番号から、${COMPANY_NAME}に登録されているカード所有者(顧客コード)を検索し、LINEアカウントと紐付けます。</p>
            <ol class="howto-steps">
              <li>枠内にカードを合わせて撮影(または端末の写真を選択)</li>
              <li>読み取ったカード番号を確認</li>
              <li>送信して紐付け完了</li>
            </ol>
            <button type="button" class="btn btn-primary btn-block" data-action="camera">📷 カメラで撮影する</button>
            <button type="button" class="btn-link" data-action="methods">紐付け方法を選び直す</button>
          </div>
          <p class="footnote">サンプル版のため、実際の検索は行わず、見かけ上の紐付け処理を表示します。</p>
        </div>
      </div>
    `;
    root.querySelector('[data-action="camera"]').addEventListener('click', renderCardCamera);
    bindBack('[data-action="methods"]', renderMethods);
  }

  // ---- カメラ撮影 ----
  function renderCardCamera() {
    disposeCamera();
    root.innerHTML = '';
    camera = mountCameraCapture(root, {
      guideText: '枠内にカードの券面(番号が見える面)を合わせて撮影してください',
      badgeText: getOcrMode() === 'mock' ? 'モックOCR動作中(撮影するとダミーのカード番号を返します)' : '',
      onPhoto: async (dataUrl) => {
        const photo = await resizeDataUrl(dataUrl, OCR_IMAGE_WIDTH, 0.85);
        let result = { cardNumber: '', rawText: '' };
        let ocrError = null;
        if (getOcrMode() !== 'off') {
          try {
            result = await recognizeCardNumber(dataUrlToBase64(photo));
          } catch (e) {
            ocrError = e instanceof Error ? e.message : String(e);
          }
        }
        if (disposed) return;
        disposeCamera();
        renderCardConfirm(photo, result);
        if (ocrError) {
          await showAlert('文字認識に失敗しました', `${ocrError}\n\nカード番号を手入力して進めることができます。`);
        }
      },
      onCancel: renderCardIntro,
    });
  }

  // ---- カード番号の確認 ----
  function renderCardConfirm(photo, { cardNumber, rawText }) {
    disposeCamera();
    const ocrMode = getOcrMode();
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="retake">← 再撮影</button>
          <span class="screen-header-title">券面の確認</span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <img class="result-preview" alt="撮影した券面" />

          <section class="card">
            <label class="input-label" for="card-number">カード番号 <span class="form-required">必須</span></label>
            <input id="card-number" class="text-input text-input-mono" type="text" inputmode="numeric" autocomplete="off"
              placeholder="${'1234 '.repeat(CARD_NUMBER_LENGTH / 4).trim()}" />
            <p class="form-note" data-ocr-note></p>
            ${rawText ? '<details class="ocr-details"><summary>読み取ったテキストを表示</summary><pre data-raw></pre></details>' : ''}
          </section>

          <p class="form-note section-gap-sm">
            撮影した券面の画像とカード番号を送信し、${COMPANY_NAME}に登録されているカード所有者(顧客コード)を検索してLINEアカウントと紐付けます。
          </p>

          <button type="button" class="btn btn-primary btn-block section-gap-sm" data-action="submit">この券面で紐付ける</button>
          <button type="button" class="btn btn-secondary btn-block" data-action="retake">再撮影する</button>
          <button type="button" class="btn-link" data-action="methods">紐付け方法を選び直す</button>
        </div>
      </div>
    `;

    root.querySelector('.result-preview').src = photo;
    const input = root.querySelector('#card-number');
    input.value = formatCardNumber(cardNumber);
    input.addEventListener('input', () => {
      input.value = formatCardNumber(input.value);
    });
    if (rawText) root.querySelector('[data-raw]').textContent = rawText;

    const note = root.querySelector('[data-ocr-note]');
    if (ocrMode === 'off') {
      note.textContent = `券面に印字されているカード番号(${CARD_NUMBER_LENGTH}桁)を入力してください。`;
    } else if (cardNumber) {
      note.textContent = '券面から読み取ったカード番号です。誤りがあれば修正してください。';
    } else {
      note.textContent = `カード番号を読み取れませんでした。券面を撮り直すか、印字されているカード番号(${CARD_NUMBER_LENGTH}桁)を入力してください。`;
    }

    root.querySelector('[data-action="submit"]').addEventListener('click', async () => {
      const digits = digitsOnly(input.value);
      const error = validateCardNumber(digits);
      if (error) {
        await showAlert('カード番号を確認してください', error);
        input.focus();
        return;
      }
      renderCardLinking(photo, digits);
    });
    bindBack('[data-action="retake"]', renderCardCamera);
    bindBack('[data-action="methods"]', renderMethods);
  }

  // ---- 送信・検索・紐付け(進行表示) ----
  async function renderCardLinking(photo, digits) {
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <span class="header-back"></span>
          <span class="screen-header-title">紐付け中</span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <div class="notice-box">
            <div class="spinner spinner-dark spinner-center" data-spinner></div>
            <h2>紐付けを行っています</h2>
            <ol class="progress-steps" data-steps>
              <li data-step="0">券面の画像とカード番号を送信</li>
              <li data-step="1">カード番号からお客様(顧客コード)を検索</li>
              <li data-step="2">顧客コードとLINEアカウントを紐付け</li>
            </ol>
            <p class="form-note">サンプル版のため、実際の検索は行わず見かけ上の処理を表示しています。本番ではここで自社APIに照合します。</p>
          </div>
        </div>
      </div>
    `;

    const setStep = (current) => {
      root.querySelectorAll('[data-step]').forEach((li) => {
        const step = Number(li.dataset.step);
        li.classList.toggle('done', step < current);
        li.classList.toggle('active', step === current);
      });
    };

    try {
      const cardThumbnail = await resizeDataUrl(photo, CARD_THUMBNAIL_WIDTH, CARD_THUMBNAIL_QUALITY);
      const link = await linkByCard({ cardNumber: digits, cardThumbnail, onProgress: setStep });
      if (disposed) return;
      setStep(3);
      root.querySelector('[data-spinner]')?.classList.add('hidden');
      await showAlert(
        '紐付けが完了しました',
        `カード番号(下4桁): ${link.cardLast4}\n顧客コード: ${link.customerCode}\n${link.customerName} 様\n\n次回からは紐付けなしでご利用いただけます。`
      );
      showToast('顧客コードを紐付けました');
      onLinked();
    } catch (e) {
      if (disposed) return;
      await showAlert('紐付けできませんでした', e instanceof Error ? e.message : String(e));
      renderCardConfirm(photo, { cardNumber: digits, rawText: '' });
    }
  }

  // ============================================================
  // 方法2: 顧客コード + 電話番号
  // ============================================================
  function renderCodeForm() {
    disposeCamera();
    root.innerHTML = `
      <div class="screen">
        <header class="screen-header">
          <button type="button" class="header-back" data-action="methods">← 紐付け方法</button>
          <span class="screen-header-title">顧客コードを入力して紐付け</span>
          <span class="header-back"></span>
        </header>

        <div class="screen-body">
          <section class="card">
            <p class="card-text">
              ご契約時にお知らせした顧客コードと、ご登録の電話番号を入力してください。
            </p>
          </section>

          <form class="card" data-form novalidate>
            <div class="form-field">
              <label class="input-label" for="customer-code">顧客コード <span class="form-required">必須</span></label>
              <input id="customer-code" class="text-input" type="text" inputmode="numeric" autocomplete="off" placeholder="${CUSTOMER_CODE_HINT}" />
            </div>
            <div class="form-field">
              <label class="input-label" for="phone">ご登録の電話番号 <span class="form-required">必須</span></label>
              <input id="phone" class="text-input" type="tel" inputmode="numeric" autocomplete="tel" placeholder="例: 0312345678(ハイフンなし)" />
            </div>
            <p class="form-note">サンプル版のため、形式が正しければ紐付けが完了します。本番では顧客マスタと照合し、一致した場合のみ紐付けます。</p>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-block" data-action="submit">紐付ける</button>
            </div>
          </form>

          <button type="button" class="btn-link" data-action="methods">紐付け方法を選び直す</button>
        </div>
      </div>
    `;

    const form = root.querySelector('[data-form]');
    const submitBtn = root.querySelector('[data-action="submit"]');
    let busy = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;

      const customerCode = digitsOnly(root.querySelector('#customer-code').value);
      const phone = digitsOnly(root.querySelector('#phone').value);
      const error = validateCodeInput({ customerCode, phone });
      if (error) {
        await showAlert('入力内容を確認してください', error);
        return;
      }

      busy = true;
      submitBtn.classList.add('btn-disabled');
      submitBtn.textContent = '確認中…';
      try {
        const link = await linkByCode({ customerCode, phone });
        if (disposed) return;
        await showAlert('紐付けが完了しました', `顧客コード: ${link.customerCode}\n${link.customerName} 様\n\n次回からは紐付けなしでご利用いただけます。`);
        showToast('顧客コードを紐付けました');
        onLinked();
      } catch (e) {
        busy = false;
        submitBtn.classList.remove('btn-disabled');
        submitBtn.textContent = '紐付ける';
        await showAlert('紐付けできませんでした', e instanceof Error ? e.message : String(e));
      }
    });

    bindBack('[data-action="methods"]', renderMethods);
  }

  // ============================================================
  if (isLiff() && !isLoggedIn()) renderLoginRequired();
  else renderMethods();

  return function dispose() {
    disposed = true;
    disposeCamera();
  };
}
