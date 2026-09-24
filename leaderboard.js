// ===== 랭킹 =====
// 구글 Apps Script 웹앱에 점수를 보내고 상위 기록을 받아 온다.
//
// Apps Script 웹앱은 응답이 googleusercontent.com 으로 넘어가서 보통의 fetch 로는
// CORS 에 막힌다. 그래서 <script> 태그로 불러오는 옛날 방식(JSONP)을 쓴다.
// 주소가 비어 있으면 이 브라우저에만 기록을 남긴다 (localStorage).
const RANK = (() => {
  const LIMIT = 10;              // 보여 줄 순위 수
  const NAME_MAX = 20;           // 이름 최대 길이 (알파벳만)
  const LOCAL_KEY = 'lv_rank';

  const url = () => (typeof window !== 'undefined' && window.RANK_URL) || '';
  const online = () => !!url();

  // 이름을 알파벳 대문자만 남기고 잘라 낸다
  const clean = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, NAME_MAX);

  // ----- JSONP: <script> 를 하나 꽂아 두고 콜백으로 결과를 받는다 -----
  let seq = 0;
  function jsonp(params, timeout = 6000) {
    return new Promise((resolve, reject) => {
      const cb = '__rank_cb_' + (++seq);
      const tag = document.createElement('script');
      let done = false;
      const finish = (fn, v) => {
        if (done) return;
        done = true;
        delete window[cb];
        tag.remove();
        fn(v);
      };
      window[cb] = data => finish(resolve, data);
      const q = new URLSearchParams({ ...params, callback: cb }).toString();
      tag.src = url() + (url().includes('?') ? '&' : '?') + q;
      tag.onerror = () => finish(reject, new Error('랭킹 서버에 연결하지 못했습니다'));
      setTimeout(() => finish(reject, new Error('랭킹 서버 응답이 없습니다')), timeout);
      document.head.appendChild(tag);
    });
  }

  // ----- 이 브라우저에만 남기는 기록 (서버가 없을 때) -----
  function localAll() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch (e) { return []; }
  }
  function localAdd(name, score, secs) {
    const list = localAll();
    list.push({ name, score, secs, at: Date.now() });
    list.sort((a, b) => b.score - a.score);
    const cut = list.slice(0, 50);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(cut)); } catch (e) { /* 무시 */ }
    return cut.slice(0, LIMIT);
  }

  return {
    NAME_MAX,
    LIMIT,
    online,
    clean,

    // 점수 등록 → 갱신된 상위 목록을 돌려준다
    async submit(name, score, secs) {
      const n = clean(name) || 'PLAYER';
      if (!online()) return { rows: localAdd(n, score, secs), offline: true };
      const r = await jsonp({ action: 'submit', name: n, score: Math.round(score), secs: Math.round(secs) });
      return { rows: r.rows || [], rank: r.rank, offline: false };
    },

    // 상위 목록만 조회
    async top() {
      if (!online()) return { rows: localAll().slice(0, LIMIT), offline: true };
      const r = await jsonp({ action: 'top', limit: LIMIT });
      return { rows: r.rows || [], offline: false };
    },
  };
})();
