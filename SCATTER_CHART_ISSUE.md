# 散布図の線表示問題について

## 現在の問題

Excel ファイルに散布図を出力した際、散布図が点（マーカー）のみではなく折れ線グラフとして表示されてしまう問題があります。

## 現在の実装状況

### 1. ファイル場所

- **ファイル**: `app/api/routers/sql.py`
- **関数**: `_add_chart_to_worksheet` (line 430-545)

### 2. 現在のコード（散布図部分）

```python
if chart_type == 'scatter':
    chart = ScatterChart()
    chart.scatterStyle = "marker"  # マーカーのみ（線なし）

    # ... 中略 ...

    # 散布図用のシリーズ作成 - X軸はAxDataSource、Y軸はNumDataSource
    from openpyxl.chart.series import XYSeries
    from openpyxl.chart.data_source import AxDataSource, NumDataSource, NumRef
    x_numref = NumRef(f=str(x_ref))
    y_numref = NumRef(f=str(y_ref))
    x_data = AxDataSource(numRef=x_numref)  # X軸用
    y_data = NumDataSource(numRef=y_numref)  # Y軸用
    series = XYSeries(xVal=x_data, yVal=y_data)
    chart.series.append(series)
```

## 問題の詳細

### 1. 現象

- 散布図として設定しているが、Excel 出力時に点と線の両方が表示される
- 期待値：点（マーカー）のみの表示
- 実際：点と線が表示される（折れ線グラフのような見た目）

### 2. 試行した解決方法

以下の方法を試行しましたが、エラーが発生してグラフ自体が生成されなくなりました：

```python
# 試行1（エラー発生）
from openpyxl.drawing.line import LineProperties
no_line = LineProperties()
no_line.noFill = True
series.spPr = no_line
# エラー: XYSeries.spPr should be GraphicalProperties but value is LineProperties

# 試行2（エラー発生）
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.drawing.line import LineProperties
graphic_props = GraphicalProperties()
line_props = LineProperties()
line_props.noFill = True
graphic_props.ln = line_props
series.spPr = graphic_props
# 結果: グラフが生成されなくなった
```

## 技術仕様

### 使用ライブラリ

- **openpyxl**: Excel ファイル生成ライブラリ
- **openpyxl.chart.ScatterChart**: 散布図作成用クラス
- **openpyxl.chart.series.XYSeries**: 散布図系列作成用クラス

### 設定の流れ

1. フロントエンド（React）でグラフ設定を作成
2. バックエンド（FastAPI）で Excel ファイル生成
3. `_add_chart_to_worksheet`関数で openpyxl を使ってグラフを生成

## 求めている解決方法

### 目標

散布図で**点（マーカー）のみを表示**し、**線を非表示**にする

### 要件

1. openpyxl を使用した実装
2. 既存のグラフ生成機能は維持
3. 棒グラフ・折れ線グラフは従来通り動作
4. エラーが発生せず、グラフが正常に生成される

### 技術的制約

- openpyxl ライブラリの仕様内で実装
- `XYSeries`オブジェクトに対する適切なプロパティ設定
- Excel の散布図仕様に準拠

## フロントエンド側の設定

散布図はフロントエンド（`sql-dojo-react/src/utils/chartUtils.ts`）で以下のように正しく設定されています：

```typescript
// 散布図用データ変換（Chart.js）
if (isScatter) {
  const datasets = config.yColumns.map((yColumn, index) => {
    return {
      label: yColumn,
      data: scatterData,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1,
      pointRadius: 3, // 点のみ表示
    };
  });
}
```

## ログ・エラー情報

### エラーメッセージ（前回の試行時）

```
WARNING:root:Excel chart generation failed: <class 'openpyxl.chart.series.XYSeries'>.spPr should be <class 'openpyxl.chart.shapes.GraphicalProperties'> but value is <class 'openpyxl.drawing.line.LineProperties'>
```

## ✅ 解決方法が判明

### 問題の根本原因

**`XYSeries` を直接作っているため、`scatterStyle="marker"` が効かず線が引かれてしまう** ことが原因でした。

### 正しい解決方法

openpyxl では散布図に系列を追加するときに **`Series` オブジェクト** を使うのが正解で、`XYSeries` を直接生成する必要はありません。`Series` を使えば内部で `GraphicalProperties` が正しく設定され、`scatterStyle="marker"` が効いて「点のみ表示」が可能になります。

### 修正例

```python
from openpyxl.chart import ScatterChart, Series
from openpyxl.chart.reference import Reference

if chart_type == 'scatter':
    chart = ScatterChart()
    chart.scatterStyle = "marker"  # 点のみ

    # Y軸データ系列
    for i, y_col_idx in enumerate(y_col_indices):
        x_values = Reference(worksheet, min_col=x_col_idx, min_row=data_start_row, max_row=data_end_row)
        y_values = Reference(worksheet, min_col=y_col_idx, min_row=data_start_row, max_row=data_end_row)

        # Series を作成（ここが重要）
        series = Series(y_values, x_values, title_from_data=True)

        # 確実に線を非表示にする
        if hasattr(series, 'graphicalProperties') and hasattr(series.graphicalProperties, 'line'):
            series.graphicalProperties.line.noFill = True

        # 系列をチャートに追加
        chart.series.append(series)
```

### ポイント

1. **`XYSeries` ではなく `Series` を使うこと**

   - `Series` を使えば、`scatterStyle="marker"` が有効になり線が消える
   - `XYSeries` は low-level API で、openpyxl の通常の使い方では不要

2. **線を消す方法**

   - `scatterStyle="marker"` を設定するだけで線は出なくなる
   - 追加で `series.graphicalProperties.line.noFill = True` を指定すれば確実に線が非表示

3. **マーカー形状の変更**（任意）
   ```python
   series.marker.symbol = "circle"
   series.marker.size = 5
   ```

### 最終的に欲しい挙動

- 点のみが表示され、折れ線は出ない
- フロントエンドの「点のみ」設定とも一致する

### 結論

`XYSeries` ではなく `Series` を使い、`scatterStyle="marker"` + `series.graphicalProperties.line.noFill = True` を指定すれば「点のみ散布図」を実現できます。
