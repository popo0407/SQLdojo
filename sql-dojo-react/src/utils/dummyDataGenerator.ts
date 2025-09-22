/**
 * グラフテスト用のダミーデータ生成ユーティリティ
 */

export interface DummyDataRow {
  日付: string;
  日時: string;
  売上高: number;
  利益: number;
  地域: string;
  商品カテゴリ: string;
}

/**
 * グラフテスト用のダミーデータを生成
 * @param rowCount 生成するデータ行数（デフォルト: 10000）
 * @returns ダミーデータの配列
 */
export function generateDummyData(rowCount: number = 10000): DummyDataRow[] {
  const regions = ['東京', '大阪', '名古屋', '福岡', '札幌'];
  const categories = ['電子機器', '衣料品', '食品', '書籍', '雑貨'];
  
  const data: DummyDataRow[] = [];
  
  for (let i = 0; i < rowCount; i++) {
    // 日時を順次進める（数時間おきにランダムな時刻を追加）
    const currentDate = new Date('2023-01-01');
    currentDate.setDate(currentDate.getDate() + Math.floor(i / 4)); // 1日に4レコード
    currentDate.setHours(6 + (i % 4) * 4); // 6時, 10時, 14時, 18時
    currentDate.setMinutes(Math.floor(Math.random() * 60)); // ランダムな分
    currentDate.setSeconds(0); // 秒は00に固定
    
    // YYYY-MM-DDTHH:MM:SS形式の日時文字列を生成
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hour = String(currentDate.getHours()).padStart(2, '0');
    const minute = String(currentDate.getMinutes()).padStart(2, '0');
    const second = String(currentDate.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    
    // ランダムな売上高（10万〜500万）
    const baseSales = Math.random() * 4900000 + 100000;
    const salesVariation = Math.sin(i * 0.1) * 500000; // 波形変動
    const sales = Math.round(baseSales + salesVariation);
    
    // 利益は売上の10-30%
    const profitRate = Math.random() * 0.2 + 0.1;
    const profit = Math.round(sales * profitRate);
    
    // ランダムな地域と商品カテゴリ
    const region = regions[Math.floor(Math.random() * regions.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    data.push({
      日付: currentDate.toISOString().split('T')[0], // YYYY-MM-DD形式
      日時: formattedDateTime, // YYYY-MM-DDTHH:MM:SS形式
      売上高: sales,
      利益: profit,
      地域: region,
      商品カテゴリ: category,
    });
  }
  
  return data;
}

/**
 * ダミーデータのカラム名を取得
 */
export function getDummyDataColumns(): string[] {
  return ['日付', '日時', '売上高', '利益', '地域', '商品カテゴリ'];
}