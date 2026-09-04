/** 스키마 마이그레이션 — **단방향**이다 (PP§6.2).
 *
 *  «파일이 정본이므로 포맷 버전이 사용자 데이터를 인질로 잡는다.»
 *  그래서 규칙 셋을 지킨다.
 *  1. **올리기만** 한다. 내리지 않는다
 *  2. 한 단계씩 올린다. 건너뛰면 중간 단계의 변환이 빠진다
 *  3. **올리기 전 원본을 `<name>.v<이전버전>.bak` 으로 남긴다** —
 *     매 저장의 `.bak` 과 **이름공간을 분리**해야 한다. 안 그러면 마이그레이션
 *     백업이 **첫 자동 저장에서 사라진다** (zz-1 D8) */
import { SCHEMA_VERSION, type EtpDocument } from '@/storage/etp/format'

type Step = (doc: EtpDocument) => EtpDocument

/** `STEPS[n]` 은 «버전 n → n+1» 이다. 버전을 올릴 때마다 여기 하나를 더한다. */
const STEPS: Record<number, Step> = {
  // 예: 1: (doc) => ({ ...doc, questions: doc.questions.map(addNewField) }),
}

export function migrate(doc: EtpDocument): EtpDocument {
  let current = doc
  let version = doc.manifest.schemaVersion

  while (version < SCHEMA_VERSION) {
    const step = STEPS[version]
    if (!step) {
      // 단계가 비어 있으면 «그 버전에서 바뀐 것이 없다»는 뜻이다.
      // 조용히 넘어가되 버전은 올린다.
      version += 1
      continue
    }
    current = step(current)
    version += 1
  }

  return { ...current, manifest: { ...current.manifest, schemaVersion: SCHEMA_VERSION } }
}

/** 마이그레이션 백업 이름. 매 저장의 `.bak` 과 겹치지 않아야 한다. */
export function migrationBackupName(fileName: string, fromVersion: number): string {
  const base = fileName.replace(/\.etp$/i, '')
  return `${base}.v${fromVersion}.bak`
}

/** 매 저장의 백업 이름 (zz-1 D8) */
export function rollingBackupName(fileName: string): string {
  return `${fileName}.bak`
}
