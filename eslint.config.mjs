// 원본 BT-ADMIN-FE eslint.config.cjs 이관 (flat config).
//
// 원본과의 차이 — Nx 전용 레이어만 제거, 실질 규칙은 동일:
//  - @nx/eslint-plugin(flat/base·typescript·javascript·react) 제거 — Nx 미사용.
//    flat/react의 CRA 유래 범용 규칙은 js.configs.recommended·tseslint.recommended와
//    중복 범위가 크고, Nx 플러그인 없이 재현 불가라 제외.
//  - @nx/enforce-module-boundaries 제거 — 원본 설정이 sourceTag '*' → '*' 허용(실효 없음).
//  - ignores의 webpack*.ts → rsbuild 계열 설정·tools·scripts로 대체
//    (tsconfig 프로젝트 밖 파일이라 projectService 파싱 불가 — 원본과 동일한 사유).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // ESLint recommended rules
  js.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Global ignores
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/rsbuild.config.ts',
      '**/module-federation.config.ts',
      'tools/**',
      'scripts/**',
      'turbo/**',
      'vitest.config.ts',
      // 루트 공용 선언 파일 — 앱 tsconfig가 include하지만 projectService의
      // closest-tsconfig 탐색 대상이 아니라 파싱 fatal → lint 제외(선언 파일 lint 실익 없음)
      'types/**',
    ],
  },

  // CommonJS 설정 파일 (proxy.config.js·commitlint.config.js 등) —
  // 원본에서는 @nx/flat/javascript가 node globals를 제공했음(동등 복원)
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // 런타임 주입 설정 (apps/host/public/config.js) — 브라우저 전역 사용
  {
    files: ['**/public/config.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Ensure essential rules are enabled
      'no-const-assign': 'error',
      'no-duplicate-imports': 'error',

      // 원본 @nx/flat/typescript가 주던 실효 옵션 복원 (삼항·단락·태그드템플릿 표현식 허용) —
      // tseslint.recommended 기본값은 옵션 없음이라 insight의 삼항 토글 패턴이 오탐된다
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTaggedTemplates: true, allowTernary: true }],

      // Custom overrides for project-specific preferences
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // Disable base ESLint rules that conflict with TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },

  // Query key 앱 스코프 강제 — apps에서 query-key-factory 직접 import 금지.
  // host 셸이 QueryClient를 공유하므로 스코프 없는 키는 앱 간 캐시 오염을 일으킨다.
  // 각 앱 src/app/shared/queryKeys.ts의 createAppQueryKeys(앱 폴더명 자동 접두)를 사용할 것.
  // libs(shared-api)는 자체 접두 규약('sharedApi:')을 쓰므로 제외. 타입 전용 import는 허용.
  {
    files: ['apps/**/*.ts', 'apps/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@lukemorales/query-key-factory',
              importNames: ['createQueryKeys', 'createQueryKeyStore', 'createMutationKeys', 'mergeQueryKeys'],
              message: '앱에서는 직접 사용 금지 — 해당 앱 src/app/shared/queryKeys.ts의 createAppQueryKeys를 사용하세요(앱 간 캐시 키 충돌 방지).',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },

  // React configuration for TSX files
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'off', // React 17+ doesn't need React in scope
      'react/react-in-jsx-scope': 'off', // React 17+ doesn't need React in scope
      'react/jsx-no-target-blank': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'warn',
      'react/jsx-key': 'warn',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Refresh (for development)
      'react-refresh/only-export-components': 'off',

      // React Compiler rules
      'react-compiler/react-compiler': 'warn',
    },
  },

  // Import and general rules for all files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Disallow alert/confirm/prompt — use useModal + toast instead
      'no-alert': 'warn',

      // Import rules
      'import/extensions': 'off',
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal'],
          pathGroups: [
            {
              pattern: 'react*',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@tanstack/*',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/*',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: [],
          alphabetize: {
            order: 'asc',
          },
        },
      ],
      'sort-imports': [
        'warn',
        {
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
        },
      ],
    },
  },

  // Prettier configuration (should be last)
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
    },
  },

  // Prettier config to disable conflicting rules
  prettierConfig,
];
