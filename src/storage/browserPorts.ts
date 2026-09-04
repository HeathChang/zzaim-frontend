/** 브라우저 File System Access 를 `SessionPorts` 모양으로 감싼다.
 *
 *  세션 로직이 브라우저 API 를 직접 모르게 하는 자리다. 여기만 실제 API 를 알고,
 *  나머지는 전부 이 인터페이스로 이야기한다 — 그래서 세션을 테스트할 수 있다.
 *
 *  TypeScript 기본 lib 에 FSA 타입이 아직 없어 필요한 만큼만 선언한다. */
import type { Directory, FileEntry, WritableFile } from '@/storage/fileHandle'

interface FsFileHandle {
  kind: 'file'
  name: string
  getFile(): Promise<Blob>
  createWritable(options?: { keepExistingData?: boolean }): Promise<{
    write(data: BufferSource): Promise<void>
    close(): Promise<void>
    abort?(): Promise<void>
  }>
  move?(name: string): Promise<void>
}

export interface FsDirectoryHandle {
  kind: 'directory'
  name: string
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
  queryPermission?(d: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission?(d: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

function wrapFile(handle: FsFileHandle): FileEntry {
  return {
    name: handle.name,
    async createWritable(): Promise<WritableFile> {
      // `keepExistingData: false` 가 기본이고, 그래서 **여는 순간 절단된다.**
      // 임시 파일에만 쓰므로 안전하다 — 원본에는 절대 이 함수를 쓰지 않는다
      const w = await handle.createWritable({ keepExistingData: false })
      return {
        // `Uint8Array<ArrayBufferLike>` 를 그대로 넘기면 TS 가 걸고 넘어진다.
        // 복사본을 만들어 버퍼 소유권을 명확히 한다
        write: (data) => w.write(new Uint8Array(data)),
        close: () => w.close(),
        ...(w.abort ? { abort: () => w.abort?.() ?? Promise.resolve() } : {}),
      }
    },
    async read() {
      const blob = await handle.getFile()
      return new Uint8Array(await blob.arrayBuffer())
    },
    async remove() {
      throw new Error('use Directory.removeFile')
    },
    async rename(next) {
      if (!handle.move) {
        // `move()` 는 Chrome 계열 전용인데 **대상이 Chrome·Edge 뿐이라**
        // 여기 도달하면 환경 가정이 깨진 것이다. 조용히 우회하지 않는다 (OD-01)
        throw new Error('FileSystemFileHandle.move is unavailable')
      }
      await handle.move(next)
    },
  }
}

export function wrapDirectory(handle: FsDirectoryHandle): Directory {
  return {
    async getFile(name, options) {
      return wrapFile(await handle.getFileHandle(name, options))
    },
    async removeFile(name) {
      await handle.removeEntry(name)
    },
    async has(name) {
      try {
        await handle.getFileHandle(name)
        return true
      } catch {
        return false
      }
    },
  }
}

export interface PickedFile {
  name: string
  bytes: Uint8Array
}

/** 파일 선택기. **사용자 행동에 이어서만** 부른다 (SS§2.3) */
export async function pickFile(win: Window = window): Promise<PickedFile | null> {
  const picker = (win as unknown as Record<string, unknown>)['showOpenFilePicker']
  if (typeof picker !== 'function') return null
  const handles = (await (picker as (o: unknown) => Promise<FsFileHandle[]>)({
    types: [{ description: 'zzaim', accept: { 'application/zip': ['.etp'] } }],
    multiple: false,
  })) as FsFileHandle[]
  const handle = handles[0]
  if (!handle) return null
  const blob = await handle.getFile()
  return { name: handle.name, bytes: new Uint8Array(await blob.arrayBuffer()) }
}

/** 디렉토리 권한 요청. **거부하면 제한 등급으로 강등**된다 (zz-1 D8) */
export async function pickDirectory(win: Window = window): Promise<FsDirectoryHandle | null> {
  const picker = (win as unknown as Record<string, unknown>)['showDirectoryPicker']
  if (typeof picker !== 'function') return null
  try {
    return (await (picker as (o: unknown) => Promise<FsDirectoryHandle>)({
      mode: 'readwrite',
    })) as FsDirectoryHandle
  } catch {
    // 사용자가 취소했거나 거부했다. 던지지 않는다 — 다운로드 경로가 있다
    return null
  }
}
