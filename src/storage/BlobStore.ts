/** Blob 저장을 **인터페이스 뒤에 둔다** (PP§9.2).
 *
 *  이미지 문항이 수백 장 쌓이면 IndexedDB 대신 OPFS 로 갈 수 있다(v1).
 *  그때 갈아 끼울 자리를 지금 만들어 둔다 — 나중에 만들려면 호출부를 전부 고쳐야 한다. */

export interface BlobStore {
  put(hash: string, bytes: Uint8Array): Promise<void>
  get(hash: string): Promise<Uint8Array | null>
  has(hash: string): Promise<boolean>
  delete(hash: string): Promise<void>
  /** 파일 저장 시 전부 담아야 한다 */
  entries(): Promise<Map<string, Uint8Array>>
  clear(): Promise<void>
}

