# `.etp` 파일 포맷 규격

> **이 문서만 보고 제3자가 파일을 파싱할 수 있어야 한다.**
> 이식성은 이 제품의 신뢰 근거다 — 서비스가 사라져도 데이터가 남아야 하고,
> 그래야 «문항을 우리에게 맡긴다»는 요구가 정당해진다 (기획서 §3.2 · §5.3 · §10).

## 한눈에

`.etp` 는 **평범한 zip** 이다. 확장자만 바꿔서 어떤 압축 도구로도 풀 수 있다.

```
시험지.etp
├── manifest.json      메타 — 스키마 버전, 저장 시각
├── questions.json     문항 배열
├── passages.json      공통 지문 배열
├── papers.json        시험지 배열
└── blobs/             이미지 등. 파일 이름 = 내용 해시
    └── 1f3a9k.4c
```

JSON 은 **2칸 들여쓰기**로 넣는다. 압축이 대부분 회수하므로 사람이 읽을 수 있게 두는 값이 더 크다.

## manifest.json

```json
{
  "schemaVersion": 1,
  "updatedAt": 1756400000000,
  "app": "zzaim/0.1.0",
  "stats": []
}
```

| 필드 | 뜻 |
| --- | --- |
| `schemaVersion` | 정수. **읽는 쪽이 아는 버전보다 크면 열지 않는다** (모르는 필드를 조용히 버리고 저장하면 데이터가 사라진다) |
| `updatedAt` | 저장 시각(epoch ms). 파일과 캐시 중 어느 쪽이 새로운지 판정하는 근거 |
| `app` | 만든 앱 버전. 버그 추적용이며 동작에 쓰지 않는다 |
| `stats` | 가져오기 교정 통계. 없어도 된다 |

## questions.json

```json
[
  {
    "id": "q-1",
    "body": { "kind": "html", "html": "<p>다음 글의 주제로…</p>" },
    "points": 3,
    "numberHint": 12,
    "numberBaked": false,
    "hasCrossRef": false,
    "passageId": null,
    "tags": ["단원:문학", "난이도:상"],
    "note": "",
    "answer": "3",
    "createdAt": 1756300000000,
    "updatedAt": 1756400000000
  }
]
```

**설계의 핵심: 문항 본문은 불투명하다.** 발문·선택지를 구조로 나누지 않는다.
안에 든 것이 HTML 이든 이미지든 조판 엔진에게는 «높이를 가진 블록»일 뿐이다.

예외가 둘 — **번호와 배점**. 순서를 바꾸면 값이 바뀌므로 도구가 소유한다.

| 필드 | 뜻 |
| --- | --- |
| `body.kind` | `html` 또는 `image` |
| `body.blobId` | (image) `blobs/` 안의 파일 이름 |
| `points` | 기본 배점. 시험지별 재정의는 `papers.json` 이 갖는다. 모르면 `null` |
| `numberHint` | 원본 시험지에 적혀 있던 번호. **표시하지 않는다** — 참고용 |
| `numberBaked` | 번호가 이미지 픽셀에 박혀 있다 → 자동 채번에서 제외 |
| `hasCrossRef` | 본문이 «위 3번과 관련하여»처럼 다른 문항을 가리킨다 → 재배치 시 경고 |
| `passageId` | 종속된 지문. 없으면 독립 문항 |
| `tags` | `그룹:값` 문자열. 구조화하지 않는다 |

## passages.json

```json
[
  {
    "id": "p-1",
    "body": { "kind": "html", "html": "<p>글은 사람의 생각을…</p>" },
    "instruction": "다음 글을 읽고 물음에 답하시오.",
    "tags": [],
    "createdAt": 0,
    "updatedAt": 0
  }
]
```

지시문의 범위 표기(`[1~3]`)는 **저장하지 않는다.** 배치 순서에서 매번 다시 만든다.

## papers.json

```json
[
  {
    "id": "paper-1",
    "title": "2학기 중간고사",
    "header": {
      "school": "○○고등학교", "grade": "1학년", "subject": "국어",
      "examName": "2학기 중간고사", "duration": "50", "teacher": "",
      "showTotalPoints": true
    },
    "layout": {
      "pageSize": "A4", "orientation": "portrait", "columns": 2,
      "duplex": false,
      "margin": { "top": 20, "bottom": 20, "inner": 20, "outer": 15 },
      "gutter": 8, "columnRule": false, "fontScale": 100, "startNumber": 1
    },
    "items": [
      { "kind": "question", "questionId": "q-1", "overridePoints": 4 },
      { "kind": "passageGroup", "passageId": "p-1",
        "children": [{ "questionId": "q-2" }], "splitPolicy": "together" },
      { "kind": "spacer", "heightMm": 30, "ruled": true },
      { "kind": "divider" },
      { "kind": "notice", "html": "<p>※ 계산기 사용 금지</p>" }
    ],
    "createdAt": 0, "updatedAt": 0
  }
]
```

길이 단위는 전부 **mm** 다. `fontScale` 은 **퍼센트**(85~115).

`items` 의 다섯 종류가 조판 엔진에게는 전부 같은 «블록»이다 — 그래서 서술형
답안 공간(`spacer`)이 문항과 똑같이 흐른다.

## blobs/

파일 이름이 **내용 해시**다. 같은 이미지는 한 번만 담기고, 저장할 때 추가만 하면 된다.
해시 알고리즘은 규격의 일부가 아니다 — **읽는 쪽은 이름을 그대로 쓰면 된다.**

## 읽는 쪽이 지켜야 할 것

1. **`schemaVersion` 이 자기가 아는 값보다 크면 열지 말 것.** 억지로 열어 저장하면
   모르는 필드가 사라진다
2. **모르는 필드는 버리되, 망가진 항목만 건너뛸 것.** 파일 하나가 통째로 안 열리는
   것보다 문항 하나를 잃는 편이 낫다
3. **`updatedAt` 을 신뢰할 것.** 어느 쪽이 새로운지의 유일한 근거다

## 쓰는 쪽이 지켜야 할 것

**절대 원본을 직접 덮어쓰지 말 것.** 임시 파일에 쓰고, 원본을 `.bak` 으로 민 뒤,
임시를 원본 이름으로 바꾼다. 쓰는 도중 죽어도 **원본이나 백업 중 하나는 온전하다.**

백업 이름은 둘로 나눈다.

| 이름 | 언제 |
| --- | --- |
| `<이름>.etp.bak` | 저장할 때마다. 계속 덮어쓴다 |
| `<이름>.v<N>.bak` | 스키마를 올릴 때. **지우지 않는다** |

섞으면 마이그레이션 백업이 **첫 자동 저장에서 사라진다.**
