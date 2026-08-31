module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'node_modules', 'public', 'coverage'],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    // ★ 이 프로젝트에서 가장 비싼 버그 둘이 전부 훅 규칙 위반이었다.
    // (1) zz-5: `useMemo` 의존성 누락 → 드롭 핸들러의 클로저가 굳어 드래그가 죽었다
    // (2) zz-6: 조기 반환 **뒤에** `useCallback` → 폰트 로드 순간 화면이 통째로 깨졌다
    // 둘 다 타입 검사도 테스트도 못 잡았다. 규칙으로 막는다
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
  },
  overrides: [
    { files: ['scripts/**/*.mjs', '*.config.ts'], rules: { 'no-console': 'off' } },
  ],
}
