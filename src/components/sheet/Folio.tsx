/** 쪽 번호와 마무리 문구 — 시트 하단에 절대 배치한다 (HO§쪽번호·마무리).
 *  위치를 아래 여백(`mb`)의 비율로 잡는 것이 핵심이다. 고정 px 로 두면
 *  여백을 바꿨을 때 본문과 겹친다. */
import { MM } from '@/layout/constants'

export function Folio({ index, total, fs, mb }: { index: number; total: number; fs: number; mb: number }) {
  return (
    <div className="zz-folio" style={{ bottom: mb * 0.4 * MM, fontSize: fs * 0.82 }}>
      {index} / {total}
    </div>
  )
}

export function Closing({ text, fs, mb }: { text: string; fs: number; mb: number }) {
  return (
    <div className="zz-closing" style={{ bottom: mb * 0.95 * MM, fontSize: fs * 0.9 }}>
      {text}
    </div>
  )
}
