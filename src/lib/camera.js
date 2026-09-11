import { OCR_IMAGE_WIDTH } from '../config.js';
import { showAlert } from './dialogs.js';
import { captureVideoFrame, fileToDataUrl } from './image.js';

/**
 * カメラ撮影コンポーネント(券面撮影用)
 *
 * 撮影手段は2系統用意している:
 *   1. getUserMedia によるライブプレビュー + シャッター(PC / Safari / Chrome など)
 *   2. <input type="file" accept="image/*" capture> で端末のカメラアプリ / 写真を使う
 *      (LINEアプリ内ブラウザなど getUserMedia が使えない・許可されない環境向けのフォールバック)
 *
 * 使い方:
 *   const cam = mountCameraCapture(root, {
 *     guideText: '枠内にカードの券面を合わせて撮影してください',
 *     onPhoto: async (dataUrl) => { ... },   // 撮影 / 選択した写真(JPEG data URL)。処理中は自動でビジー表示
 *     onCancel: () => { ... },
 *   });
 *   cam.dispose();  // 画面を離れるときに必ず呼ぶ(カメラ停止)
 *
 * @param {HTMLElement} root
 * @param {{ guideText?: string, badgeText?: string, onPhoto: (dataUrl: string) => Promise<void> | void, onCancel: () => void }} options
 * @returns {{ dispose: () => void }}
 */
export function mountCameraCapture(root, { guideText, badgeText, onPhoto, onCancel }) {
  let stream = null;
  let busy = false;
  let disposed = false;

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  }

  /**
   * 端末のカメラアプリ / 写真選択用の input[type=file]
   * 画面を描き直すたびに root へ付け直す(DOMに存在しないとファイル選択が動かないブラウザがあるため)
   */
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.capture = 'environment';
  fileInput.className = 'hidden';
  fileInput.setAttribute('data-file-input', '');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await handlePhoto(dataUrl);
    } catch (e) {
      await showAlert('読み込みエラー', e instanceof Error ? e.message : String(e));
    } finally {
      fileInput.value = '';
    }
  });

  function attachFileInput() {
    root.appendChild(fileInput);
  }

  /** 端末のカメラアプリ / 写真選択を開く */
  function openFilePicker() {
    if (busy) return;
    fileInput.click();
  }

  // ---- 権限エラー・カメラ非対応画面 ----
  function renderPermissionError(message) {
    stopStream();
    document.body.classList.remove('camera-bg');
    root.innerHTML = `
      <div class="center-screen">
        <p class="permission-text" data-message></p>
        <button type="button" class="btn btn-primary" data-action="retry">カメラを許可して再試行</button>
        <button type="button" class="btn btn-secondary" data-action="file">📁 カメラアプリで撮影 / 写真を選択</button>
        <button type="button" class="btn-link" data-action="back">戻る</button>
      </div>
    `;
    root.querySelector('[data-message]').textContent = message;
    root.querySelector('[data-action="retry"]').addEventListener('click', renderCamera);
    root.querySelector('[data-action="file"]').addEventListener('click', openFilePicker);
    root.querySelector('[data-action="back"]').addEventListener('click', onCancel);
    attachFileInput();
  }

  // ---- カメラ画面 ----
  function renderCamera() {
    document.body.classList.add('camera-bg');
    root.innerHTML = `
      <div class="camera-screen">
        <video class="camera-video" autoplay playsinline muted></video>

        <div class="camera-overlay">
          <p class="guide-text" data-guide></p>
          <div class="guide-frame guide-frame-card"></div>
          ${badgeText ? '<p class="mock-badge" data-badge></p>' : ''}
        </div>

        <div class="busy-overlay hidden" data-busy>
          <div class="spinner"></div>
          <p class="busy-text" data-busy-text>処理中…</p>
        </div>

        <div class="camera-controls">
          <button type="button" class="camera-side-button" data-action="back">戻る</button>
          <button type="button" class="shutter-outer" data-action="capture" aria-label="撮影">
            <span class="shutter-inner"></span>
          </button>
          <button type="button" class="camera-side-button camera-side-right" data-action="file" aria-label="写真を選択">
            <span class="camera-side-icon">📁</span><span>写真</span>
          </button>
        </div>
      </div>
    `;
    root.querySelector('[data-guide]').textContent = guideText ?? '枠内にカードの券面を合わせて撮影してください';
    if (badgeText) root.querySelector('[data-badge]').textContent = badgeText;

    root.querySelector('[data-action="back"]').addEventListener('click', () => {
      if (!busy) onCancel();
    });
    root.querySelector('[data-action="capture"]').addEventListener('click', handleCapture);
    root.querySelector('[data-action="file"]').addEventListener('click', openFilePicker);
    attachFileInput();

    startCamera(root.querySelector('video'));
  }

  async function startCamera(video) {
    if (!navigator.mediaDevices?.getUserMedia) {
      renderPermissionError(
        'このブラウザではカメラのライブ表示を利用できません(HTTPS以外、または非対応のアプリ内ブラウザ)。' +
          '下の「カメラアプリで撮影」から端末のカメラを使って撮影できます。'
      );
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      if (disposed) {
        stopStream();
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
    } catch (e) {
      if (disposed) return;
      const name = e?.name ?? '';
      const message =
        name === 'NotAllowedError' || name === 'SecurityError'
          ? '撮影にはカメラへのアクセス許可が必要です。ブラウザ(またはLINEアプリ)の設定でカメラを許可するか、' +
            '「カメラアプリで撮影」をご利用ください。'
          : name === 'NotFoundError'
            ? 'カメラが見つかりませんでした。「カメラアプリで撮影 / 写真を選択」から撮影できます。'
            : `カメラを起動できませんでした(${name || 'エラー'})。「カメラアプリで撮影」をお試しください。`;
      renderPermissionError(message);
    }
  }

  function setBusy(value, text = '処理中…') {
    busy = value;
    const overlay = root.querySelector('[data-busy]');
    if (overlay) {
      overlay.classList.toggle('hidden', !value);
      const textEl = root.querySelector('[data-busy-text]');
      if (textEl) textEl.textContent = text;
    }
  }

  // ---- シャッター(ライブプレビューから取り込み) ----
  async function handleCapture() {
    if (busy) return;
    const video = root.querySelector('video');
    if (!video || video.videoWidth === 0) {
      await showAlert('カメラ準備中', 'カメラ映像がまだ表示されていません。少し待ってから撮影してください。');
      return;
    }
    await handlePhoto(captureVideoFrame(video, OCR_IMAGE_WIDTH));
  }

  /** 撮影 / 選択した写真を呼び出し側に渡す。処理中はビジー表示にする */
  async function handlePhoto(dataUrl) {
    if (busy || disposed) return;
    setBusy(true, '読み取り中…');
    try {
      await onPhoto(dataUrl);
    } catch (e) {
      if (!disposed) await showAlert('処理エラー', e instanceof Error ? e.message : String(e));
    } finally {
      // 呼び出し側が画面を切り替えた(dispose 済み)場合は何もしない
      if (!disposed) setBusy(false);
    }
  }

  renderCamera();

  return {
    dispose() {
      disposed = true;
      stopStream();
      document.body.classList.remove('camera-bg');
    },
  };
}
