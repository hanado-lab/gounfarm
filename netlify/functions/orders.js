// 관리자 "주문확인" 화면용 Netlify Function
// GET  : 저장된 전체 주문 목록 반환 (최신순)
// POST : 주문 하나의 상태 필드(paid / shipped)를 갱신
//
// 주의: 이 함수는 비밀번호 검증을 하지 않습니다.
// 실제 보호는 프론트엔드의 관리자 비밀번호 로그인(ADMIN_PASSWORD)에 의존합니다.
// 더 강한 보안이 필요하면 이 함수에서도 별도 토큰/비밀번호 검증을 추가하세요.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const store = getStore('orders');

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
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      console.error('orders POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '상태 변경에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
