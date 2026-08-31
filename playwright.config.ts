import { defineConfig } from '@playwright/test'

// PP§9.4 «E2E: 30문항 조판 → PDF → 페이지 수·문항 위치 검증».
// zz-0 은 하네스만 세운다 — 실제 시나리오는 zz-2 이후가 채운다.
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    port: 4173,
    // ⚠ **재사용하지 않는다.** 서버를 재사용하면 이전 빌드 산출물이 그대로 떠 있어
    // 방금 고친 CSS·JS 가 아닌 것을 검사한다 — 실제로 인쇄 CSS 수정이 반영되지
    // 않은 채 «통과»가 나왔다. 인쇄는 자동 검증이 유일한 방어선이라 거짓 초록이
    // 가장 비싸다 (zz-6 불변4)
    reuseExistingServer: false,
  },
})
