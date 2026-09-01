/** zz-0 D11 — 문구 사전. `components/` 에 자유 문자열을 두지 않는다.
 *
 *  이유는 SS부록B 다: 같은 개념을 화면마다 다르게 부르면 사용자가 다시 배운다.
 *  금칙어(아이템·블록·문제은행·시크릿 모드…)는 lint 로 잡는다. */
export const strings = {
  app: {
    name: 'zzaim',
    tagline: '작년 시험지를 붙여넣으면 새 시험지가 됩니다',
  },

  /** SS§1.4 — 파일이 정본이므로 저장 상태는 장식이 아니다 */
  save: {
    saved: '저장됨',
    savedJustNow: '저장됨 · 방금',
    saving: '저장 중…',
    unsaved: '저장 안 됨',
    readonly: '읽기 전용',
    disconnected: '연결 끊김',
  },

  /** SS§13.3 — 등급별 안내. 브라우저 탓과 권한 탓의 문구가 다르다 */
  tier: {
    limitedTitle: '폴더 접근을 허용하지 않으셨습니다.',
    limitedBody:
      '지금은 저장할 때마다 파일을 내려받는 방식으로 동작합니다. 한글처럼 같은 파일에 이어서 저장하려면 폴더 접근이 필요합니다.',
    limitedRetry: '폴더 다시 선택',
    limitedDismiss: '이대로 쓰기',
    unsupportedTitle: '이 브라우저는 아직 지원하지 않습니다.',
    unsupportedBody:
      '지금도 쓸 수는 있지만 인쇄 결과가 화면과 다를 수 있고, 파일은 내려받는 방식으로만 저장됩니다. 시험지를 실제로 출력하실 거라면 크롬이나 엣지에서 열어 주세요.',
    unsupportedDismiss: '알겠습니다',
    unsupportedCopyLink: '크롬에서 열기 — 링크 복사',
    blockedTitle: '이 브라우저에서는 zzaim 을 쓸 수 없습니다.',
    blockedBody: '크롬 또는 엣지로 열어 주세요.',
  },

  /** SS§1.7 — 무엇이·왜·다음에 무엇을. 셋을 전부 쓴다 */
  dialog: {
    confirm: '확인',
    cancel: '취소',
    close: '닫기',
    headerEdit: '머리말 고치기',
    headerSchool: '학교',
    headerSubject: '과목',
    headerExam: '시험명',
    headerGrade: '학년',
    headerDuration: '시간(분)',
    headerShowPoints: '총점 표시',
  },

  toast: { undo: '되돌리기' },

  help: {
    title: '단축키',
    globalSection: '어디서나',
    screenSection: '이 화면에서',
    newBadge: 'NEW',
  },

  shortcuts: {
    save: '파일에 저장',
    escape: '패널·다이얼로그 닫기',
    undo: '되돌리기',
  },

  a11y: {
    /** 조작 결과를 읽어 준다 (SS§1.6) */
    dialogOpened: '대화 상자가 열렸습니다',
    dialogClosed: '대화 상자를 닫았습니다',
  },

  paper: {
    points: (n: number) => `[${n}점]`,
    fontLoading: '글꼴을 불러오는 중입니다 — 조판이 어긋나지 않도록 지면을 그리지 않습니다.',
    fontMissing: '지면 글꼴을 불러오지 못했습니다. 이 상태로 인쇄하면 화면과 다르게 나옵니다.',
    zoom100: '100%',
    zoomFit: '폭 맞춤',
    zoomSpread: '두 쪽',
    /** 자동으로 축소됐다는 사실을 반드시 알린다 — 축소된 지면을 실제 크기라고
     *  믿게 하는 것이 이 화면이 저지를 수 있는 가장 나쁜 실수다 (SS§6.3) */
    zoomAuto: '축소됨',
    closing: '— 수고하셨습니다 —',
    headerLabels: {
      minutes: '분',
      questions: '문항',
      points: '점',
      klass: '반',
      no: '번',
      name: '성명',
    },
  },

  /** 조판 엔진 확인용 표본. 실제 문항이 아니다 */
  demo: {
    school: '○○고등학교',
    grade: '1학년',
    subject: '국 어',
    examName: '2학기 중간고사',
    stem: (n: number, len: number) =>
      `다음 글의 주제로 가장 적절한 것은? ${'글의 흐름을 살펴 중심 내용을 파악해 보자. '.repeat(len)}`.trim() +
      ` (${n})`,
    choice: (i: number) => `${'①②③④⑤'[i]} 보기 ${i + 1} 번 선택지 내용`,
    instruction: '다음 글을 읽고 물음에 답하시오.',
    passage:
      '글은 사람의 생각을 담는 그릇이다. 같은 사실을 두고도 쓰는 이의 관점에 따라 전혀 다른 글이 된다. ' +
      '그러므로 글을 읽을 때에는 무엇을 말하는지와 함께 어떻게 말하는지를 살펴야 한다. ' +
      '특히 글쓴이가 어떤 근거를 들어 주장을 뒷받침하는지 눈여겨볼 필요가 있다.',
  },

  start: {
    pasteHere: '여기에 붙여넣으세요',
    pasteHint: '한글에서 시험지를 복사해 오면 됩니다',
    trySample: '예시로 해보기',
    recent: '최근 파일',
    reselect: '↻ 다시 선택',
    publicPcLabel: '이 컴퓨터는 공용입니다 — 나갈 때 흔적을 지웁니다',
    /** SS§2.6 — 표와 그림이 사라진다는 사실을 반드시 알린다 */
    plainTitle: '서식 없는 텍스트를 붙여넣었습니다.',
    plainBody: '문항 구분은 되지만 표와 그림은 사라집니다.',
    plainProceed: '그대로 진행',
    emptyClipboard: '복사한 내용이 없습니다. 한글에서 시험지를 선택하고 Ctrl+C 를 눌러 주세요.',
  },

  /** 신뢰도 근거 (SS§4.5). **숫자만 보여 주면 판단할 근거가 없다** */
  confidence: {
    noChoices: '선택지를 찾지 못했습니다',
    numberGap: '번호가 이어지지 않습니다',
    noPoints: '배점이 없습니다',
    tooShort: '너무 짧습니다',
    tooLong: '너무 깁니다',
    crossRef: '다른 문항을 언급합니다',
  },

  importing: {
    reading: '시험지를 읽는 중입니다',
    found: (n: number) => `문항 ${n}개를 찾았습니다`,
    /** SS§3.6 — 0개를 찾아도 빈손으로 돌려보내지 않는다 */
    noneTitle: '문항을 찾지 못했습니다.',
    noneBody: '붙여넣은 내용에 1. 또는 ① 같은 문항 번호가 없는 것 같습니다.',
    noneAsOne: '그래도 통째로 하나의 문항으로 담기',
    imageMissing: '그림 없음',
  },

  /** S-02 경계 확정 — **제품의 급소** */
  segments: {
    sourceTitle: '원본',
    resultTitle: (n: number) => `분리 결과 ${n}개`,
    noNumber: '#?',
    noPoints: '[?]',
    numberLabel: '원본 번호',
    pointsLabel: '배점',
    confirmed: '확인함',
    grouped: '└ 지문에 묶임',
    pointsFormat: (n: number) => `[${n}점]`,
    numberFormat: (n: number) => `#${n}`,
    confidenceLabel: (p: number) => `신뢰도 ${p}퍼센트`,
    needAttention: (n: number) => `⚠ 확인이 필요한 곳 ${n}`,
    nextSuspect: '다음 확인 지점',
    corrections: (n: number) => `손댄 곳 ${n}`,
    pointsTotal: (n: number) => `배점 ${n}점`,
    commit: (n: number) => `${n}개 담기 →`,
    wrapped: '처음으로 돌아왔습니다',
    noneLeft: '확인이 필요한 곳이 없습니다',
    /** SS§4.6 쪼개기 모드 */
    splitTitle: '어디서 쪼갤까요?',
    splitHere: '✂ 여기',
    /** SS§4.8 분리 붕괴 복구 — 한 번의 선택이 50번의 교정을 대신한다 */
    recoverTitle: '자동 분리가 잘 되지 않았습니다.',
    recoverBody: '이 시험지의 문항 번호 형식을 찾지 못했습니다. 문항이 어떻게 시작하는지 알려 주시면 다시 나눠 보겠습니다.',
    recoverRetry: '다시 나누기',
    recoverManual: '그냥 손으로 고치기',
    formatDot: '1. 2. 3.',
    formatParen: '1) 2) 3)',
    formatCircled: '① ② ③',
    formatWord: '문제 1',
    formatCustom: '직접 입력',
    /** SS§4.12 확정 요약 */
    summary: (count: number, edits: number) => `문항 ${count}개를 담았습니다. 자동으로 나눈 것 중 ${edits}곳을 고쳤습니다`,
    /** SS§10 D-06 */
    confirmTitle: (n: number) => `확인이 필요한 곳이 ${n}곳 남았습니다.`,
    confirmBody: '그대로 담아도 되지만, 경계가 틀린 문항이 있을 수 있습니다.',
    confirmGo: '확인하러 가기',
    confirmAnyway: '그대로 담기',
    /** SS§4.9 낭독 문구 */
    announceCursor: (n: number, percent: number) => `${n}번 카드. 신뢰도 ${percent}퍼센트`,
    announceMerged: (a: number, b: number, total: number) => `${a}번과 ${b}번을 합쳤습니다. 이제 ${total}개입니다`,
  },

  /** S-04 조판 피드백 — 엔진의 판단을 사용자가 볼 수 있어야 한다 (SS§6.5) */
  paperFeedback: {
    carried: '↳ 다음 단으로 넘어감',
    overflow: '이 문항은 한 단에 들어가지 않습니다',
    keepWith: '🔗 다음과 같은 단',
    crossRef: '다른 문항을 언급합니다',
    missingPassage: '지문이 시험지에 없습니다',
    /** zz-2 D4 — 요청한 분할 정책을 못 지켰다. 조용히 다르게 하지 않는다 */
    downgraded: '지문을 나누는 설정은 아직 동작하지 않아 통째로 배치했습니다',
    action: {
      overflow: '글자 크기 줄이기',
      missingPassage: '지문 담기',
    },
    pageFill: (percent: number) => `이 쪽의 ${percent}%가 비어 있습니다`,
  },

  /** S-04 시험지 편집 */
  paperEdit: {
    trayTitle: '담을 문항',
    search: '검색',
    added: '✓ 담김',
    insertSpacer: '여백',
    insertDivider: '구분선',
    insertNotice: '안내문',
    spacerHeight: '높이(mm)',
    ruled: '줄 긋기',
    editTitle: '문항 고치기',
    bodyLabel: '본문',
    /** 키보드로 옮긴 결과를 읽어 준다 (SS§6 · PP§10).
     *  ⚠ 번호가 없는 것(지문 묶음·여백)도 옮길 수 있으므로 번호를 선택적으로 받는다 */
    moved: (number: number | null, page: number, column: number, order: number) =>
      `${number === null ? '이 블록' : `${number}번 문항`}을 ${page}쪽 ${column}단 ${order}번째로 옮겼습니다`,
    pointsLabel: '배점',
    overrideLabel: '이 시험지에서만',
    tagsLabel: '태그',
    noteLabel: '메모',
    answerLabel: '정답',
    close: '닫기',
    headerEdit: '머리말 고치기',
    headerSchool: '학교',
    headerSubject: '과목',
    headerExam: '시험명',
    headerGrade: '학년',
    headerDuration: '시간(분)',
    headerShowPoints: '총점 표시',
    /** PD-07 — 본문 수정은 **보관함 원본**을 바꾼다 */
    sharedWarning: (n: number) => `이 문항을 쓰는 다른 시험지 ${n}개에도 반영됩니다`,
    /** SS§6.3 C — 숫자 → 경고 → 다음 동작 */
    itemCount: (n: number) => `${n}문항`,
    pointsStatus: (sum: number, target: number) => `${sum}/${target}점`,
    pageCount: (n: number) => `${n}쪽`,
    blankBack: '(뒷면 백지)',
    carriedCount: (n: number) => `넘긴 문항 ${n}곳`,
    print: '인쇄 →',
    emptyPaper: '왼쪽에서 문항을 끌어다 놓으세요',
    emptyTray: '먼저 문항을 담아야 합니다',
    /** SS§6.7 — 조작 결과를 읽어 준다 */
    announceMove: (n: number, page: number, column: number, order: number) =>
      `${n}번 문항을 ${page}쪽 ${column}단 ${order}번째로 옮겼습니다`,
  },

  shell: {
    togglePanel: (panel: string, open: boolean) => `${panel} ${open ? '접기' : '펼치기'}`,
  },

  /** S-06 인쇄 준비 (SS§8) */
  print: {
    title: '인쇄하기 전에',
    checklistTitle: (browser: string) =>
      browser === 'edge' ? '엣지 인쇄 창에서 확인할 것' : '크롬 인쇄 창에서 확인할 것',
    check: {
      margin: { chrome: '여백을 «없음»으로', edge: '여백을 «없음»으로' },
      background: { chrome: '«배경 그래픽»을 켜기', edge: '«배경 그래픽»을 켜기' },
      headerFooter: { chrome: '«머리글 및 바닥글»을 끄기', edge: '«머리글 및 바닥글»을 끄기' },
    },
    hintAlt: (browser: string) =>
      browser === 'edge' ? '엣지 인쇄 창의 여백 설정 위치' : '크롬 인쇄 창의 여백 설정 위치',
    skipNext: '다음부터 이 안내를 건너뛰기',
    open: '인쇄 창 열기',
    again: '인쇄 안내 다시 보기',
    /** 점검 결과 — 폰트만 차단이다 (zz-6 D6) */
    issue: {
      fonts: '글꼴을 아직 불러오지 못했습니다. 이대로 인쇄하면 화면과 다르게 나옵니다.',
      points: '배점 합계가 목표와 다릅니다.',
      orphan: '지문 없이 담긴 문항이 있습니다.',
      overflow: '한 단에 들어가지 않는 문항이 있습니다.',
    },
  },

  /** 레이아웃 설정 S-05 (zz-8) */
  settings: {
    title: '설정',
    open: '설정',
    close: '설정 닫기',
    groupPaper: '용지',
    groupColumn: '단',
    groupMargin: '여백',
    groupType: '글자',
    groupHeader: '머리말',
    groupFinish: '마무리',
    groupPoints: '배점 일괄',
    /** ⚠ 그룹 이름(«용지»)과 같으면 안 된다 — 스크린리더가 둘을 구분 못 한다 */
    pageSize: '용지 크기',
    orientation: '방향',
    portrait: '세로',
    landscape: '가로',
    duplex: '양면 인쇄',
    columns: '단 개수',
    gutter: '단 사이',
    columnRule: '단 사이 선',
    marginTop: '위',
    marginBottom: '아래',
    /** ★ 양면이면 «좌/우» 가 아니라 «안쪽/바깥쪽» 이다 — 뒤집히기 때문이다 */
    marginInner: (duplex: boolean) => (duplex ? '안쪽' : '왼쪽'),
    marginOuter: (duplex: boolean) => (duplex ? '바깥쪽' : '오른쪽'),
    fontScale: '글자 크기',
    startNumber: '시작 번호',
    targetPoints: '목표 총점',
    box: '지문 상자',
    boxBorder: '테두리',
    boxShade: '음영',
    folio: '쪽 번호',
    closing: '마무리 문구',
    carryMark: '지문 이어짐 표기',
    /** UD-39 — 항목은 두되 MVP 에서는 발화하지 않는다 */
    carryMarkNote: '지금은 지문이 나뉘지 않아 표시될 일이 없습니다.',
    showTotalPoints: '총점 표시',
    /** D2 — 더 못 올릴 때 */
    limited: '이 값보다 크게 하면 문항이 들어갈 자리가 없습니다.',
    readOnly: '다른 탭이 이 파일을 열고 있어 설정을 바꿀 수 없습니다.',
    /** D7 — 쪽수가 바뀌면 반드시 알린다 */
    pageChanged: (from: number, to: number) => `${from} → ${to}쪽`,
    announce: (label: string, value: string, pages: number) =>
      `${label} ${value}. ${pages}쪽입니다`,
    mm: (n: number) => `${n}밀리미터`,
    percent: (n: number) => `${n}퍼센트`,
    ruleEven: '균등',
    ruleByDifficulty: '난이도별',
    ruleToTarget: '목표에 맞춤',
    /** ★ PD-04 — 조용히 균등으로 돌아가지 않는다 */
    needDifficulty: (n: number) => `난이도가 없는 문항 ${n}개가 있습니다`,
    applyBulk: '적용',
    bulkDone: (total: number) => `배점을 다시 매겼습니다. 합계 ${total}점`,
  },

  /** HWPX 내보내기 (zz-9) */
  hwpx: {
    button: '한글 파일로 내보내기',
    working: '내보내는 중…',
    done: '내보냈습니다',
    /** ★ D4·UD-49 — **반드시 보여 준다.** 안 알리면 교사가 열어보고 «망가졌다»고 판단한다 */
    caveat: '한글에서는 줄바꿈이 조금 달라질 수 있습니다. 문항 순서와 쪽·단 경계는 그대로입니다.',
    failed: '내보내기에 실패했습니다. 인쇄는 그대로 됩니다.',
    empty: '담긴 문항이 없어 내보낼 것이 없습니다.',
    /** 시험지 이름이 없을 때의 파일 이름 */
    defaultName: (date: string) => `시험지-${date}.hwpx`,
  },

  file: {
    open: '파일 열기',
    save: '저장',
    newFile: '새로 만들기',
  },

  lock: {
    title: '화면을 잠갔습니다',
    idle: '자리를 비운 지 시간이 지났습니다.',
    manual: '직접 잠갔습니다.',
    unlock: '계속하기',
    saved: '작업은 저장되어 있습니다.',
    /** 모르고 자리를 뜨면 작업을 잃는다 — 해제할 때 반드시 알린다 (SS§9.4) */
    saveFailed: '저장하지 못한 변경이 있습니다. 계속하기를 눌러 확인해 주세요.',
  },

  /** SS§10 다이얼로그 — 무엇이·왜·다음에 무엇을, 셋을 전부 쓴다 (SS§1.7) */
  dialogs: {
    unsavedTitle: '저장하지 않은 변경이 있습니다.',
    unsavedBody: '지금 나가면 마지막 저장 이후의 작업이 사라집니다.',
    unsavedSave: '저장하고 나가기',
    unsavedDiscard: '그냥 나가기',

    fileChangedTitle: '이 파일이 다른 곳에서 바뀌었습니다.',
    fileChangedBody: '다른 컴퓨터에서 저장한 내용이 있습니다. 어느 쪽을 쓸지 골라 주세요.',
    fileChangedTakeFile: '파일 내용 쓰기 (권장)',
    fileChangedKeepMine: '내 작업 유지하고 다른 이름으로 저장',

    recoverTitle: '저장되지 않은 작업이 있습니다.',
    recoverBody: '지난번에 저장하지 못하고 끝난 작업이 남아 있습니다. 복구할까요?',
    recoverYes: '복구하기',
    recoverNo: '파일 그대로 열기',

    readOnlyTitle: '이 파일을 다른 탭에서 편집 중입니다.',
    readOnlyBody: '같은 파일을 두 곳에서 고치면 한쪽 작업이 사라집니다.',
    readOnlyOpen: '읽기 전용으로 열기',
    readOnlyTakeOver: '여기서 편집하기',

    quotaTitle: '브라우저 저장 공간이 거의 찼습니다.',
    quotaBody: '파일로 내보내 두면 안전합니다.',
    quotaExport: '파일로 내보내기',
    quotaLater: '나중에',
    /** 숫자를 준다 — «여러»가 아니라 «85MB 중 68MB» (SS§1.7) */
    quotaDetail: (usedMb: number, totalMb: number) => `${totalMb}MB 중 ${usedMb}MB 를 썼습니다.`,

    saveFailedTitle: '파일을 저장하지 못했습니다.',
    saveFailedRetry: '다시 시도',
    saveFailedAs: '다른 이름으로 저장',
    /** 원본이 온전하다는 사실을 알려야 한다 — 모르면 «다 날아갔다»고 믿는다 */
    saveFailedSafe: '원본 파일은 그대로 있습니다.',
  },

  error: {
    /** 무엇이·왜·다음에 무엇을 (SS§1.7). 여기서는 «무엇이»까지만 알 수 있다 */
    screen: '이 화면을 표시하지 못했습니다.',
    screenBody: '작업 내용은 남아 있습니다. 화면을 새로 고쳐 보세요.',
    item: '이 문항을 표시할 수 없습니다.',
  },

  card: {
    /** «└ 종속 문항 3개» — 지문 묶음 카드가 접혔을 때 보여주는 것 */
    childCount: (n: number) => `종속 문항 ${n}개`,
  },

  common: {
    question: '문항',
    passage: '지문',
    passageGroup: '묶음 문항',
    paper: '시험지',
    points: '배점',
    bank: '보관함',
    publicPc: '공용 PC 모드',
    added: '담김',
  },
} as const

export type Strings = typeof strings
