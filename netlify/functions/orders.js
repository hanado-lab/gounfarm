// 관리자 "주문확인" 화면용 Netlify Function
// GET  : 저장된 전체 주문 목록 반환 (최신순)
// POST : 주문 하나의 상태 필드(paid / shipped)를 갱신
//        - paid를 true로 바꾸면 고객에게 "입금 확인" 문자 발송
//        - shipped를 true로 바꾸면 고객에게 "발송 완료" 문자 발송
//        - false로 되돌릴 때는 문자를 보내지 않음
//
// 주의: 이 함수는 비밀번호 검증을 하지 않습니다.
// 실제 보호는 프론트엔드의 관리자 비밀번호 로그인(ADMIN_PASSWORD)에 의존합니다.
// 더 강한 보안이 필요하면 이 함수에서도 별도 토큰/비밀번호 검증을 추가하세요.

const { getStore } = require('@netlify/blobs');
const { SolapiMessageService } = require('solapi');

// send-order.js와 동일한 이유로 siteID/token을 명시적으로 지정합니다.
function getOrdersStore() {
  return getStore({
    name: 'orders',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

const STATUS_MESSAGES = {
  paid: '입금이 확인되었습니다. 정성껏 수확하여 포장 후 보내드리겠습니다.',
  shipped: '주문하신 상품이 발송되었습니다.',
};

exports.handler = async (event) => {
  const store = getOrdersStore();

  if (event.httpMethod === 'GET') {
    try {
      const { blobs } = await store.list();
      const orders = [];
      for (const b of blobs) {
        const data = await store.get(b.key, { type: 'json' });
        if (data) orders.push(data);
      }
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { statusCode: 200, body: JSON.stringify({ orders }) };
    } catch (err) {
      console.error('orders GET error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '주문 목록을 불러오지 못했습니다.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const { id, field, value } = JSON.parse(event.body || '{}');
      if (!id || !['paid', 'shipped'].includes(field)) {
        return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청입니다.' }) };
      }
      const order = await store.get(id, { type: 'json' });
      if (!order) {
        return { statusCode: 404, body: JSON.stringify({ error: '해당 주문을 찾을 수 없습니다.' }) };
      }

      order[field] = !!value;
      await store.setJSON(id, order);

      // 체크(true)로 바뀌는 경우에만 고객에게 상태 안내 문자 발송. 해제(false)는 문자 발송 없음.
      if (value && order.phone) {
        try {
          const apiKey = process.env.SOLAPI_API_KEY;
          const apiSecret = process.env.SOLAPI_API_SECRET;
          const sender = (process.env.SOLAPI_SENDER || '').replace(/-/g, '');
          if (apiKey && apiSecret && sender) {
            const messageService = new SolapiMessageService(apiKey, apiSecret);
            await messageService.send({
              to: String(order.phone).replace(/-/g, ''),
              from: sender,
              text: STATUS_MESSAGES[field],
            });
          } else {
            console.error('SMS 발송 설정(SOLAPI_API_KEY/SECRET/SENDER)이 누락되었습니다.');
          }
        } catch (smsErr) {
          // 문자 발송이 실패해도 상태 변경 자체는 이미 저장되었으므로 성공으로 응답하고 로그만 남긴다.
          console.error('status sms failed:', smsErr);
        }
      }

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      console.error('orders POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '상태 변경에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};

