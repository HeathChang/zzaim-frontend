/** 지문 분할 정책 — MVP 는 `together` 만. **정직하게 닫은 범위**다 (zz-2 D4 · UD-39). */
import { describe, expect, it } from 'vitest'
import { resolveSplitPolicy } from '@/layout/splitPolicy'

describe('분할 정책', () => {
  it('언제나 `together` 로 동작한다 — 다른 정책은 구현하지 않았다', () => {
    expect(resolveSplitPolicy('together').effective).toBe('together')
    expect(resolveSplitPolicy('passage-first').effective).toBe('together')
    expect(resolveSplitPolicy(undefined).effective).toBe('together')
  })

  it('★ `passage-first` 를 받으면 **강등했다고 알린다**', () => {
    // 조용히 무시하면 «설정했는데 왜 안 되지» 가 된다
    expect(resolveSplitPolicy('passage-first').downgraded).toBe(true)
  })

  it('요청한 것과 같으면 강등이 아니다', () => {
    expect(resolveSplitPolicy('together').downgraded).toBe(false)
    expect(resolveSplitPolicy(undefined).downgraded).toBe(false)
  })
})
