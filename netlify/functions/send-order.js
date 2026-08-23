// 주문 접수 Netlify Function
// - 고객에게 "주문 접수 안내" 문자 발송
// - 사장님에게 "새 주문 알림" 문자 발송
// - 주문 데이터를 Netlify Blobs에 저장 (관리자 "주문확인" 화면에서 조회)
//
// 필요한 환경변수 (Netlify 대시보드 > Site configuration > Environment variables):
//   SOLAPI_API_KEY    - 솔라피 API Key
//   SOLAPI_API_SECRET - 솔라피 API Secret
//   SOLAPI_SENDER     - 발신번호(=사장님 번호), 하이픈 없이 숫자만. 예: 01099802835

const { SolapiMessageService } = require('solapi');
const { getStore } = require('@netlify/blobs');

// 이 사이트는 원래 Netlify Drop으로 시작했다가 Git 연동으로 전환된 이력이 있어,
// Blobs 저장소가 자동으로 인식되지 않는 경우가 있습니다.
// 그래서 siteID/token을 명시적으로 지정해 저장소에 연결합니다.
// - NETLIFY_SITE_ID: 비밀값 아님(Project ID). 아래 기본값으로도 정상 동작합니다.
// - NETLIFY_AUTH_TOKEN: Netlify Personal Access Token (환경변수로 등록, 비밀값)
function getOrdersStore() {
  return getStore({
    name: 'orders',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청입니다.' }) };
  }

  const { name, phone, address, depositor, memo, itemsText, totalText } = payload;

  if (!name || !phone) {
    return { statusCode: 400, body: JSON.stringify({ error: '주문자 성함과 연락처가 필요합니다.' }) };
  }

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const sender = (process.env.SOLAPI_SENDER || '').replace(/-/g, '');
  const customerPhone = String(phone).replace(/-/g, '');

  if (!apiKey || !apiSecret || !sender) {
    return { statusCode: 500, body: JSON.stringify({ error: '문자 발송 설정(SOLAPI_API_KEY/SECRET/SENDER)이 누락되었습니다.' }) };
  }

  try {
    const messageService = new SolapiMessageService(apiKey, apiSecret);

    // 1) 고객에게 주문 접수 안내
    await messageService.send({
      to: customerPhone,
      from: sender,
      text: '주문이 접수되었습니다. 입금이 확인되면 포장 작업이 진행될 예정입니다.',
    });

    // 2) 사장님에게 새 주문 알림 (주문자 성함 포함)
    await messageService.send({
      to: sender,
      from: sender,
      text: `${name} 고객님으로부터 새 주문이 들어왔어요`,
    });

    // 3) 주문 데이터 저장 (Netlify Blobs) — 관리자 "주문확인" 화면에서 사용
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const order = {
      id: orderId,
      name,
      phone,
      address: address || '',
      depositor: depositor || name,
      memo: memo || '',
      items: itemsText || '',
      total: totalText || '',
      createdAt: new Date().toISOString(),
      paid: false,
      shipped: false,
    };

    try {
      const store = getOrdersStore();
      await store.setJSON(orderId, order);
    } catch (storeErr) {
      // 저장에 실패해도 문자는 이미 발송되었으므로 주문 자체는 성공으로 처리하고 로그만 남긴다.
      console.error('order storage failed:', storeErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, orderId }),
    };
  } catch (err) {
    console.error('send-order error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || '문자 전송 중 오류가 발생했습니다.' }),
    };
  }
};
