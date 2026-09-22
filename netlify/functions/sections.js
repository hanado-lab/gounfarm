// 섹션 노출 설정 Netlify Function — 전체 방문자에게 공통 적용
// GET  : 현재 섹션별 노출 여부 반환 (기본값 전부 true = 노출)
// POST : 섹션 하나의 노출 여부 변경 (관리자 전용, 프론트엔드 비밀번호 로그인에 의존)
//        body: { key: 'products', visible: true/false }
//
// 히어로 섹션은 관리 대상에서 제외됩니다.

const { getStore } = require('@netlify/blobs');

function getSettingsStore() {
  return getStore({
    name: 'site-settings',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

const SECTIONS_KEY = 'section-visibility';
const SECTION_KEYS = ['products', 'season', 'story', 'reviews', 'gallery', 'location', 'order'];

function defaultVisibility() {
  const v = {};
  SECTION_KEYS.forEach(k => { v[k] = true; });
  return v;
}

async function readVisibility(store) {
  try {
    const data = await store.get(SECTIONS_KEY, { type: 'json' });
    if (!data) return defaultVisibility();
    return { ...defaultVisibility(), ...data };
  } catch (err) {
    return defaultVisibility();
  }
}

exports.handler = async (event) => {
  const store = getSettingsStore();

  if (event.httpMethod === 'GET') {
    const visibility = await readVisibility(store);
    return { statusCode: 200, body: JSON.stringify({ sections: visibility }) };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { key, visible } = JSON.parse(event.body || '{}');
      if (!SECTION_KEYS.includes(key)) {
        return { statusCode: 400, body: JSON.stringify({ error: '잘못된 섹션입니다.' }) };
      }
      const current = await readVisibility(store);
      current[key] = !!visible;
      await store.setJSON(SECTIONS_KEY, current);
      return { statusCode: 200, body: JSON.stringify({ ok: true, sections: current }) };
    } catch (err) {
      console.error('sections POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '섹션 설정 변경에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
