/// <reference types="vite/client" />

/** File System Access API — TypeScript 기본 lib 에 아직 없다.
 *  실제 사용은 zz-1(저장소)이 하고, 여기서는 **존재 여부만** 본다. */
declare global {
  interface Window {
    showDirectoryPicker?: (options?: unknown) => Promise<unknown>
  }
}
export {}
