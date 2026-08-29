> [!IMPORTANT]
> **이 저장소는 더 이상 사용하지 않습니다.**
> 작업 초기에 이곳으로 잘못 푸시되었고, 실제 코드는
> **[HeathChang/nullong2_viewer](https://github.com/HeathChang/nullong2_viewer)** 에 있습니다.
> 아래 내용은 그 시점의 사본이며 갱신되지 않습니다.
>
> **정리하려면** — Settings → Branches 에서 기본 브랜치를 `main` 으로 바꾼 뒤,
> Branches 목록에서 `claude/markdown-json-viewer-umyky5` 와 `tmp-delete-probe` 를 지우면 됩니다.
> (기본 브랜치는 GitHub 이 삭제를 막기 때문에 먼저 바꿔야 합니다.)

---

# Nullong Viewer

로컬에 있는 **마크다운 · JSON · YAML · 텍스트**를 폴더째 열어 읽는 정적 웹 뷰어입니다.
업로드도 서버도 없습니다. 브라우저가 디스크에서 직접 읽습니다.

```
npm install
npm run dev      # http://localhost:5173
```

## 무엇을 하나

- **폴더 하나를 열면 그 안을 전부 탐색** — 트리, 이름·경로 필터, `⌘K` 빠른 찾기
- **폴더 안을 숨기지 않음** — 형식 칩(`MD 12` `JSON 5` …)으로 무엇이 들었는지 한눈에 보고,
  켜고 끄면서 고릅니다. 아직 못 여는 형식도 목록에는 남고 크기·수정 시각을 보여줍니다
- **마크다운** — GFM 표·체크리스트, 코드 하이라이트, 문서 간 상대경로 링크 이동
- **JSON · JSONC · JSONL · YAML** — 접이식 트리, 키/값 검색, 경로(`$.a.b[0]`) 복사, 원문 보기
- **텍스트 · 로그** — 줄 번호, 긴 파일 점진 로드
- **목차** — 제목 목록과 스크롤 위치 연동, 문서마다 읽던 자리 기억
- **문서에서 찾기** — `⌘F`. JSON·YAML 은 접힌 노드까지 뒤지는 자체 검색으로 보냅니다
- **변경 감지** — 보고 있는 파일이 디스크에서 바뀌면 알려줍니다(자동 갱신은 하지 않습니다)
- **읽기 설정** — 테마 · 글꼴 · 글자 크기 · 본문 너비 · 줄 간격 (브라우저에 저장)
- **다국어** — UI 한국어·영어, 문서는 UTF-8 외에 CP949·Shift_JIS·GB18030·Big5 자동 추론

## 브라우저

| | 폴더 열기 | 재방문 복원 |
| --- | --- | --- |
| Chrome · Edge · Arc · Opera | File System Access API | 지원 |
| Firefox · Safari | 드래그앤드롭 · 폴더 선택 (스냅샷) | 미지원 |

> **`index.html`을 더블클릭해서 열면 동작하지 않습니다.**
> File System Access API 는 보안 컨텍스트(HTTPS 또는 `localhost`)를 요구합니다.
> `npm run dev` 로 띄우거나 정적 호스팅에 배포해서 쓰세요.
