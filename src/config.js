/**
 * アプリ設定
 *
 * ■ LIFF_ID(最重要)
 *   LINE Developersコンソールで発行されるID(例: '1234567890-AbcdEfgh')。
 *   空文字のままだと「モックモード」で動作し、LINEと連携せずに通常のブラウザで
 *   全画面の動作確認ができます。
 *
 *   ※ 現在は 002 と同じLIFF ID を入れています。このアプリ(003)をLINEで開くには次のどちらかが必要です。
 *     (A) LINE Developersコンソールで、このLIFFアプリのエンドポイントURLを
 *         https://kounishi.github.io/line-app-camera-003/ に変更する(002 は開けなくなる)
 *     (B) 003 用に新しいLIFFアプリ(ミニアプリ)を作成し、発行されたIDをここに設定する
 *
 * ■ 公式アカウント関連
 *   OFFICIAL_ACCOUNT_URL : 友だち追加URL(例: 'https://lin.ee/xxxxxxx')
 *   OFFICIAL_ACCOUNT_ID  : ベーシックID(例: '@123abcde')。「質問する」でトーク画面を開くのに使用
 *   ASK_MESSAGE          : 「質問する」でトークに送る定型文(リッチメニューの「質問する」と同じ文言にする)
 *   NOTICE_URL           : 「お知らせ」で開くWebページ(JAHIC トピックス)
 *
 * ■ 顧客コード紐付け(サンプル)
 *   CARD_NUMBER_LENGTH    : 紐付け方法1(券面撮影)で読み取るカード番号の桁数
 *   CUSTOMER_CODE_PATTERN : 紐付け方法2(コード入力)で受け付ける顧客コードの形式
 *
 * ■ OCR設定
 *   OCR_ENABLED = true の場合、券面撮影後に文字認識を行い、カード番号を読み取ります。
 *   GOOGLE_VISION_API_KEY が空ならモックOCR(ランダムなカード番号を返す)、設定済みなら Google Cloud Vision を使用します。
 */

export const APP_NAME = 'サンプルミニアプリ';
export const APP_VERSION = '0.3.0';

/** 「当社」として表示する名称 */
export const COMPANY_NAME = 'JAHIC';

export const LIFF_ID = '2011517091-b9lPj4Bz';

export const OFFICIAL_ACCOUNT_URL = 'https://lin.ee/679vBSxY';
export const OFFICIAL_ACCOUNT_ID = '@896brxjh';
export const ASK_MESSAGE = '質問があります';
export const NOTICE_URL = 'https://jahic-etc.com/info/';

/** 紐付け方法1: 券面のカード番号(サンプルでは16桁の数字) */
export const CARD_NUMBER_LENGTH = 16;

/** 紐付け方法2: 顧客コードの形式(サンプルでは8桁の数字) */
export const CUSTOMER_CODE_PATTERN = /^\d{8}$/;
export const CUSTOMER_CODE_HINT = '8桁の数字';

export const OCR_ENABLED = true;
export const GOOGLE_VISION_API_KEY = '';

/** OCRに渡す前に写真を縮小する幅(px)。大きいほど精度が上がるが通信量が増える */
export const OCR_IMAGE_WIDTH = 1600;

/** 紐付け情報と一緒に保存する券面サムネイルの最大幅(px)と品質 */
export const CARD_THUMBNAIL_WIDTH = 320;
export const CARD_THUMBNAIL_QUALITY = 0.7;
