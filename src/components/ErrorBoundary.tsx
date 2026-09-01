/** 오류 경계 — SS§5.4 «목록 전체를 무너뜨리지 않는다».
 *
 *  문항 하나의 본문이 렌더에 실패했다고 시험지 전체가 흰 화면이 되면,
 *  교사는 **작업 중이던 것을 잃었다고 믿는다.** 실제로는 파일이 멀쩡한데도. */
import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** 무너진 자리에 대신 그릴 것. 무엇이 실패했는지 사용자 말로 적는다 (SS§1.7) */
  fallback: ReactNode
  onError?(error: Error, info: ErrorInfo): void
}

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
