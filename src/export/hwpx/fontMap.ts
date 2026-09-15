/** 폰트·크기 매핑 (zz-9 D4).
 *
 *  ★ **함초롬바탕을 지정한다. Noto Serif KR 이 아니다.**
 *
 *  zzaim 은 Noto Serif KR 로 조판하지만, 그 이름을 HWPX 에 적으면 **교사 PC 에
 *  그 폰트가 없을 때 한글이 제멋대로 대체해 줄바꿈이 통째로 달라진다.**
 *  함초롬바탕은 한글이 설치되면 반드시 있다 —
 *  **«어긋나더라도 예측 가능하게 어긋나는 편»** 을 택한 것이다.
 *
 *  그 대가로 zzaim 화면과 줄바꿈이 다르다. 그래서 내보내기 화면이
 *  «한글에서는 줄바꿈이 조금 달라질 수 있습니다» 를 **반드시** 알린다 (UD-49). */

/** 한글이 실제 파일에 쓰는 이름 그대로 */
export const EXPORT_FONT = '함초롬바탕'

/** 폰트를 언어별로 다 채워야 한다. 한 언어라도 비면 그 언어의 글자가
 *  엉뚱한 폰트로 떨어진다 — 시험지에는 한자와 기호가 섞인다. */
export const FONT_LANGS = [
  'HANGUL',
  'LATIN',
  'HANJA',
  'JAPANESE',
  'OTHER',
  'SYMBOL',
  'USER',
] as const

export type FontLang = (typeof FONT_LANGS)[number]
