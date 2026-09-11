import { CARD_NUMBER_LENGTH, GOOGLE_VISION_API_KEY, OCR_ENABLED } from '../config.js';

/**
 * OCR(文字認識) — 券面からカード番号を読み取る
 *   off    : OCRを行わない(番号は手入力)
 *   mock   : 通信せずダミーのカード番号を返す(APIキー不要でフローを確認できる)
 *   google : Google Cloud Vision API で文字認識し、テキストからカード番号を抜き出す
 *
 * @returns {'off' | 'mock' | 'google'}
 */
export function getOcrMode() {
  if (!OCR_ENABLED) return 'off';
  return GOOGLE_VISION_API_KEY ? 'google' : 'mock';
}

export function getOcrModeLabel() {
  switch (getOcrMode()) {
    case 'off':
      return 'OCRなし(番号は手入力)';
    case 'google':
      return 'Google Vision OCR';
    default:
      return 'モックOCR(テスト用・APIキー未設定)';
  }
}

/**
 * OCRテキストからカード番号らしい数字列を抜き出す
 *   「1234 5678 9012 3456」「1234-5678-9012-3456」のように区切られていても拾う
 * @returns {string} 半角数字のみ。見つからなければ ''
 */
export function extractCardNumber(text) {
  const normalized = String(text ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const candidates = normalized.match(/\d(?:[\s-]?\d){13,18}/g) ?? [];
  const digitsList = candidates.map((c) => c.replace(/\D/g, ''));
  // 設定桁数に一致するものを優先し、なければ最も長いもの
  return (
    digitsList.find((d) => d.length === CARD_NUMBER_LENGTH) ??
    digitsList.sort((a, b) => b.length - a.length)[0] ??
    ''
  );
}

/**
 * 券面画像(JPEG base64)からカード番号を読み取る
 * @returns {Promise<{ cardNumber: string, rawText: string }>}
 */
export async function recognizeCardNumber(base64Jpeg) {
  const mode = getOcrMode();
  if (mode === 'off') return { cardNumber: '', rawText: '' };
  if (mode === 'mock') return mockRecognizeCard();
  const rawText = await googleVisionRecognize(base64Jpeg);
  return { cardNumber: extractCardNumber(rawText), rawText };
}

async function googleVisionRecognize(base64Jpeg) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
  const body = {
    requests: [
      {
        image: { content: base64Jpeg },
        features: [{ type: 'TEXT_DETECTION' }],
        imageContext: { languageHints: ['ja', 'en'] },
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vision APIエラー (HTTP ${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const response = json?.responses?.[0];
  if (response?.error) {
    throw new Error(`Vision APIエラー: ${response.error.message ?? '不明なエラー'}`);
  }
  return response?.fullTextAnnotation?.text ?? '';
}

/** モックOCR: 通信せず、少し待ってからダミーのカード番号を返す */
async function mockRecognizeCard() {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const digits = Array.from({ length: CARD_NUMBER_LENGTH }, () => Math.floor(Math.random() * 10)).join('');
  const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  const d = new Date();
  const expiry = `${String(d.getMonth() + 1).padStart(2, '0')}/${String((d.getFullYear() + 3) % 100).padStart(2, '0')}`;
  return {
    cardNumber: digits,
    rawText: ['ETC CARD', formatted, `VALID THRU ${expiry}`, '(モックOCR: 実際の画像は解析していません)'].join('\n'),
  };
}
