// 代码风格检查（Google JS Style Guide 近似配置，dev-only，不进小游戏主包）
// one-var / max-len 为 warn：本项目刻意采用紧凑单行风格
const js = require('@eslint/js');
const stylistic = require('@stylistic/eslint-plugin');

const base = {
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: { console: 'readonly', setTimeout: 'readonly' },
  },
  plugins: { '@stylistic': stylistic },
  rules: {
    ...js.configs.recommended.rules,
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'curly': ['error', 'multi-line'],
    'camelcase': 'error',
    'one-var': 'warn',
    // 回调未用参数与吞错 catch 绑定是本项目的刻意惯用法（平台层非致命失败静默降级）
    'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    '@stylistic/indent': ['error', 2],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    '@stylistic/semi': ['error', 'always'],
    '@stylistic/max-len': ['warn', { code: 100 }],
    '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
  },
};

module.exports = [
  {
    ...base,
    files: ['minigame-jiandao/src/**/*.js', 'minigame-jiandao/game.js'],
    languageOptions: {
      ...base.languageOptions,
      globals: { ...base.languageOptions.globals, tt: 'readonly', requestAnimationFrame: 'readonly' },
    },
  },
  { ...base, files: ['minigame-jiandao/tests/**/*.js'] },
  {
    ...base,
    files: ['tools/**/*.js'],
    languageOptions: {
      ...base.languageOptions,
      globals: {
        ...base.languageOptions.globals,
        __dirname: 'readonly', Buffer: 'readonly', process: 'readonly',
      },
    },
  },
  {
    ...base,
    files: ['minigame-jiandao/dev/**/*.js'],
    languageOptions: {
      ...base.languageOptions,
      globals: {
        ...base.languageOptions.globals,
        window: 'readonly', document: 'readonly', XMLHttpRequest: 'readonly',
        MouseEvent: 'readonly', KeyboardEvent: 'readonly',
      },
    },
  },
];
