# Noticement Plugin

AI/Java/보안 벤더 릴리즈를 모아서 Claude 또는 ChatGPT 대화 안에서 요약하고,
필요하면 Notion에 기록하고 이메일로 보내는 플러그인. 원래 `../Noticement`
(Spring Boot 자체 솔루션)의 `plugin` 브랜치 몫을 별도 저장소로 분리한 것.

수집 대상은 분석/발행을 서버가 하지 않는다 — **호출한 AI 모델이 대화 중에
직접** 요약하고 MCP 툴로 Notion/이메일에 반영한다. 이 저장소는 AI가 스스로 할
수 없는 두 가지만 코드로 제공한다: ChatGPT용 크롤링 API(`backend/`)와 이메일
발송 MCP 툴(`mcp/email-server/`).

## 구조

- `.claude-plugin/` — Claude Code 플러그인 매니페스트. `skills/`와
  `mcp/email-server`(로컬), Notion 공식 원격 MCP를 선언한다.
- `skills/collect-updates/` — 벤더 소스를 WebFetch로 훑어 채팅에 요약만
  보여주는 스킬. `sources.json`이 벤더 목록의 단일 소스.
- `skills/publish-digest/` — 위 수집에 이어 Notion 페이지 생성 + 이메일
  발송까지 하는 스킬.
- `mcp/email-server/` — `send_email` 툴 하나만 있는 TypeScript MCP 서버
  (stdio, nodemailer/SMTP).
- `backend/` — ChatGPT Custom GPT Action용 백엔드(Express). `GET
  /api/plugin/collect` 하나만 있고, DB나 분석 로직은 없음(무상태).
- `openapi/plugin.yaml` — 위 엔드포인트의 OpenAPI 3.1 스펙. Custom GPT
  Action에 그대로 import.

## Claude Code에 설치

```
/plugin marketplace add <이 저장소 경로 또는 git URL>
/plugin install noticement-collect@noticement
```

`mcp/email-server`는 처음 설치 시 빌드가 안 되어 있으면 동작하지 않으니
먼저 빌드해 둔다:

```
cd mcp/email-server && npm install && npm run build
```

이메일 발송용 환경변수 (`send_email` 호출 전 설정):

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — 필수
- `SMTP_FROM` — 선택, 없으면 `SMTP_USER`로 발신

Notion은 `plugin.json`에 선언된 공식 원격 MCP(`mcp.notion.com`)를 Claude에서
연결/인증하면 된다 — 이 저장소는 아무것도 구현하지 않는다.

`collect-updates`는 채팅에 요약만 보여준다. `publish-digest`는 Notion 기록과
이메일 발송까지 하므로, 실행 전에 수신 이메일 주소와 Notion 상위
페이지/데이터베이스를 대화 중에 알려줘야 한다(하드코딩된 기본값 없음).

## ChatGPT Custom GPT Action 배포

`backend/`를 ChatGPT가 접근 가능한 HTTPS 호스트에 배포한 뒤:

```
cd backend && npm install && npm run build && npm start
```

- `PORT` — 기본 8080
- `PLUGIN_API_KEY` — 설정하면 `X-Api-Key` 헤더 검증, 안 하면 로컬 개발용
  무인증(배포 전 반드시 설정)
- `PLUGIN_MAX_DOCS`, `PLUGIN_MAX_CONTENT_CHARS` — 응답 문서 수/본문 길이 상한

배포 후 `openapi/plugin.yaml`의 `servers.url`을 실제 호스트로 바꿔 Custom
GPT의 Action으로 import하고, 같은 API 키를 Action 인증에 설정한다.

## 스케줄링

이 저장소는 자체 크론이 없다. 주기 실행은 호출하는 쪽 책임:

- Claude Code: `/schedule` 또는 `/loop`로 `collect-updates`/`publish-digest`
  스킬을 주기적으로 트리거.
- ChatGPT: Scheduled Tasks가 Custom GPT를 주기적으로 호출.
