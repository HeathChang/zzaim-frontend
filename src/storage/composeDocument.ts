/** 저장할 문서를 **저장 시점에 조립한다.**
 *
 *  ★ 이 파일이 생긴 이유. 예전에는 `useDocumentSession` 이 들고 있던 `doc`
 *  상태를 그대로 저장했다. 그런데 그 값은 «파일을 열 때»와 «통계를 쌓을 때»만
 *  바뀌고, 교사가 붙여넣어 만든 문항·지문·시험지는 문서 스토어에 있었다.
 *  결과: **저장 버튼을 눌러도 빈 문서가 저장됐다.**
 *
 *  정본은 스토어다. 여기서 한 방향으로만 합친다 — 스토어가 내용을, `base` 가
 *  파일 메타(manifest·blobs)를 준다. */
import type { EtpDocument } from '@/storage/etp/format'
import type { Paper, Passage, Question } from '@/domain/types'

export interface DocumentContent {
  questions: Record<string, Question>
  passages: Record<string, Passage>
  papers: Record<string, Paper>
}

export function composeDocument(
  base: EtpDocument,
  content: DocumentContent,
  now: number,
): EtpDocument {
  return {
    ...base,
    // 저장한 시각을 남긴다 — 다른 탭·캐시와의 «누가 최신인가» 판정이 이 값을 본다
    manifest: { ...base.manifest, updatedAt: now },
    questions: Object.values(content.questions),
    passages: Object.values(content.passages),
    papers: Object.values(content.papers),
  }
}
