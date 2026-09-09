/** 지문 없는 문항에 **지문을 되돌려 놓는다** (SS§6.5 «지문 담기»).
 *
 *  ★ 이 동작이 붙어 있지 않아 버튼이 아예 그려지지 않고 있었다 —
 *  경고만 뜨고 «어떻게 고치지»에는 답이 없는 상태였다.
 *  경고는 **고칠 방법과 함께** 나와야 한다.
 *
 *  되돌리는 방법: 그 문항을 **지문 묶음으로 감싼다.** 지문을 따로 끼워 넣고
 *  문항을 그대로 두면 «지문 다음에 문항»이라는 자리만 맞고 **묶음이 아니어서**
 *  다시 흩어질 수 있다. 묶음은 아이템 하나라 이후 이동에서도 함께 다닌다. */
import type { PaperItem } from '@/domain/types'

export function restorePassage(
  items: readonly PaperItem[],
  index: number,
  passageId: string,
): PaperItem[] {
  const target = items[index]
  if (!target || target.kind !== 'question') return [...items]

  // 같은 지문의 묶음이 이미 있으면 **그 묶음에 넣는다** — 지문이 두 번 나오면 안 된다
  const existing = items.findIndex(
    (i) => i.kind === 'passageGroup' && i.passageId === passageId,
  )
  if (existing !== -1) {
    return items.flatMap((item, i) => {
      if (i === index) return []
      if (i !== existing || item.kind !== 'passageGroup') return [item]
      return [{ ...item, children: [...item.children, { questionId: target.questionId }] }]
    })
  }

  return items.map((item, i) =>
    i === index
      ? {
          kind: 'passageGroup',
          passageId,
          children: [
            {
              questionId: target.questionId,
              ...(target.overridePoints !== undefined
                ? { overridePoints: target.overridePoints }
                : {}),
            },
          ],
          splitPolicy: 'together',
        }
      : item,
  )
}
