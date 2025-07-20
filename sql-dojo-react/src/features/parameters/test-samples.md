# パラメータ付き SQL 実行機能 テストサンプル

## 基本機能テスト

### 1. フリーテキスト入力

```sql
SELECT * FROM users WHERE name = '{ユーザー名}'
```

### 2. セレクトボックス

```sql
SELECT * FROM users WHERE status = '{ステータス[有効,無効,保留]}'
```

### 3. 複数項目入力（カンマ区切り）

```sql
SELECT * FROM users WHERE id IN ({ユーザーID[]})
```

### 4. 複数項目入力（シングルクォート付き）

```sql
SELECT * FROM users WHERE name IN ({ユーザー名['']})
```

## 複合テスト

### 複数のパラメータを組み合わせた例

```sql
SELECT * FROM users
WHERE name = '{ユーザー名}'
  AND status = '{ステータス[有効,無効,保留]}'
  AND id IN ({ユーザーID[]})
  AND department IN ({部署名['']})
```

## Excel コピペテスト

### テストデータ

以下のデータを Excel からコピーしてペーストしてください：

**ユーザー ID[] の場合:**

```
1
2
3
4
5
```

**ユーザー名[''] の場合:**

```
田中太郎
佐藤花子
鈴木一郎
```

期待される結果：

- ユーザー ID[]: `1, 2, 3, 4, 5`
- ユーザー名['']: `'田中太郎', '佐藤花子', '鈴木一郎'`
