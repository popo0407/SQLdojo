import '@testing-library/jest-dom';
import { vi } from 'vitest';

// グローバルモックの設定
// @ts-ignore
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// window.matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (typeof global.ClipboardEvent === 'undefined') {
  // Vitest/jsdom用のClipboardEventダミー
  global.ClipboardEvent = class ClipboardEvent extends Event {
    constructor(type: string, eventInitDict: any) {
      super(type, eventInitDict);
      this.clipboardData = eventInitDict && eventInitDict.clipboardData ? eventInitDict.clipboardData : undefined;
    }
    clipboardData: any;
  };
}

if (typeof global.DataTransfer === 'undefined') {
  global.DataTransfer = class DataTransfer {
    data: Record<string, string> = {};
    setData(format: string, data: string) { this.data[format] = data; }
    getData(format: string) { return this.data[format] || ''; }
    clearData() { this.data = {}; }
    dropEffect = '';
    effectAllowed = '';
    files = [];
    items = [];
    types = [];
  };
} 