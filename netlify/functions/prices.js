// 상품 가격/판매옵션 설정 Netlify Function — 전체 방문자에게 공통 적용
// GET  : { prices, options } 반환 (저장된 값이 없으면 기본값)
// POST : body { prices?, options? } 를 저장 (관리자 전용, 프론트엔드 비밀번호 로그인에 의존)
//        options[품종] = { grade: 'both'|'normal'|'ugly'|'none', weights: ['3kg','5kg','10kg'] 중 일부 }

const { getStore } = require('@netlify/blobs');

function getSettingsStore() {
  return getStore({
    name: 'site-settings',
    siteID: process.env.NETLIFY_SITE_ID || '420d83b5-e8a4-41aa-b2ea-39ec9de81169',
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

const PRICES_KEY = 'product-prices';
const OPTIONS_KEY = 'product-options';
const PRODUCT_KEYS = ['nogji', 'hallabong', 'hwanggeum', 'redhyang'];
const GRADE_MODES = ['both', 'normal', 'ugly', 'none'];
const WEIGHTS = ['3kg', '5kg', '10kg'];

function defaultPrices() {
  return {
    nogji:     { normal:{'3kg':12900,'5kg':18900,'10kg':32000}, ugly:{'3kg':9900, '5kg':14900,'10kg':25000} },
    hwanggeum: { normal:{'3kg':27000,'5kg':41000,'10kg':74000}, ugly:{'3kg':20500,'5kg':31500,'10kg':56000} },
    redhyang:  { normal:{'3kg':28000,'5kg':43000,'10kg':76000}, ugly:{'3kg':21500,'5kg':33000,'10kg':58000} },
    hallabong: { normal:{'3kg':25000,'5kg':38000,'10kg':68000}, ugly:{'3kg':19000,'5kg':29000,'10kg':52000} },
  };
}

function defaultOptions() {
  const o = {};
  PRODUCT_KEYS.forEach(k => { o[k] = { grade: 'both', weights: WEIGHTS.slice() }; });
  return o;
}

// 잘못된 값이 들어와도 항상 안전한 형태로 정리
function sanitizeOptions(input) {
  const out = defaultOptions();
  if (!input || typeof input !== 'object') return out;
  PRODUCT_KEYS.forEach(k => {
    const o = input[k];
    if (!o || typeof o !== 'object') return;
    const grade = GRADE_MODES.includes(o.grade) ? o.grade : 'both';
    let weights = Array.isArray(o.weights) ? WEIGHTS.filter(w => o.weights.includes(w)) : WEIGHTS.slice();
    if (weights.length === 0) weights = WEIGHTS.slice(); // 최소 1개 중량은 판매
    out[k] = { grade, weights };
  });
  return out;
}

async function readJson(store, key) {
  try {
    return await store.get(key, { type: 'json' });
  } catch (err) {
    return null;
  }
}

exports.handler = async (event) => {
  const store = getSettingsStore();

  if (event.httpMethod === 'GET') {
    const prices = await readJson(store, PRICES_KEY);
    const options = await readJson(store, OPTIONS_KEY);
    return {
      statusCode: 200,
      body: JSON.stringify({
        prices: prices || defaultPrices(),
        options: sanitizeOptions(options),
      }),
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { prices, options } = JSON.parse(event.body || '{}');
      if (prices !== undefined) {
        if (!prices || typeof prices !== 'object') {
          return { statusCode: 400, body: JSON.stringify({ error: '잘못된 가격 데이터입니다.' }) };
        }
        await store.setJSON(PRICES_KEY, prices);
      }
      let savedOptions;
      if (options !== undefined) {
        savedOptions = sanitizeOptions(options);
        await store.setJSON(OPTIONS_KEY, savedOptions);
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true, prices, options: savedOptions }) };
    } catch (err) {
      console.error('prices POST error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: '저장에 실패했습니다.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
