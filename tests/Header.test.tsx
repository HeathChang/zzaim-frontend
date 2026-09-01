/** SS§1.4 — 파일이 정본이므로 저장 상태는 장식이 아니다. */
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '@/app/Header'
import { useUiStore } from '@/app/store/ui'
import { strings } from '@/app/strings'

describe('헤더 저장 상태', () => {
  beforeEach(() => {
    useUiStore.setState({ tier: 'full', saveStatus: 'saved', publicPc: false, fileName: null })
  })

  it('완전 등급에서 저장됨은 경고가 아니다', () => {
    render(<Header />)
    expect(screen.getByText(strings.save.savedJustNow)).toBeTruthy()
    expect(screen.queryByText(/⚠/)).toBeNull()
  })

  it('되쓰기가 안 되는 등급이면 저장 상태를 상시 강조한다 — «저장됨»이 거짓말이 되면 안 된다', () => {
    useUiStore.setState({ tier: 'limited' })
    render(<Header />)
    expect(screen.getByText(/⚠/)).toBeTruthy()
  })

  it('비대상 브라우저에서도 강조한다', () => {
    useUiStore.setState({ tier: 'unsupported' })
    render(<Header />)
    expect(screen.getByText(/⚠/)).toBeTruthy()
  })

  it('공용 PC 배지는 켜져 있으면 늘 보인다 — 잊으면 안 되는 상태다', () => {
    useUiStore.setState({ publicPc: true })
    render(<Header />)
    expect(screen.getByText(new RegExp(strings.common.publicPc))).toBeTruthy()
  })
})
