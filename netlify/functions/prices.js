// 상품 가격 설정 Netlify Function — 전체 방문자에게 공통 적용
// GET  : 현재 가격표 전체 반환 (저장된 값이 없으면 기본값)
// POST : 가격표 전체를 교체 저장 (관리자 전용, 프론트엔드 비밀번호 로그인에 의존)
//        body: { prices: { nogji:{normal:{...}, ugly:{...}}, ... } }

const { getStore } = require('@netlify/blobs');

function getSettingsStore() {
  return getStore({
    name: 'site-settings',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

const PRICES_KEY = 'product-prices';

function defaultPrices() {
  return {
    nogji:     { normal:{'3kg':12900,'5kg':18900,'10kg':32000}, ugly:{'3kg':9900, '5kg':14900,'10kg':25000} },
    hwanggeum: { normal:{'3kg':27000,'5kg':41000,'10kg':74000}, ugly:{'3kg':20500,'5kg':31500,'10kg':56000} },
    redhyang:  { normal:{'3kg':28000,'5kg':43000,'10kg':76000}, ugly:{'3kg':21500,'5kg':33000,'10kg':58000} },
    hallabong: { normal:{'3kg':25000,'5kg':38000,'10kg':68000}, ugly:{'3kg':19000,'5kg':29000,'10kg':52000} },
  };
}

exports.handler = async (event) => {
  const store = getSettingsStore();

  if (event.httpMethod === 'GET') {
    try {
      const data = await store.get(PRICES_KEY, { type: 'json' });
      return { statusCode: 200, body: JSON.stringify({ prices: data || defaultPrices() }) };
    } catch (err) {
      return { statusCode: 200, body: JSON.stringify({ prices: defaultPrices() }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const { prices } = JSON.parse(event.body || '{}');
      if (!prices || typeof prices !== 'object') {
        return { statusCode: 400, body: JSON.stringify({ error: '잘못된 가격 데이터입니다.' }) };
      }
      await store.setJSON(PRICES_KEY, prices);
      return { statusCode: 200, body: JSON.stringify({ ok: true, prices }) };
    } catch (err) {
      console.error('prices POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '가격 저장에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
