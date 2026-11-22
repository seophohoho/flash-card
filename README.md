# flash-card

문제 JSON을 플래시카드로 한 장씩 넘겨 보는 정적 웹 사이트. 빌드 단계와 외부 라이브러리가 없다.

## 로컬 실행

`file://`로 연 페이지는 `fetch`가 막히므로 로컬 서버가 필요하다.

```bash
python3 -m http.server 8000
```

그다음 브라우저에서 `http://localhost:8000`을 연다.

## 테스트

Node 20 이상이 필요하다.

```bash
node --test
```

## 과목평가 요약본

상단의 "과목평가" 버튼을 누르면 `summary/flink_summary.md`와 `summary/spark_summary.md`를 읽어 요약본 화면으로 바꾼다. 마크다운은 `js/markdown.js`가 직접 해석하고, 다이어그램(mermaid)은 `vendor/mermaid.min.js`(11.17.2)가 그린다. 이 파일은 요약본을 열 때만 불러온다. 요약본을 고치려면 해당 과목 파일(`summary/flink_summary.md`, `summary/spark_summary.md`)을 수정한다. 각 파일은 `# ` 제목마다 한 편으로 나뉘고, 편은 flink 1편 뒤에 spark 1편 순서로 이어진다. `#summary-2`처럼 주소 끝에 붙이면 해당 편으로 바로 열린다.

## 월말 평가

상단의 "월말 평가" 버튼은 `exam/exam.json`을 읽어 실습·과제 42개를 한 문제씩 보여 준다. 정답이 채워진 코드(빈칸 정답은 노란색), 실행 출력, 핵심 개념을 읽기만 하는 화면이다. `#exam-3`처럼 주소 끝에 붙이면 해당 문제로 바로 열린다.

`exam/exam.json`은 `ws_hw/`에서 만든다. 문제를 고치면 다시 만든다.

```bash
node scripts/build-exam.js
```

경로를 바꾸려면 `node scripts/build-exam.js <ws_hw 경로> <출력 json 경로>`.

## 문제 파일

`questions.json`의 모양과 규칙은 [questions-format.md](questions-format.md)를 본다.

## 배포

- 저장소: https://github.com/seophohoho/flash-card
- 배포 주소: https://flash-card-alpha-eight.vercel.app
- `main`에 push하면 Vercel이 자동으로 배포한다. 빌드 단계는 없다.
- 배포 상태는 `npx vercel ls` 또는 Vercel 대시보드에서 본다.
