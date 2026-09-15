# 내보낸 `.hwpx` 를 **독립 판독기**로 검사하기

zz-9 의 검증 항목은 «한글에서 경고 없이 열린다»인데, 그건 **사람이 한글로 열어야**
확인된다(zz-9 D6). 하지만 그 앞단은 자동으로 확인할 수 있다 —
우리가 만든 파일을 **우리 코드가 아닌 다른 구현**이 읽어 내는지 보면 된다.

`hwpxlib`(Apache-2.0)는 OWPML 을 자바로 구현한 공개 라이브러리다. 이걸로 읽어서
쪽·단 나누기 수와 본문이 우리가 의도한 대로 들어갔는지 확인한다.

> ⚠ **이건 «한글이 연다»의 증명이 아니다.** 다른 구현이 읽는다는 사실일 뿐이다.
> 최종 확인은 여전히 사람 몫이다.

기본 테스트에는 넣지 않는다 — JVM 과 네트워크가 필요해서, 있으면 좋지만
없다고 개발이 막혀서는 안 된다.

## 쓰는 법

```bash
curl -sSLO https://repo1.maven.org/maven2/kr/dogfoot/hwpxlib/1.0.5/hwpxlib-1.0.5.jar
javac -cp hwpxlib-1.0.5.jar -d . Check.java Extract.java
java -cp "hwpxlib-1.0.5.jar:." Check  ~/Downloads/시험지.hwpx
java -cp "hwpxlib-1.0.5.jar:." Extract ~/Downloads/시험지.hwpx
```

## 2026-08-30 실행 결과 (24문항 · 3쪽 · 2단)

```
READ OK
sections=1
paragraphs=144
pageBreaks=2 columnBreaks=2      ← 3쪽이므로 쪽 나누기 2. 마지막 쪽 둘째 단은 비어 있어 단 나누기가 2다
pageW=59528 pageH=84188          ← A4
```

본문 추출에서 문항 번호·배점·부등호(`x < 3`)·지문 상자가 모두 살아 있음을 확인했다.
