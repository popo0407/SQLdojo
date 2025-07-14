import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query' // インポート
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'; // BootstrapのCSSをインポート
import './styles/global.css'; // グローバルなスタイルシート

// QueryClientのインスタンスを作成
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* アプリケーション全体をQueryClientProviderでラップ */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
