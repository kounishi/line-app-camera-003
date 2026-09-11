# LINE公式アカウント向け ミニアプリ(LIFF)サンプル v0.3 — リッチメニュー(テキスト送信)起点版

LINE公式アカウントの **リッチメニューをタップ → トーク画面にメニュー名のテキストが送信される → その応答メッセージのリンクからミニアプリ(LIFFアプリ)の各機能を開く** 構成のサンプルです。
`line-app-camera-002` を元に、リッチメニューの構成(6項目)と起動方式、顧客コード紐付けの方法(券面撮影)を変更した別バージョンです。

ビルド不要の静的Webアプリ(HTML / CSS / JavaScript のみ)で、GitHub Pagesで公開できます。

- 公開URL(LIFFエンドポイントURL): **https://kounishi.github.io/line-app-camera-003/** (リポジトリ作成・GitHub Pages有効化後)
- 元にしたプロジェクト: https://github.com/kounishi/line-app-camera-002

## 002 からの主な変更点

| 項目 | 002 | 003(本リポジトリ) |
|---|---|---|
| リッチメニュー | 7項目。ミニアプリの機能は「リンク」アクションで直接開く | **6項目(お知らせ / 各種申請 / ご請求額 / 契約状況 / 質問する / 緊急連絡先)**。全ボタンを「テキスト」アクションにし、トークに送信されたテキストを起点に各機能を開く |
| 顧客コード紐付け | 顧客コード + 電話番号の入力 | **方法1: カードの券面をカメラで撮影 → カード番号からカード所有者を検索して紐付け**(サンプルでは検索なしで見かけ上完了)。方法2としてコード入力も残している |
| 券面カメラ撮影・リスト登録 | 独立した機能 | 廃止(カメラは紐付けに使用) |
| ご請求額 | なし | **新規**。今月のご請求額・内訳・過去6か月(サンプル) |
| 各種連絡先検索 | 管理事務所などの検索 | **緊急連絡先**。高速道路・ETCに関連する連絡先 + 電話番号の検索画面(次の段階でメニュー化予定) |
| 紐付け解除 | マイページ | マイページ + ホームのバナー。解除すると最初から紐付け操作が必要になる(サンプル用) |

## 全体の流れ

```
LINE公式アカウント トーク画面
    │
    └─ リッチメニュー(6ボタン。全ボタン「テキスト」アクション)
          │  タップするとメニュー名のテキストがトークに送信される
          │
          ├─ お知らせ      → 「お知らせ」      → 応答: JAHICトピックスのURL ……………… https://jahic-etc.com/info/
          ├─ 各種申請      → 「各種申請」      → 応答: ミニアプリURL ?screen=apply    (要 顧客コード紐付け)
          ├─ ご請求額      → 「ご請求額」      → 応答: ミニアプリURL ?screen=billing  (要 顧客コード紐付け)
          ├─ 契約状況      → 「契約状況」      → 応答: ミニアプリURL ?screen=contract (要 顧客コード紐付け)
          ├─ 質問する      → 「質問があります」 → 応答: AIチャット(Messaging API Webhook側)が会話を開始
          └─ 緊急連絡先    → 「緊急連絡先」    → 応答: ミニアプリURL ?screen=contacts

ミニアプリ(本リポジトリ)
    ?screen=apply / billing / contract … 未紐付けなら「顧客コードの紐付けが必要です」→ 紐付け → 元の画面へ自動で進む
                                          紐付け済みならそのまま該当画面が開く
    ?screen=contacts ……………………………… 紐付け不要でそのまま開く
```

「応答」は、LINE Official Account Manager の **応答メッセージ(キーワード応答)** だけで実現できます(サーバー不要)。Webhook(Messaging API)を使う場合は、受信したテキストを判定して同じ内容を返信します。

## リッチメニューの設定値

LINE Official Account Manager(https://manager.line.biz/) → ホーム → リッチメニュー で作成します。
テンプレートは「大 / 6分割(2行×3列)」を選び、`assets/richmenu.png` (元ファイル: `リッチメニュー01.png`)を背景画像にします。

| 位置 | ボタン | アクション種別 | 設定値(送信されるテキスト) |
|---|---|---|---|
| 上段 左 | お知らせ | テキスト | `お知らせ` |
| 上段 中 | 各種申請 | テキスト | `各種申請` |
| 上段 右 | ご請求額 | テキスト | `ご請求額` |
| 下段 左 | 契約状況 | テキスト | `契約状況` |
| 下段 中 | 質問する | テキスト | `質問があります` |
| 下段 右 | 緊急連絡先 | テキスト | `緊急連絡先` |

この定義はミニアプリ側の `src/data/richMenu.js` にも同じ内容で持っており、ホーム画面のタイル、マイページの「リッチメニュー設定値(開発用)」に使っています。文言を変える場合は両方を揃えてください。

## 応答メッセージの設定(サーバー不要の方法)

LINE Official Account Manager → 設定 → 応答設定 で **応答メッセージ: オン** にし、ホーム → 自動応答メッセージ(応答メッセージ) で、次の6件を **キーワード応答(完全一致)** として登録します。
`{LIFF_ID}` は `src/config.js` の `LIFF_ID` に置き換えてください。マイページの「リッチメニュー設定値(開発用)」を開くと、設定中の LIFF ID を埋め込んだ文面がそのまま表示されます。

| キーワード | 応答メッセージ(テキスト) |
|---|---|
| `お知らせ` | 最新のお知らせ・トピックスはこちらをご覧ください。<br>`https://jahic-etc.com/info/` |
| `各種申請` | 各種申請はこちらからお手続きいただけます。<br>`https://miniapp.line.me/{LIFF_ID}?screen=apply`<br>※初回のみ、お客様の顧客コードとLINEアカウントの紐付けが必要です。 |
| `ご請求額` | ご請求額はこちらからご確認いただけます。<br>`https://miniapp.line.me/{LIFF_ID}?screen=billing`<br>※初回のみ、お客様の顧客コードとLINEアカウントの紐付けが必要です。 |
| `契約状況` | ご契約状況はこちらからご確認いただけます。<br>`https://miniapp.line.me/{LIFF_ID}?screen=contract`<br>※初回のみ、お客様の顧客コードとLINEアカウントの紐付けが必要です。 |
| `質問があります` | ご質問をこのトークにそのまま入力してください。担当者(AIチャット)がお答えします。<br>(AIチャットをWebhookで実装する場合は、この応答は登録せずWebhook側で返答する) |
| `緊急連絡先` | 高速道路・ETCに関する緊急連絡先はこちらから検索できます。<br>`https://miniapp.line.me/{LIFF_ID}?screen=contacts`<br>事故・故障など緊急の場合は、道路緊急ダイヤル #9910 へ。 |

- テキスト内のURLはトーク上で自動的にリンクになります。`https://miniapp.line.me/{LIFF_ID}?screen=xxx` をタップするとミニアプリがその画面から起動します。
- 応答メッセージの代わりに **リッチメッセージ / カードタイプメッセージ** を使うと、ボタン付きの見た目にできます(アクションに同じURLを設定)。
- **Webhook(Messaging API)を併用する場合**: 応答設定で「応答メッセージ」と「Webhook」を両方オンにすると、キーワードに一致したメッセージは応答メッセージが返し、それ以外(自由入力の質問など)はWebhookに届きます。Webhook側でも同じ6キーワードを判定して Flex Message 等で返信する構成にすれば、応答メッセージをオフにして一元管理することもできます。

### 「質問する」(AIチャット)について

トーク画面のAIチャットは、公式アカウントのMessaging API(Webhook)でメッセージを受け取り、AIで回答を生成して返信するサーバー側の仕組みです。静的ホスティングのミニアプリでは実装できないため、本リポジトリには含めていません。別途Webhookサーバー(Node.js / Python / Azure Functions など)を用意してください。
ミニアプリのホームの「質問する」タイルは、公式アカウントのトーク画面を開いて定型文(`ASK_MESSAGE` = リッチメニューと同じ「質問があります」)を入力欄にセットします。

## LINE IDと顧客コードの紐付け

各種申請・ご請求額・契約状況は、LINEアカウント(userId)と当社(JAHIC)の顧客データにある顧客コードの紐付けが済んでいないと利用できません。
未紐付けのユーザーがこれらを開くと(リッチメニュー経由の `?screen=apply` などの直接起動も含む)、**「顧客コードの紐付けが必要です」という案内画面** を表示し、「紐付けを行う」から紐付け画面へ誘導します。紐付けが完了すると、元の画面(各種申請など)へ自動的に進みます。紐付け済みなら該当画面がそのまま開きます。

### 紐付け方法1: カードの券面を撮影(推奨・本サンプルの主対象)

```
紐付け方法の選択 → 説明 → カメラで撮影(または 📁 端末の写真を選択)
  → OCRでカード番号を読み取り(モック: ランダムな16桁) → カード番号の確認・修正
  → 「この券面で紐付ける」 → 送信 → カード番号から顧客を検索 → 顧客コードとLINE IDを紐付け(進行表示)
  → 完了ダイアログ(顧客コード・お名前) → 元の画面へ
```

- **現段階では検索処理は行いません。** カード番号から顧客コード・氏名を決定的に生成し、「見かけ上」紐付けが完了して各機能のメニューが動く状態を作っています(`src/lib/account.js` の `linkByCard()`)。
- 撮影した券面はサムネイル(幅320px)で紐付け情報と一緒に端末内(localStorage)へ保存し、マイページで確認できます。
- カード番号の桁数は `CARD_NUMBER_LENGTH`(既定16)で変更できます。

### 紐付け方法2: 顧客コードと電話番号を入力

002 と同じ、形式チェックのみで紐付けが完了するサンプルです(`linkByCode()`)。紐付け方法の選択画面から選べます。今後、別の紐付け方法(例: LINEのアカウント連携機能)を追加する場合も、この選択画面に足していく想定です。

### 紐付けの解除(サンプル用)

マイページの「紐付けを解除する」、またはホームの紐付け済みバナーの「紐付けを解除(サンプル用)」で解除できます。解除すると、各種申請・ご請求額・契約状況は **再度最初から紐付けの操作** が必要になります。マイページの「サンプルデータを初期化」で紐付けと申請データをまとめて消すこともできます。

### 保存先・サンプル実装の内容

| 項目 | 内容 |
|---|---|
| 保存先 | ブラウザ内 `localStorage`(キー `line_miniapp_account_links_v2`)。LINE userId ごとに保存 |
| 方法1の判定 | カード番号の桁数チェックのみ。顧客コードはカード番号から決定的に生成 |
| 方法2の判定 | 顧客コード(8桁数字)・電話番号の形式チェックのみ |
| 契約情報 / 請求情報 | 顧客コードから決定的に生成したダミー(同じ顧客コードなら毎回同じ内容) |

### 本番での置き換え方針

`src/lib/account.js` の関数の中身を自社APIに差し替えます。

1. `linkByCard()`: 券面画像(またはOCRで読み取ったカード番号)と LINE userId をサーバーへ送り、**カード番号からカード所有者の顧客コードを検索** して一致した場合のみ紐付けを保存する。紐付け状態はサーバーを正とする。券面画像のOCRもサーバー側で行う方が安全(APIキーを配信しなくてよい)。
2. `linkByCode()`: LINE userId・顧客コード・本人確認情報(電話番号など)をサーバーへ送り、顧客マスタと照合する。
3. `getLink()` / `getContractInfo()` / `src/lib/billing.js` の `getBillingInfo()`: サーバーから取得する。
4. LINE userId は LIFF の `liff.getProfile()` で取得しているが、本番ではなりすまし防止のため **IDトークン(`liff.getIDToken()`)をサーバーで検証** して userId を確定させる。
5. 代替案として、LINE公式の「アカウント連携(Account Link)」機能(Messaging API)を使うと、トーク画面からの紐付けフローも作れる。

## 機能一覧

| 画面 | `?screen=` | 内容 | 紐付け |
|---|---|---|---|
| **ホーム** | (なし) | LINEプロフィールと接続状態、紐付け状態バナー、リッチメニューと同じ6項目のタイル(同じ並び・配色)、起動の仕組みの説明 | - |
| **お知らせ** | - | JAHICトピックス(`NOTICE_URL`)を外部ブラウザで開く | 不要 |
| **各種申請** | `apply` | 申請種別(カード追加発行 / 再発行 / 登録情報変更 / 利用停止・解約 / その他)→ 入力フォーム → 確認 → 送信。受付番号を発行 | 必要 |
| **申請状況** | `status` | 自分の申請を新しい順に表示(各種申請から遷移)。行をタップで内容を展開。受付済みのうちは取り消し可 | 必要 |
| **ご請求額** | `billing` | 今月のご請求額(前月ご利用分)と状態(集計中 / 請求確定 / お支払い済み)、内訳、お支払い情報、過去6か月のご請求(タップで内訳) | 必要 |
| **契約状況** | `contract` | 契約者情報・契約内容・登録カード(紐付けに使ったカードに印)・お支払い。ご請求額 / カード追加発行 / 登録情報変更へのショートカット | 必要 |
| **質問する** | - | 公式アカウントのトーク画面を開き、定型文を入力欄にセット | 不要 |
| **緊急連絡先** | `contacts` | 緊急時の連絡先(#9910、110、119、カード紛失窓口)を上部に固定表示。道路名・状況のキーワード検索、種別フィルター(事故・故障 / 高速道路会社 / 交通情報 / ETC・カード / 当社窓口)、タップで電話発信 | 不要 |
| **顧客コードの紐付け** | `link` | 紐付け方法の選択 → 方法1(券面撮影) / 方法2(コード入力) | - |
| **マイページ** | `mypage` | LINEプロフィール、紐付け状態(方法・使用したカード・券面サムネイル・解除)、友だち状態、リッチメニュー設定値(開発用)、環境情報、サンプルデータの初期化 | - |

- 申請状況の状態はサンプルとして「受付からの経過時間」で 受付済み(〜1分) → 処理中(〜3分) → 完了 と変化します。
- ご請求額のサイクル(毎月10日確定・27日支払い)と金額はサンプルです(`src/lib/billing.js`)。
- 申請種別と入力項目は `src/data/applicationTypes.js`、緊急連絡先は `src/data/contacts.js` で定義しています。

### 緊急連絡先のデータについて

`src/data/contacts.js` の高速道路会社・公的機関の電話番号(道路緊急ダイヤル #9910、NEXCO東日本 / 中日本 / 西日本、首都高、阪神高速、JAF、日本道路交通情報センター)は **作成時点(2026年9月)の公開情報を参考に入れたもの** です。運用前に必ず各社公式サイトで最新の番号・受付時間を確認してください。「(サンプル)」と付いた当社窓口は架空の番号です。
次の段階では、この検索画面の上に「状況から選ぶ」などのメニューを作る予定です。

## 動かし方

### PCブラウザで確認(localhost)

```bash
npm start
# または
python -m http.server 3000
```

`http://localhost:3000/?mock=1` を開きます。**`?mock=1`** を付けるとLINE非連携(モックモード)で起動し、LINEログインなしで全画面を確認できます(LIFF IDを設定済みでも有効)。
`http://localhost:3000/?mock=1#billing` のようにハッシュで画面を直接開けます(リッチメニュー経由の `?screen=billing` と同じ動き)。

PCにカメラがない場合、撮影画面は自動的に「カメラアプリで撮影 / 写真を選択」の案内に切り替わり、端末の画像ファイルを選んで紐付けフローを確認できます。

> `file://` で直接 `index.html` を開くと、ESモジュールとカメラが動作しません。必ずHTTPサーバー経由で開いてください。

### GitHub Pagesで公開する

1. GitHubで `line-app-camera-003` リポジトリ(public)を作成する
2. このフォルダで初期コミットしてプッシュする

```bash
git init
git add .
git commit -m "LINEミニアプリ サンプル v0.3 初版(リッチメニュー テキスト起点版)"
git branch -M main
git remote add origin https://github.com/kounishi/line-app-camera-003.git
git push -u origin main
```

3. リポジトリの Settings → Pages で Source を `main` / `/ (root)` にする。約1分後に https://kounishi.github.io/line-app-camera-003/ で公開されます

以降の更新はコミットしてプッシュするだけです。反映が遅い場合はGitHub Pagesのキャッシュが最大10分残るため、少し待つかスーパーリロードしてください。
`.nojekyll` はGitHub Pages側の自動処理(Jekyll)を無効にしてファイルをそのまま配信するための空ファイルです。

> Google Vision APIキーを使う場合は `src/config.js` にキーを入れたままコミットせず、APIキー側でHTTPリファラー制限をかけてください。

### LINEアプリ内で確認

`src/config.js` の `LIFF_ID` には現在 **002 と同じ本番用LIFF ID(`2011517091-b9lPj4Bz`)** を入れています。このLIFFアプリのエンドポイントURLは 002 の公開URLなので、003 をLINEで開くには次のどちらかが必要です。

- **(A) 既存LIFFアプリのエンドポイントURLを変更する**: LINE Developersコンソールで、エンドポイントURLを `https://kounishi.github.io/line-app-camera-003/` に変更する(002 はLINEから開けなくなる)。`LIFF_ID` はそのまま。
- **(B) 003 用にLIFFアプリを新規作成する**(推奨): 下記「LINE Developersコンソールの設定」で新しいLIFFアプリを追加し、発行されたIDを `LIFF_ID` に設定する。応答メッセージのURLもその新しいIDにする。

設定後、スマートフォンのLINEで `https://miniapp.line.me/{LIFF_ID}` を開くか、公式アカウントのリッチメニューから起動します。
未認証ミニアプリの「本番用」LIFF IDはエンドユーザーが誰でも開けます。「開発用」LIFF IDはチャネルの権限設定でAdminまたはTesterになっているLINEアカウントでしか開けません(「システムエラー」になる場合はTesterとして招待してください)。

## LINE Developersコンソールの設定

| 項目 | 設定値 |
|---|---|
| チャネル種別 | LINEミニアプリ(推奨)。従来のLINEログインチャネル + LIFF でも可 |
| サイズ | Full |
| エンドポイントURL | `https://kounishi.github.io/line-app-camera-003/` |
| Scope | `profile`、`openid` |
| ボットリンク機能 | On (Normal) または On (Aggressive) |

発行されたLIFF IDを `src/config.js` の `LIFF_ID` に設定します。

## 設定項目(`src/config.js`)

| 定数 | 説明 |
|---|---|
| `APP_NAME` / `APP_VERSION` | 画面に表示するアプリ名・バージョン |
| `COMPANY_NAME` | 「当社」として表示する名称(既定: JAHIC) |
| `LIFF_ID` | LIFF ID。空ならモックモード(LINE非連携で全画面を確認できる) |
| `OFFICIAL_ACCOUNT_URL` | 公式アカウントの友だち追加URL(`https://lin.ee/...`) |
| `OFFICIAL_ACCOUNT_ID` | 公式アカウントのベーシックID(`@xxxx`)。ホームの「質問する」でトーク画面を開くのに使用 |
| `ASK_MESSAGE` | 「質問する」でトークの入力欄にセットする定型文(リッチメニューの送信テキストと同じにする) |
| `NOTICE_URL` | 「お知らせ」で開くWebページのURL(JAHIC トピックス) |
| `CARD_NUMBER_LENGTH` | 紐付け方法1で読み取るカード番号の桁数(既定16) |
| `CUSTOMER_CODE_PATTERN` / `CUSTOMER_CODE_HINT` | 紐付け方法2の顧客コードの形式(サンプル: 8桁の数字) |
| `OCR_ENABLED` | 券面撮影後にOCRを行うか(false なら番号を手入力) |
| `GOOGLE_VISION_API_KEY` | 空ならモックOCR(ランダムなカード番号)。設定するとGoogle Cloud Visionで文字認識し、テキストからカード番号を抜き出す |
| `OCR_IMAGE_WIDTH` | OCRに渡す前に写真を縮小する幅(px) |
| `CARD_THUMBNAIL_WIDTH` / `CARD_THUMBNAIL_QUALITY` | 紐付け情報と一緒に保存する券面サムネイルのサイズ・品質 |

## プロジェクト構成

```
index.html                    エントリーポイント(LIFF SDK読み込み・下部タブバー: ホーム / 緊急連絡先 / マイページ)
styles.css                    全画面のスタイル(ホームのタイルはリッチメニュー画像と同じパステル6色)
app.js                        画面切り替え・?screen= による直接起動・紐付けガード
assets/richmenu.png           リッチメニュー画像(LINE Official Account Manager に登録する背景画像)
src/
  config.js                   LIFF ID・公式アカウント・カード番号桁数・OCR設定
  data/
    richMenu.js               リッチメニュー6項目の定義(送信テキスト・開く画面・応答文のひな形)
    applicationTypes.js       各種申請の種別と入力項目(サンプル)
    contacts.js               緊急連絡先データ(高速道路・ETC関連)
  lib/
    liff.js                   LIFF SDKラッパー(未設定時はモック)。トーク画面を開く処理も含む
    account.js                LINE ID と顧客コードの紐付け(方法1: 券面撮影 / 方法2: コード入力)・契約情報(サンプル)
    billing.js                ご請求額のサンプルデータ生成
    applications.js           申請の送信・履歴・状態(サンプル)
    camera.js                 カメラ撮影コンポーネント(ライブプレビュー + 端末の写真選択フォールバック)
    image.js                  カメラフレーム取得・画像縮小
    ocr.js                    券面からカード番号を読み取る(Google Vision / モック / なし)
    dialogs.js                アプリ内モーダルダイアログ・トースト
    format.js                 日時整形など
  screens/
    homeScreen.js             ホーム(リッチメニューと同じ6タイル・起動の仕組みの説明)
    linkRequiredScreen.js     「顧客コードの紐付けが必要です」案内画面
    linkScreen.js             顧客コード紐付け(方法選択 → 券面撮影 → 番号確認 → 紐付け進行 → 完了 / コード入力)
    applyScreen.js            各種申請(種別一覧 → フォーム → 送信)
    statusScreen.js           申請状況
    billingScreen.js          ご請求額
    contractScreen.js         契約状況
    contactsScreen.js         緊急連絡先(検索)
    myPageScreen.js           マイページ
```

## LINEアプリ内ブラウザでのカメラについて

- LIFFブラウザはiOSでは WKWebView、Androidでは Android WebView で動作し、`getUserMedia` によるライブプレビューは環境によって動かない・許可ダイアログが出ない(特にAndroid)という報告があります。
- そのため撮影画面には常に「📁 写真」ボタン(`<input type="file" accept="image/*" capture>`)を用意しています。端末のカメラアプリ / 写真ライブラリを開く方式で、LINEアプリ内でも確実に動作します。カメラが使えない環境では自動的にこの案内に切り替わります。

## 制限・注意点(サンプル版のため)

- **顧客コードの紐付け・申請・契約情報・請求情報はすべて端末内(localStorage)のサンプル実装** です。券面からの顧客検索は行っていません。実運用には自社APIとの接続が必要です(上記「本番での置き換え方針」)。
- **Google Vision APIキーは配信されるJavaScriptに含まれます**。公開する場合はHTTPリファラー制限か中継サーバーを使ってください。券面(カード番号)を扱うため、本番ではOCRと照合はサーバー側で行うことを推奨します。
- 緊急連絡先の電話番号は運用前に必ず公式情報で確認してください。
- LINEのユーザーIDや顧客コード・カード番号を扱うため、本番運用時は利用規約・プライバシーポリシーの整備と、ミニアプリの審査(認証)要件の確認が必要です。

## 参考リンク

- [LINE Developers: LINEミニアプリ用LINE Developersコンソールガイド](https://developers.line.biz/ja/docs/line-mini-app/discover/console-guide/)
- [LINE Developers: LIFFアプリをチャネルに追加する](https://developers.line.biz/ja/docs/liff/registering-liff-apps/)
- [LINE Developers: LIFF APIリファレンス](https://developers.line.biz/ja/reference/liff/)
- [LINE Developers: 権限を管理する](https://developers.line.biz/ja/docs/line-developers-console/managing-roles/)
- [LINE Developers: LINE URLスキーム(トーク画面を開く)](https://developers.line.biz/ja/docs/line-login/using-line-url-scheme/)
- [LINE Developers: Messaging API リッチメニュー](https://developers.line.biz/ja/docs/messaging-api/using-rich-menus/)
- [LINE Official Account Manager](https://manager.line.biz/)
- [LINE for Business: 応答メッセージ(キーワード応答)の設定](https://www.lycbiz.com/jp/manual/OfficialAccountManager/auto-response-message/)
