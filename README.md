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

## 문제 파일

`questions.json`의 모양과 규칙은 [questions-format.md](questions-format.md)를 본다.
