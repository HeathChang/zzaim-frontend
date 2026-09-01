# 테스트 하네스

기획서 §9.4 의 7층 전략을 여기서 구현한다. **다른 영역의 «검증» 항목이 전부 이것을 전제한다.**

| 층 | 대상 | 도구 | 지금 상태 |
| --- | --- | --- | --- |
| 단위 | 배치 함수 (측정값을 픽스처로 주입) | Vitest | zz-2 가 채운다 |
| 단위 | 경계 휴리스틱 (코퍼스) | Vitest | zz-3 가 채운다 |
| 단위 | 번호·배점 추출, 상호참조 감지 | Vitest | zz-3 |
| 단위 | 파일 포맷 라운드트립 + 스키마 마이그레이션 | Vitest | zz-1 |
| 통합 | 붙여넣기 → 문항 N개 생성 | Vitest + jsdom | zz-3 |
| E2E | 30문항 조판 → PDF → 페이지 수·문항 위치 | Playwright | zz-2 이후 |
| 회귀 | 조판 스냅샷 (PDF → 이미지 → 픽셀 비교) | Playwright | zz-2 이후 |
| **수동** | **종이 실측 — 자로 잰다** | 사람 | **마일스톤마다** |

## zz-0 이 지금 재는 것

| 파일 | 무엇을 |
| --- | --- |
| `contrast.test.ts` | 토큰 조합의 명도 대비. **accent 가 본문에 못 쓰이는 이유를 계산으로 남긴다** |
| `tokens.test.ts` | 토큰 실값이 디자인 시스템과 같은가. 값을 두 곳에 두면 갈라진다 |
| `no-cdn.test.ts` | 외부 요청 0건. 프로토타입의 CDN·`@page margin:0.5cm` 이 딸려오지 않았는가 |
| `browserTier.test.ts` | 등급 판정 (OD-01 이후 축은 권한 하나) |
| `shortcuts.test.ts` | 화면별 > 전역, 단 `Esc`·저장은 예외. 입력 중 한 글자 키를 삼키지 않는가 |
| `undo.test.ts` | 되돌리기 스택과 **경계에서 비우기** |
| `fontCoverage.test.ts` | 서브셋 밖 글자 감지와 전체본 1회 로드 |
| `routes.test.ts` | SS§14 전이표. 미출시 화면으로 보내지 않는가 |
| `Dialog.test.tsx` | 포커스 트랩·복귀. 파괴적 선택지를 기본 포커스로 두지 않는가 |

## 자동으로 못 재는 것

- **종이 실측 ±1mm** (G0). Playwright 의 PDF 는 headless 경로라 사용자의 인쇄 대화상자와
  완전히 같지 않다. 자동 회귀는 **변화 감지**용으로만 믿고, 정합성은 종이로 확인한다 (PP§6.4)
- **폰트 서브셋 용량**. `npm run fonts:subset` 이 숫자를 출력한다 — 판단은 사람이 한다
- **HWPX 가 한글에서 열리는가** (zz-9). 사람이 한글로 열어봐야 한다

## 실행

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint + 관례 검사(문구 사전·금칙어·accent 대비)
npm test            # vitest
npm run test:e2e    # playwright (빌드 후 preview 를 띄운다)
npm run build       # typecheck + vite build
```
