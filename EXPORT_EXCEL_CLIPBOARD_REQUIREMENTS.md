# エクスポート(Excel / 既存CSV拡張 / クリップボードTSV) 要件定義 & 実装計画

最終更新: 2025-08-14
担当: （記入）
ステータス: Draft → (承認後) Approved

---
## 1. 背景
現行は CSV ダウンロードのみ (POST /sql/download/csv, /sql/cache/download/csv)。
大容量(数万〜最大100万行)データを、追加で Excel(.xlsx) と クリップボード(TSV) 出力する需要がある。ソート / フィルタはサーバ側で適用されるため、エクスポートは“画面表示条件と一致”が必須。UI操作中のエクスポート並列は最小実装(A方式: キャンセル/ロック無し、注意トースト表示)。

---
## 2. スコープ
含む:
- Excel ダウンロード API (SQL 直接 / キャッシュ経由)
- クリップボード TSV コピー機能
- CSV / Excel ファイル名指定 UI（デフォルト export_YYMMDD_hhmmss）
- ソート & フィルタ 全解除ボタン
- 行数上限: .env 管理 (CSV 既存 + Excel + Clipboard)
- 先頭 = + - @ フォーミュラインジェクション対策
- 空データ時ダウンロード禁止
- サーバストリーミング方式採用
除外:
- 国際化 / 監査ログ / Undo / Retry
- Graph(グラフ) 追加（将来拡張）
- Web Worker 化（将来検討）

---
## 3. 用語
- “条件”: 現在 UI 上のフィルタ & ソート指定
- “キャッシュ経由”: session_id を介した高速再読込経路

---
## 4. 機能要件 (FR)
FR-1: Excel ダウンロード (POST /sql/download/excel, POST /sql/cache/download/excel)
FR-2: クリップボード TSV コピー（全件, 条件反映）
FR-3: CSV/Excel ダウンロード前ファイル名入力（モーダル）
FR-4: デフォルトファイル名: export_YYMMDD_hhmmss（ローカル時刻, 2桁表記）
FR-5: ファイル名禁止文字 \ / : * ? " < > | を `_` に置換
FR-6: 行数上限超過時: HTTP 400 + 統一エラー JSON (LIMIT_EXCEEDED)
FR-7: 空結果時: HTTP 404 + 統一エラー JSON (NO_DATA)
FR-8: ソート & フィルタ全解除ボタン (Undo 無し)
FR-9: エクスポート中 UI で条件操作しても現行処理続行 (A方式) + トースト表示
FR-10: TSV 形式: ヘッダ + タブ区切り + \r\n、内部改行は \n へ正規化
FR-11: クリップボード上限超過はクライアント側で事前ブロック
FR-12: Excel セルはすべて文字列、先頭 = + - @ の場合 `'` を付加
FR-13: Excel シート名固定: sheet1
FR-14: Excel/CSV ともにフィルタ・ソート適用結果と一致
FR-15: CSV 既存機能は行数上限・ファイル名指定以外挙動変更しない

---
## 5. 非機能要件 (NFR)
NFR-1: 100万行 (列数 ~50, 平均セル長 30byte 前後) までタイムアウト/メモリ異常なく処理可能（サーバ側）。
NFR-2: サーバメモリ: Excel write_only モード利用で常時 < ~400MB を目安（実測調整）。
NFR-3: レスポンス開始までの初期レイテンシ 3〜5秒以内 (100万行時は許容: 10秒以内)。
NFR-4: UI ブロッキング回避（クリップボード大規模コピーは上限で制御）。
NFR-5: ログ: 失敗時のみエラー出力（追加の監査ログ不要）。

---
## 6. 環境変数 (.env)
```
MAX_RECORDS_FOR_CSV_DOWNLOAD=既存
MAX_RECORDS_FOR_EXCEL_DOWNLOAD=1000000   # デフォルト提案
MAX_RECORDS_FOR_CLIPBOARD_COPY=50000     # 貼り付け実用性考慮（調整可）
```
バリデーション: 1 未満値は起動時に警告しデフォルトへフォールバック。

---
## 7. API 設計
### 7.1 Excel (SQL 直)
- Path: POST /api/v1/sql/download/excel
- Request Body (SQLRequest 拡張不要: 既存 SQLRequest 再利用)
```
{
  "sql": "SELECT ...",
  "limit": null,
  "filename": "optional_custom"
}
```
- Query に載せず Body 一元化。
- Flow: 行数カウント → 上限チェック → 空データチェック → ストリーミング生成
- Response: `Content-Disposition: attachment; filename="<sanitized>.xlsx"`
- Media: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

### 7.2 Excel (キャッシュ)
- Path: POST /api/v1/sql/cache/download/excel
- Body:
```
{
  "session_id": "...",
  "filters": [...],
  "sort_by": "col",
  "sort_order": "ASC|DESC",
  "filename": "optional_custom"
}
```
- 内部で get_cached_data(page=1, page_size=MAX_RECORDS_FOR_EXCEL_DOWNLOAD) 呼び出し。

### 7.3 エラーJSON (統一)
```
{ "error_code": "LIMIT_EXCEEDED", "message": "...", "limit": 100000, "total_count": 123456 }
{ "error_code": "NO_DATA", "message": "データがありません" }
{ "error_code": "INTERNAL_ERROR", "message": "Excel生成に失敗しました" }
```

---
## 8. フロントエンド仕様
### 8.1 Store 拡張
`useUIStore.configSettings` に:
- max_records_for_excel_download?: number
- max_records_for_clipboard_copy?: number

`useResultsExportStore` (新規 or 既存拡張):
- exportCsv(filename?)
- exportExcel(filename?)
- copyTsvToClipboard()
- resetFiltersAndSorting()
- isExporting (bool)

### 8.2 コンポーネント
ExportMenu:
- Buttons: CSV / Excel / Copy TSV / Reset Filters
- CSV & Excel 押下 → FileNameModal 表示
- モーダル: 入力 + バリデーション + 上限説明

### 8.3 トースト
- エクスポート開始時: “エクスポート中: 条件変更は反映されません” (info, 一定秒数 or dismiss 手動)
- 成功: “Excelダウンロード開始” / “CSVダウンロード開始”
- 失敗: エラーコード + メッセージ
- Clipboard 成功: “コピーしました (行数: X)”

### 8.4 クリップボード生成
- データ取得手段:
  1. キャッシュ利用時: `/sql/cache/download/csv` の JSON 版が無い → 新規 JSON 取得? → コスト増。
  2. 代替: 既存 read API を page_size=上限 or total_count で複数回 → 大容量時非効率。
  3. 提案: Clipboard 専用 API を後回し。現段階は キャッシュ経路で『全件が既に保持されている前提』(運用注記)。
- 将来: `/sql/cache/read-all` (stream JSON) 追加で改善。

(注: もし全件未保持ケースが一般的なら追加API設計再検討必要)

### 8.5 フィルタ/ソート解除
- 状態: filters=[], sort_by=null, sort_order=null, page=1 → 再フェッチ
- ボタン disabled 条件: (filters 空 && sort_by null)

---
## 9. サーバ実装詳細 (Excel)
### 9.1 ライブラリ
- openpyxl (write_only=True)
- 1行処理: 不要なスタイル適用禁止（速度重視）
- 文字列化: `cell_value = '' if v is None else str(v)`
- フォーミュラ対策: `if re.match(r'^[=+\-@]', cell_value): cell_value = "'" + cell_value`

### 9.2 処理フロー
1. 行数カウント SQL: SELECT COUNT(*) FROM (<user_sql>) as count_query
2. 上限チェック
3. 実行カーソル取得 (chunk_size=1000)
4. Workbook(write_only=True) / ws=sheet1
5. ヘッダ書き込み
6. chunk ループ & 行→文字列化→append
7. BytesIO へ保存
8. StreamingResponse で返却

### 9.3 キャッシュ経路
- `get_cached_data(...)` を page_size=上限 で取得（内部実装が全件保持する点を確認）
- メモリ使用量増大しないか後続レビュー

---
## 10. エラーハンドリング
| ケース | ステータス | error_code |
|--------|------------|------------|
| 上限超過 | 400 | LIMIT_EXCEEDED |
| 空結果 | 404 | NO_DATA |
| SQL失敗 | 500 | INTERNAL_ERROR |
| キャッシュ session_id 不正 | 400 | INVALID_SESSION (既存踏襲) |

---
## 11. セキュリティ
- フォーミュラインジェクション対策 (Excel)
- ファイル名サニタイズ
- SQL は既存バリデーション/ロギング機構を踏襲

---
## 12. パフォーマンス/スケール指針
### 12.1 openpyxl モード比較 (概算目安)
- write_only=True: 行追加はストリーム化。100万行 x 20列（短テキスト）で ~150–300MB 程度（Pythonプロセス全体）見込み。
- 通常モード: セルオブジェクト保持により 100万行は >1.5〜2GB 以上 → 実質不可。
結論: 20万行超で通常モードは避ける。

### 12.2 グラフ将来構想
1) write_only → グラフ追加 (通常モード切替) は不可（構造保持されない）。
2) 二段構成案（巨大行非対応理由）:
   - 生成済 XLSX を再オープン→openpyxl が全セルロード→大容量でメモリ溢れ。
   - 閾値: 目安 20〜30万行超でリスク急増。
提案:
- rows <= 100k でグラフ有効 (通常モード or 再生成)
- rows > 100k はグラフ省略 or 集計シート (短い範囲) に限定グラフ

---
## 13. Worker 化 vs サーバストリーミング（要約）
| 目的 | サーバストリーミング採用理由 |
|------|------------------------------|
| 100万行対応 | クライアントメモリ・CPU負荷を避け安定性向上 |
| Excel生成 | Pythonライブラリの成熟度 / 型・将来拡張容易さ |
| エラー統一 | 既存FastAPIエラーハンドラ再利用可能 |
| 実装速度 | 既存CSVストリームを流用し拡張しやすい |

Clipboard はクライアント必須領域のため Worker は将来オプション。

---
## 14. 実装ステップ (WBS)
1. 環境変数 & 設定: config_simplified.py 追加 / tests
2. モデル: リクエストに filename オプション追加 (pydantic で Optional[str])
3. エラーレスポンスユーティリティ関数 (error_code 付与)
4. Excel エンドポイント (SQL) 実装 + 単体テスト
5. Excel エンドポイント (Cache) 実装 + 単体テスト
6. CSV 既存: filename 指定受理 (後方互換: 未指定→既存)
7. Front: 設定取得拡張 / 型 更新
8. FileNameModal 実装 + サニタイズ util
9. ExportMenu 実装 / 既存UI統合
10. Clipboard TSV 実装 + 上限チェック
11. フィルタ/ソート全解除ボタン
12. トーストメッセージ追加
13. 結合テスト (小/中/大行数) – 大行数は疑似生成SQL
14. ドキュメント README 追記

---
## 15. テスト計画
ユニット:
- config 読込境界
- ファイル名サニタイズ (記号, 空)
- Excel 生成 (行数: 0/1/1001/境界上限-1/超過)
- フォーミュラ対策 (=1+2)
- LIMIT_EXCEEDED / NO_DATA / INTERNAL_ERROR 分岐
統合:
- SQL→Excel ダウンロード Content-Disposition
- Cache→Excel (filters + sort)
- Clipboard TSV 貼付列整合 (ヘッダ, 行数)
負荷(任意):
- 10万 / 50万 行 Excel 時間 & メモリ採取

---
## 16. デプロイ/移行
1. .env に新変数追加（本番は Terraform / IIS 設定更新）
2. アプリ再起動
3. FE デプロイ後: UI メニューに新ボタン出現
4. ロールバック: 新API未使用なら旧バイナリへ戻し; 既存 CSV API 不変

---
## 17. ロールバック戦略
- 問題発生時: FE ボタンを feature flag (環境変数 ENABLE_EXCEL_EXPORT / ENABLE_CLIPBOARD_EXPORT) で隠す（オプション実装）
- BE: 新APIエンドポイントをコメントアウト or 410 Gone 返却

---
## 18. 将来拡張候補
- グラフ/ピボット用サマリーシート生成
- ストリーミング JSON → クライアント Worker 経由 TSV/CSV
- 圧縮 (ZIP) + 分割ファイル
- 進捗SSE / WebSocket
- メタデータ付きエクスポート (列型, データ辞書)

---
## 19. 決定事項ログ
| 項目 | 決定 | 日付 |
|------|------|------|
| エクスポート中操作ポリシー | A: 継続 + トースト | 2025-08-14 |
| Excel ライブラリ初期 | openpyxl write_only | 2025-08-14 |
| クリップボード形式 | TSV | 2025-08-14 |
| グラフ対応方針 | 将来 / 10万行以下通常モード検討 | 2025-08-14 |
| エラーコード | LIMIT_EXCEEDED / NO_DATA / INTERNAL_ERROR | 2025-08-14 |

---
## 20. 未決事項
(現時点なし)

---
## 21. 参考メモ (openpyxl メモリ概算)
概算式: cell_count = rows * cols; 1セル平均 ~60〜120 byte (参照 + Pythonオブジェクト) 通常モードではさらに倍増。
- 100k x 20 ≈ 2M cells → 通常モード ~250MB+ write_only ~80MB 程度
- 500k x 20 ≈ 10M cells → 通常モード 1GB+ (危険) / write_only ~150–250MB
- 1M x 20 ≈ 20M cells → 通常モード 不可 / write_only ~300–400MB (最適化必要)
※ 実測で要調整。

---
## 22. リスクと軽減
| リスク | 影響 | 対策 |
|--------|------|------|
| 100万行 Excel メモリ逼迫 | OOM | chunk最適化 / 列削減 / 集計出力モード追加 |
| キャッシュ経路全件保持不明 | メモリ膨張 | キャッシュ実装確認 / ページング再取得ストリーミング化検討 |
| Clipboard 大量文字列生成 | ブラウザタブフリーズ | 上限制御 / 分割コピー機能将来検討 |
| 利用者混乱(条件変更反映されず) | UX低下 | 明確トースト / ドキュメント記載 |
| フォーミュラ対策漏れ | セキュリティ | 正規表現一元テスト |

---
## 23. (将来オプション) グラフ出力ポリシーと方式比較

本セクションは “将来オプション” であり、現行スコープ (初回実装) には含めない。WBS / 工数計画へは未反映。実装時にこのポリシーをベースに詳細設計を派生。

### 23.1 環境変数 (先行定義のみ)
```
MAX_ROWS_FOR_EXCEL_CHART=100000   # これ以下でのみ “グラフ出力” オプションを有効化（将来）
```
ポリシー概要 (将来):
- ユーザーが UI で「グラフを含める」(include_charts) を選択した場合のみ判定。
- データ行数 <= MAX_ROWS_FOR_EXCEL_CHART: 通常モード(openpyxl 標準) でデータ行 + 直グラフ生成。
- データ行数 > MAX_ROWS_FOR_EXCEL_CHART: グラフは生成せず write_only モードでデータのみ、UI/ヘッダで “閾値超過によりグラフ省略” を明示。
- ユーザーがグラフ未選択: 行数に関わらず常に write_only。

### 23.2 方式比較 (参考)
| 方式 | 概要 | 難易度 | メモリ | 速度 (閾値内) | 柔軟性 | 推奨用途 |
|------|------|--------|--------|--------------|--------|-----------|
| 通常モード一括 | データとグラフを同一Workbookで逐次構築 | 中 | 高 | 中 | 高 | 閾値以下の標準ケース |
| 二段構成 (推奨しない大規模) | write_only生成→再オープン→グラフ挿入 | 中〜高 | 中〜高 | 低〜中 | 高 | 中規模まで (50–80k) |
| サマリー別シート | 明細=write_only / サマリー小規模通常+グラフ | 中 | 低〜中 | 良 | 中 | 大規模でもグラフ要望時 |

### 23.3 処理速度・メモリ (概算リマインド)
- 通常モード: 10万行×20列 ≈ ~250MB; 速度 ~50k–80k rows/sec。
- write_only: 同条件 ~80MB; 速度 ~80k–120k rows/sec。
- 二段構成: 合計メモリ一時 ~300MB (10万行)。

### 23.4 将来の判定ロジック (UI擬似コード)
```
if !include_charts:
  mode = WRITE_ONLY
elif total_rows <= MAX_ROWS_FOR_EXCEL_CHART:
  mode = NORMAL_WITH_CHARTS
else:
  mode = WRITE_ONLY_NO_CHART
  user_notice = "行数が閾値を超えたためグラフは出力されません"
```

### 23.5 API 拡張案 (未実装)
将来 `POST /sql/download/excel` にオプション:
```
{
  "sql": "...",
  "include_charts": true,
  "chart_type": "line|bar|...",
  "chart_columns": ["col_a", "col_b"],
  "aggregation": {"method": "sum", "group_by": ["date"]}
}
```
現段階では未実装 / フラグ無視。

### 23.6 選択指針まとめ (将来)
- include_charts=false: 常に write_only
- include_charts=true かつ 行数 <= 閾値: 通常モード + グラフ
- include_charts=true かつ 行数 > 閾値: グラフ省略 (write_only) + 明示メッセージ
- 大規模でグラフ強要: サマリー抽出 (集計SQL) のみをグラフ化

### 23.7 リスク (将来)
| リスク | 内容 | 緩和 |
|--------|------|------|
| 閾値過少 | 利用者がグラフ出せない不満 | メトリクス収集し閾値再調整 |
| 閾値過大 | メモリ逼迫/OOM | 起動時警告 + 実測ログ分析 |
| 再オープン遅延 | 二段構成でレスポンス遅延 | サマリーシート方式へ移行 |

(END)
