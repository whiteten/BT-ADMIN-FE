const nx = require('@nx/eslint-plugin');
const tseslint = require('typescript-eslint');
const js = require('@eslint/js');

module.exports = [
  // ESLint recommended rules
  js.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Base configurations
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],

  // Global ignores
  {
    ignores: ['**/dist', '**/node_modules', 'e2e/**', '**/webpack*.ts', '**/module-federation.config.ts'],
  },

  // Nx module boundaries for all files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
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
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Ensure essential rules are enabled
      'no-const-assign': 'error',
      'no-duplicate-imports': 'error',

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

  // React configuration for TSX files
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
      'react-refresh': require('eslint-plugin-react-refresh'),
      'react-compiler': require('eslint-plugin-react-compiler'),
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
      import: require('eslint-plugin-import'),
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
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      'prettier/prettier': 'warn',
    },
  },

  // Prettier config to disable conflicting rules
  require('eslint-config-prettier'),
];
