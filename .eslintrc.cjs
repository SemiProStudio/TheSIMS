module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react', 'react-hooks', 'react-refresh'],
  settings: {
    react: { version: '18.2' },
  },
  rules: {
    // React Refresh — warn on non-component exports from JSX files
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    // React — relax rules that create noise in this codebase
    'react/prop-types': 'off',            // No PropTypes; TypeScript migration planned
    'react/display-name': 'off',          // Lazy components trigger this
    'react/no-unescaped-entities': 'warn', // Common in JSX strings

    // Hooks — these catch real bugs
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Core JS — catch real bugs, not style preferences
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
    }],
    'no-undef': 'error',
    'no-constant-condition': 'warn',
    'no-debugger': 'error',
    'no-duplicate-case': 'error',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-extra-boolean-cast': 'warn',
    'no-irregular-whitespace': 'warn',
    'no-unreachable': 'error',

    // Permissive — don't fight the existing code style
    'no-prototype-builtins': 'off',
    'no-case-declarations': 'off',
    'no-fallthrough': 'warn',
    'no-async-promise-executor': 'warn',
  },
  // Don't lint generated / vendored files
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'public/sw.js',        // Service worker runs in different context
    'supabase/functions/',  // Deno edge functions
    'e2e/',                // Playwright tests use different env
    '*.config.js',
    '*.config.cjs',
  ],
  overrides: [
    {
      // Test files use vitest globals (globals: true in vitest.config.js)
      files: ['test/**/*.{js,jsx}'],
      env: { jest: true },  // close enough — covers describe, it, expect, beforeEach, etc.
      globals: {
        vi: 'readonly',     // vitest's mock utility (not in jest env)
      },
    },
  ],
};
