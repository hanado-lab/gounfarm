// 시즌 아웃 설정 Netlify Function — 전체 방문자에게 공통 적용되는 사이트 상태
// GET  : 현재 시즌 아웃 상태 전체 반환 { seasonOut, products: {nogji, hallabong, hwanggeum, redhyang} }
// POST : 상태 변경 (관리자 전용, 프론트엔드 비밀번호 로그인에 의존)
//        body.type === 'overall' -> 전체 시즌아웃 on/off
//        body.type === 'product' -> 품종별 개별 시즌아웃 on/off (body.key, body.seasonOut)

const { getStore } = require('@netlify/blobs');

function getSettingsStore() {
  return getStore({
    name: 'site-settings',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

const SEASON_KEY = 'season-status';
const PRODUCT_KEYS = ['nogji', 'hallabong', 'hwanggeum', 'redhyang'];

function defaultStatus() {
  return {
    seasonOut: false,
    products: { nogji: false, hallabong: false, hwanggeum: false, redhyang: false },
  };
}

async function readStatus(store) {
  try {
    const data = await store.get(SEASON_KEY, { type: 'json' });
    if (!data) return defaultStatus();
    // 이전 버전 데이터(전체 on/off만 있던 경우) 호환 처리
    return {
      seasonOut: !!data.seasonOut,
      products: { ...defaultStatus().products, ...(data.products || {}) },
    };
  } catch (err) {
    return defaultStatus();
  }
}

exports.handler = async (event) => {
  const store = getSettingsStore();

  if (event.httpMethod === 'GET') {
    const status = await readStatus(store);
    return { statusCode: 200, body: JSON.stringify(status) };
  }

  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const current = await readStatus(store);

      if (payload.type === 'product') {
        const { key, seasonOut } = payload;
        if (!PRODUCT_KEYS.includes(key)) {
          return { statusCode: 400, body: JSON.stringify({ error: '잘못된 상품입니다.' }) };
        }
        current.products[key] = !!seasonOut;
      } else {
        // 기본값: 전체 시즌아웃 (하위 호환: type 없이 seasonOut만 보내는 이전 방식도 지원)
        current.seasonOut = !!payload.seasonOut;
      }

      await store.setJSON(SEASON_KEY, { ...current, updatedAt: Date.now() });
      return { statusCode: 200, body: JSON.stringify({ ok: true, ...current }) };
    } catch (err) {
      console.error('season POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '시즌 설정 변경에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
