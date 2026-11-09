<!-- tools/build.mjs が meta.json から作ったファイルです。直すときは meta.json を編集してください。 -->

# LP・Webサイトの演出 第2弾

24 個の名前 · #145–168 · パック `lp2` · 言語: [English](README.md) / [Español](README.es.md) / [简体中文](README.zh-Hans.md) / [繁體中文](README.zh-Hant.md)

名前を見つけたら、そのままAIに伝えてください。「何秒で」「どのくらい強く」「何が動くか」を添えると、思った通りに近づきます。

![LP・Webサイトの演出 第2弾 — 見本](../../assets/preview-lp2.gif)

## スクロールで起きる演出

| 番号 | 名前 | 英語名 | ひとこと | AIへの頼み方の例 |
|---|---|---|---|---|
| [#145](https://showheyohtaki.github.io/motion-prompt/#145) | **タイムラインアニメーション** | Timeline on scroll | スクロールで年表の線が伸びる | 会社のあゆみをタイムラインアニメーションにして。スクロールに合わせて縦線を伸ばし、線が届いた年から順に出して。 |
| [#146](https://showheyohtaki.github.io/motion-prompt/#146) | **スクロールテキストリビール** | Scroll text reveal | 読み進めると文字が順に濃くなる | コンセプト文にスクロールテキストリビールを付けて。最初は薄いグレーで、スクロールに合わせて1文字ずつ濃くして。 |
| [#147](https://showheyohtaki.github.io/motion-prompt/#147) | **スタッキングカード** | Stacking cards | スクロールでカードが積み重なる | サービスの3ステップをスタッキングカードにして。スクロールで次のカードが下から来て、12pxずつずらして重なるように。 |
| [#148](https://showheyohtaki.github.io/motion-prompt/#148) | **背景色の切り替え** | Background color change on scroll | セクションごとに背景の色が変わる | セクションごとに背景色の切り替えを入れて。スクロールで朝はクリーム、夜は濃紺、休日は水色へなめらかに変えて。 |
| [#149](https://showheyohtaki.github.io/motion-prompt/#149) | **隠れるヘッダー** | Hide-on-scroll header | 下へで隠れて上へで出てくる | ヘッダーを隠れるヘッダーにして。下へスクロールしたら0.3秒で上へ隠し、少しでも上へ戻したら出して。 |
| [#150](https://showheyohtaki.github.io/motion-prompt/#150) | **スクロールスパイ** | Scrollspy | 読んでいる見出しが目次で光る | 記事の目次にスクロールスパイを付けて。今読んでいる見出しの項目を朱色にして、切り替えは0.25秒で。 |
| [#151](https://showheyohtaki.github.io/motion-prompt/#151) | **トップへ戻るボタン** | Back-to-top button | 下まで読むと現れて押すと先頭へ | 記事ページにトップへ戻るボタンを付けて。少しスクロールしたら右下に出して、押したら0.6秒で先頭まで戻して。 |
| [#152](https://showheyohtaki.github.io/motion-prompt/#152) | **スクロールで拡大** | Zoom on scroll | 画像が画面いっぱいまで広がる | ファーストビューの写真をスクロールで拡大にして。中央の小さな写真をスクロールに合わせて画面いっぱいまで広げ、広がりきったら見出しを重ねて。 |

## マウス・入力への反応

| 番号 | 名前 | 英語名 | ひとこと | AIへの頼み方の例 |
|---|---|---|---|---|
| [#153](https://showheyohtaki.github.io/motion-prompt/#153) | **3Dチルト** | 3D tilt on hover | カーソルの向きにカードが傾く | 会員カードに3Dチルトを付けて。カーソルの位置に合わせて最大18°傾けて、光の反射も動かして。 |
| [#154](https://showheyohtaki.github.io/motion-prompt/#154) | **スポットライトホバー** | Spotlight hover | カーソルの周りだけ明るくなる | 特長のカードにスポットライトホバーを付けて。暗いカードの上で、カーソルの周り半径120pxくらいだけ明るくして、縁も光らせて。 |
| [#155](https://showheyohtaki.github.io/motion-prompt/#155) | **ホバーで画像切り替え** | Image swap on hover | 乗せると別の写真に切り替わる | 商品一覧にホバーで画像切り替えを付けて。カーソルを乗せたら0.3秒で後ろ姿の写真にクロスフェードして。 |
| [#156](https://showheyohtaki.github.io/motion-prompt/#156) | **テキストロール** | Text roll on hover | 文字が上に回って入れ替わる | グローバルメニューにテキストロールを付けて。カーソルを乗せたら文字が1文字ずつ0.035秒ずらして上へ回り、朱色の同じ文字が下から出るように。 |
| [#157](https://showheyohtaki.github.io/motion-prompt/#157) | **ホバーで画像プレビュー** | Hover image reveal | リストに乗せると写真が出る | 施設一覧をホバーで画像プレビューにして。行にカーソルを乗せたら、その写真をカーソルの横に0.25秒で出して、カーソルについて動かして。 |
| [#158](https://showheyohtaki.github.io/motion-prompt/#158) | **フローティングラベル** | Floating label | 入力するとラベルが上へ移る | フォームの入力欄をフローティングラベルにして。フォーカスしたらラベルを0.24秒で小さくして枠の上の線へ移して。 |
| [#159](https://showheyohtaki.github.io/motion-prompt/#159) | **インラインバリデーション** | Inline validation | 入力中に正誤をその場で表示 | お問い合わせフォームにインラインバリデーションを入れて。メールアドレスを打っている間は赤で「形式が正しくありません」、正しくなったら緑のチェックを出して。 |
| [#160](https://showheyohtaki.github.io/motion-prompt/#160) | **ローディングボタン** | Loading button | 押すと読み込み中から完了に変わる | 送信ボタンをローディングボタンにして。押したら0.3秒で丸く縮めて回る表示にし、終わったら緑のチェックと「完了」に変えて。 |

## 見せ場の演出

| 番号 | 名前 | 英語名 | ひとこと | AIへの頼み方の例 |
|---|---|---|---|---|
| [#161](https://showheyohtaki.github.io/motion-prompt/#161) | **ビュートランジション** | View transition (shared element) | 一覧の写真がそのまま詳細へ広がる | 実績一覧から詳細ページへの移動をビュートランジションにして。押した写真がそのまま0.6秒で詳細の上部まで広がるように。 |
| [#162](https://showheyohtaki.github.io/motion-prompt/#162) | **ライトボックス** | Lightbox | 画像を押すと暗い背景の上で拡大 | 施工事例の写真をライトボックスで見られるようにして。押したら背景を暗くして写真を中央に拡大し、左右の矢印で前後に送れるように。 |
| [#163](https://showheyohtaki.github.io/motion-prompt/#163) | **ホットスポット** | Hotspots | 画像の点を押すと説明が出る | 商品写真にホットスポットを付けて。特長の場所に脈打つ点を置き、押したら説明の吹き出しを0.25秒で出して。 |
| [#164](https://showheyohtaki.github.io/motion-prompt/#164) | **カウントダウンタイマー** | Countdown timer | 締切までの残り時間が減っていく | キャンペーンの締切にカウントダウンタイマーを付けて。時:分:秒で、数字が変わるたびに0.3秒で下から入れ替わるように。 |
| [#165](https://showheyohtaki.github.io/motion-prompt/#165) | **シェイプディバイダー** | Animated shape divider | 区切りの波形がゆれ続ける | ファーストビューと次のセクションの境目にシェイプディバイダーを入れて。白い波を2枚重ねて、ゆっくり逆向きに揺らし続けて。 |
| [#166](https://showheyohtaki.github.io/motion-prompt/#166) | **いいねアニメーション** | Like button animation | 押すとハートが弾ける | 投稿のいいねボタンにいいねアニメーションを付けて。押したらハートを赤く塗って1.45倍まで弾ませ、周りに小さな粒を散らして、数字も1増やして。 |
| [#167](https://showheyohtaki.github.io/motion-prompt/#167) | **スクロールダウンの合図** | Scroll-down cue | 下へ促す矢印が動き続ける | ファーストビューの下にスクロールダウンの合図を入れて。マウスの形の中の点が約1.5秒ごとに下へ動いて消えるのをくり返して。 |
| [#168](https://showheyohtaki.github.io/motion-prompt/#168) | **背景動画** | Background video | ファーストビューの背景で映像が流れる | ファーストビューを背景動画にして。音なしでくり返し流し、文字が読めるように左側に暗いグラデーションを重ねて。 |

番号を押すと、ギャラリーの動く見本が開きます。1つの名前の秒数・イージングの数値・参考コード: `api/v1/ja/e/<id>.txt` ([#145](../../api/v1/ja/e/145.txt)).

[パックの一覧](../README.md)
