# パラメータ検証機能テスト用 SQL 例

## 1. 未入力エラーのテスト

### 自由入力（未入力）

```sql
SELECT * FROM users WHERE name = '{名前}'
```

期待されるエラー: 「名前」が入力されていません

### 選択式（未選択）

```sql
SELECT * FROM users WHERE status = '{ステータス[有効,無効]}'
```

期待されるエラー: 「ステータス」が入力されていません

### 複数項目（空配列）

```sql
SELECT * FROM users WHERE id IN ({ID[]})
```

期待されるエラー: 「ID」が入力されていません

### 複数項目（空の項目含む）

```sql
SELECT * FROM users WHERE id IN ({ID['']})
```

期待されるエラー: 「ID」に空の項目が含まれています

## 2. 正常な入力のテスト

### 自由入力（正常）

```sql
SELECT * FROM users WHERE name = '{名前}'
```

入力値: "田中太郎"
期待される結果: `SELECT * FROM users WHERE name = '田中太郎'`

### 選択式（正常）

```sql
SELECT * FROM users WHERE status = '{ステータス[有効,無効]}'
```

選択値: "有効"
期待される結果: `SELECT * FROM users WHERE status = '有効'`

### 複数項目（正常）

```sql
SELECT * FROM users WHERE id IN ({ID[]})
```

入力値: ["1", "2", "3"]
期待される結果: `SELECT * FROM users WHERE id IN (1,2,3)`

### 複数項目（クォート付き）

```sql
SELECT * FROM users WHERE id IN ({ID['']})
```

入力値: ["A001", "A002", "A003"]
期待される結果: `SELECT * FROM users WHERE id IN ('A001','A002','A003')`

## 3. 複数パラメータのテスト

### 複数パラメータ（一部未入力）

```sql
SELECT * FROM users
WHERE name = '{名前}'
AND status = '{ステータス[有効,無効]}'
AND id IN ({ID[]})
```

期待されるエラー:

- 「名前」が入力されていません
- 「ステータス」が入力されていません
- 「ID」が入力されていません

### 複数パラメータ（正常）

```sql
SELECT * FROM users
WHERE name = '{名前}'
AND status = '{ステータス[有効,無効]}'
AND id IN ({ID[]})
```

入力値:

- 名前: "田中太郎"
- ステータス: "有効"
- ID: ["1", "2", "3"]

期待される結果:

```sql
SELECT * FROM users
WHERE name = '田中太郎'
AND status = '有効'
AND id IN (1,2,3)
```
