import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['useMetadataContext'] },
      ],
      'no-useless-catch': 'error',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Jest/Vitest モックファイル用の設定
  {
    files: ['**/__mocks__/**/*.js', '**/*.mock.js', '**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        jest: 'readonly',
        vi: 'readonly',
        vitest: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off', // モックファイルでは undefined チェックを緩和
    },
  },
])
