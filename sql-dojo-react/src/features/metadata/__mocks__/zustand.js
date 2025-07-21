// テスト用のzustandモック（必要に応じて拡張）
module.exports = {
  create: jest.fn(() => () => ({})),
}; 