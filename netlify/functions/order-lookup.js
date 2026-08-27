// 고객용 "주문조회" Netlify Function
// GET ?name=홍길동&phone=010-1234-5678
// 성함과 연락처가 모두 일치하는 주문만 반환 (최신순).
// 관리자용 orders.js(전체 목록 조회)와 달리, 이 함수는 검색 조건과 정확히 일치하는
// 주문만 돌려줘서 다른 고객의 개인정보가 노출되지 않도록 서버에서 걸러줍니다.

const { getStore } = require('@netlify/blobs');

function getOrdersStore() {
  return getStore({
    name: 'orders',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const params = event.queryStringParameters || {};
  const qName = (params.name || '').trim();
  const qPhone = normalizePhone(params.phone);

  if (!qName || !qPhone) {
    return { statusCode: 400, body: JSON.stringify({ error: '성함과 연락처를 입력해 주세요.' }) };
  }

  try {
    const store = getOrdersStore();
    const { blobs } = await store.list();
    const matched = [];

    for (const b of blobs) {
      const data = await store.get(b.key, { type: 'json' });
      if (!data) continue;
      if (data.name === qName && normalizePhone(data.phone) === qPhone) {
        matched.push(data);
      }
    }

    matched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { statusCode: 200, body: JSON.stringify({ orders: matched }) };
  } catch (err) {
    console.error('order-lookup error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: '주문 조회 중 오류가 발생했습니다.' }) };
  }
};
