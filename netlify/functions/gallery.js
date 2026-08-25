// 사진첩(갤러리) Netlify Function — 모든 방문자에게 공통으로 보이도록 서버(Netlify Blobs)에 저장
// GET  : 등록된 전체 사진 목록 반환 (최신순)
// POST : body.action === 'save'   -> 사진 추가/수정
//        body.action === 'delete' -> 사진 삭제
//
// 주의: 이 함수는 비밀번호 검증을 하지 않습니다.
// 실제 보호는 프론트엔드의 관리자 비밀번호 로그인(ADMIN_PASSWORD)에 의존합니다.

const { getStore } = require('@netlify/blobs');

function getGalleryStore() {
  return getStore({
    name: 'gallery',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

exports.handler = async (event) => {
  const store = getGalleryStore();

  if (event.httpMethod === 'GET') {
    try {
      const { blobs } = await store.list();
      const items = [];
      for (const b of blobs) {
        const data = await store.get(b.key, { type: 'json' });
        if (data) items.push(data);
      }
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return { statusCode: 200, body: JSON.stringify({ items }) };
    } catch (err) {
      console.error('gallery GET error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '사진첩을 불러오지 못했습니다.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');

      if (payload.action === 'delete') {
        const { id } = payload;
        if (!id) return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청입니다.' }) };
        await store.delete(String(id));
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      // 기본 동작: 저장(추가 또는 수정)
      const { id, title, category, desc, image } = payload;
      if (!title) {
        return { statusCode: 400, body: JSON.stringify({ error: '사진 제목이 필요합니다.' }) };
      }
      const itemId = id ? String(id) : String(Date.now());
      const existing = id ? await store.get(itemId, { type: 'json' }) : null;
      const data = {
        id: itemId,
        title,
        category: category || '농장',
        desc: desc || '',
        image: image || existing?.image || '',
        createdAt: existing?.createdAt || Date.now(),
      };
      await store.setJSON(itemId, data);
      return { statusCode: 200, body: JSON.stringify({ ok: true, id: itemId }) };
    } catch (err) {
      console.error('gallery POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '저장에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
