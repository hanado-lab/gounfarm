// 시즌 아웃 설정 Netlify Function — 전체 방문자에게 공통 적용되는 사이트 상태
// GET  : 현재 시즌 아웃 여부 반환 (기본값 false = 판매중)
// POST : 시즌 아웃 여부 변경 (관리자 전용, 프론트엔드 비밀번호 로그인에 의존)

const { getStore } = require('@netlify/blobs');

function getSettingsStore() {
  return getStore({
    name: 'site-settings',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

const SEASON_KEY = 'season-status';

exports.handler = async (event) => {
  const store = getSettingsStore();

  if (event.httpMethod === 'GET') {
    try {
      const data = await store.get(SEASON_KEY, { type: 'json' });
      return { statusCode: 200, body: JSON.stringify({ seasonOut: !!data?.seasonOut }) };
    } catch (err) {
      // 저장된 값이 아직 없는 초기 상태는 "판매중"으로 간주
      return { statusCode: 200, body: JSON.stringify({ seasonOut: false }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const { seasonOut } = JSON.parse(event.body || '{}');
      await store.setJSON(SEASON_KEY, { seasonOut: !!seasonOut, updatedAt: Date.now() });
      return { statusCode: 200, body: JSON.stringify({ ok: true, seasonOut: !!seasonOut }) };
    } catch (err) {
      console.error('season POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '시즌 설정 변경에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
