# 고운농장 주문 접수 Netlify Functions

이 폴더를 홈페이지(`goun-farm10.html`이 있는) 저장소의 **가장 바깥(루트) 폴더**에 그대로 합쳐 넣고
Netlify에 다시 배포하면, 헤더의 계좌/전화번호와 상품 섹션의 "주문 접수하기" 버튼이 실제로 동작합니다.

## 폴더 구조 (예시)

```
your-site/
├─ index.html                 (goun-farm10.html을 index.html로 이름 바꿔서 사용)
├─ netlify.toml
├─ package.json
└─ netlify/
   └─ functions/
      ├─ send-order.js
      └─ orders.js
```

## 필요한 준비물 (이미 완료하신 부분)

1. 솔라피(SOLAPI) 개인 계정 가입 + 발신번호(010-9880-2835) 등록
2. 솔라피 API Key / API Secret 발급
3. Netlify 환경변수 등록
   - `SOLAPI_API_KEY`
   - `SOLAPI_API_SECRET`
   - `SOLAPI_SENDER` (예: `01099802835`, 하이픈 없이)

## 배포 후 확인 방법

1. Netlify에서 재배포가 끝나면, 사이트에서 상품을 담고 "주문 접수하기"를 눌러보세요.
2. 정상 동작하면:
   - 주문 시 입력한 연락처로 "주문이 접수되었습니다..." 문자가 옵니다.
   - 010-9880-2835로 "OOO 고객님으로부터 새 주문이 들어왔어요" 문자가 옵니다.
3. 헤더의 **🔐 주문확인** 버튼을 눌러 관리자 비밀번호(기존 사진첩 관리와 동일한 비밀번호)를 입력하면,
   접수된 주문 목록과 입금확인/발송완료 체크박스를 볼 수 있습니다.

## 문제가 생기면

- Netlify 사이트 대시보드 → **Functions** 탭에서 `send-order`, `orders` 함수의 로그를 확인하면
  실패 원인(환경변수 누락, 솔라피 인증 오류 등)을 바로 확인할 수 있어요.
- 가장 흔한 원인은 환경변수 이름 오타이니, `SOLAPI_API_KEY` / `SOLAPI_API_SECRET` / `SOLAPI_SENDER`
  철자가 정확한지 다시 확인해 주세요.
