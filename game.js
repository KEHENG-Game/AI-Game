'use strict';
// =====================================================
// LAST VETERAN - 횡스크롤 런앤건 프로토타입 (도형 그래픽)
// =====================================================

// ===== 기본 설정 =====
// 게임 좌표는 480x270 그대로 쓰고, 실제 캔버스만 2배(960x540)로 그린다.
// 스프라이트를 2배 크기로 넣으면 그만큼 더 촘촘하게 보이고, 게임 로직은 하나도 안 바뀐다.
const W = 480, H = 270;             // 게임 좌표 (모든 위치·속도·크기의 단위)
const SCALE = 2;                    // 캔버스 배율 (960x540)
const GRAV = 0.3, MAX_FALL = 7;     // (적 낙하물 등에만 씀 — 플레이어는 비행이라 중력 없음)
const GROUND_Y = 230;               // 지면 높이. 이제 충돌은 없고 배경 겸 아래쪽 한계선
// ===== 횡스크롤 슈팅 설정 =====
const SCROLL = 0.55;                // 화면이 저절로 오른쪽으로 밀리는 속도
// 배경은 카메라(camX)를 따라가지 않고 따로 일정한 속도로 흐른다.
// 카메라는 플레이어가 앞서면 빨라지고 보스전에서는 아예 멈추는데,
// 그때마다 배경까지 같이 멈추면 "날고 있다"는 느낌이 끊겼다.
const BG_SPEED = 3.2;               // 배경이 뒤로 흐르는 속도 (캐릭터 움직임과 무관)
const FLY_TOP = 12;                 // 날 수 있는 위쪽 한계
const FLY_BOTTOM = GROUND_Y - 6;    // 아래쪽 한계 (지면 바로 위)
const FLY_SPEED = 2.0;              // 비행 속도
let ARENA_X = 3220;                 // 보스전 카메라 고정 위치 (스테이지마다 바뀜)
const LEVEL_END = 4000;             // 지형·배경을 미리 깔아 두는 최대 길이
// 공개할 스테이지 수. 트레일러용으로 1탄만 돌린다 (2탄 데이터는 그대로 두고 잠가만 둠)
const LAST_STAGE = 1;

// ===== 분대 설정 =====
// 플레이어 총은 권총 고정. 화력은 동료 3명의 패시브와 액티브 스킬이 담당한다.
// 동료는 처음부터 셋 다 함께하고, 레벨이 오르면 패시브와 스킬이 자동으로 강해진다 (선택 화면 없음)
const MAX_SQUAD = 3;                // 동료 인원
// 진형: 플레이어를 가운데 두고 검술병은 전방, 힐러는 대각선 위, 포병은 대각선 아래
const FORMATION = {
  sword:  { dx: 42, dy: -4 },   // 플레이어와 겹치지 않게 조금 더 앞·위로
  healer: { dx: -26, dy: -28 },
  sniper: { dx: -26, dy: 28 },
};
const SQUAD_TYPES = {
  sword: {
    name: '홍련', tag: 'S', color: '#a84a3a', cool: 55, key: 'skill1',
    passive: '수호검이 주위를 돌며 탄을 막고 적을 벤다',
    skill: '대참격 — 거대한 칼을 날린다', skillCool: 420,          // 7초 (최대 강화 시 4.6초)
  },
  healer: {
    name: '라푼젤', tag: 'H', color: '#d0d0d0', cool: 62, key: 'skill2',
    passive: '전방으로 십자가 · 분대 이동속도와 공격 범위 증가',
    skill: '성역 — 일정 시간 무적', skillCool: 1110,               // 18.5초 (최대 강화 시 12초)
  },
  // 내부 이름은 sniper 지만 역할은 포병 (곡사포)
  sniper: {
    name: '스노우화이트', tag: 'A', color: '#3f8f6a', cool: 70, key: 'skill3',
    passive: '적을 따라가는 유도 포탄',
    skill: '융단 포격 — 구역을 지지고 적을 둔화시킴', skillCool: 420,   // 7초 (최대 강화 시 4.6초)
  },
};
const SQUAD_ORDER = ['sword', 'healer', 'sniper'];

// 레벨은 분대 전체가 함께 오른다 (최대 5)
const MAX_LEVEL = 5;

// ===== 플레이어 레벨 =====
// 적을 쓰러뜨려 경험치를 모으고, 레벨이 오를 때마다 동료를 소환/강화한다
const BASE_HP = 2;                                  // 체력 2칸 = 총탄 2번 맞을 기회
// 파워업은 경험치가 아니라 아이템으로 얻는다.
// 일렬 편대의 맨 뒤 기체(붉은색)와 보급 상자가 아이템을 떨어뜨린다
const MAX_POWER = 8;               // 파워 단계 상한
// 동료는 파워업 1~3단계에서 한 명씩 붙는다. 그 전까지는 플레이어 혼자이므로
// 아래 구간만큼 난이도를 크게 낮춘다 (x 는 LEAD_IN 이 더해진 실제 좌표)
// 지상 유닛: 공중전의 곁가지라 체력·사격 빈도를 낮춰 잡는다
const GROUND_TYPES = new Set(['soldier', 'heavy', 'mid']);
const ENEMY_HP = 0.8;              // 전체 적 체력 배수 (20% 하향)
const GROUND_HP = 0.6;             // 지상 유닛 체력 배수 (위에 더해서 곱해진다)
const GROUND_RATE = 1.5;           // 지상 유닛 사격 간격 배수 (클수록 덜 쏨)
const SOLO_END = 800;              // 이 x 까지가 혼자 싸우는 구간 (홍련 합류 전)
const EASY_END = 1000;             // 홍련·라푼젤 둘만 있는 구간 (중간보스까지)
                                   // 중간보스를 잡으면 스노우화이트까지 합류하므로
                                   // 그 뒤부터는 본 난이도로 몰아친다

// 레벨별 수치 (레벨이 오르면 패시브와 스킬이 함께 강해진다)
const LV = {
  blades:    lv => Math.min(3, lv),                 // 검술병: 도는 칼 개수
  bladeR:    lv => 32 + Math.max(0, lv - 3) * 5,    // 검술병: 회전 반경
  bladeDmg:  lv => 2 + lv,                          // 검술병: 칼에 닿은 적 피해
  slashDmg:  lv => 18 + lv * 10,                    // 검술병 스킬: 대참격 피해 (1.5배 상향)
  speed:     lv => 1 + lv * 0.03,                   // 힐러: 이동속도 배율
  range:     lv => 1 + lv * 0.12,                   // 힐러: 공격 범위 배율
  aegis:     lv => 120 + lv * 30,                   // 힐러 스킬: 무적 시간
  shellDmg:  lv => 4 + lv * 3,                      // 포병: 포탄 피해
  homing:    lv => 0.015 + lv * 0.012,              // 포병: 유도 세기
  zoneTime:  lv => 120 + lv * 30,                   // 포병 스킬: 지지는 시간 (구역 안은 둔화 + 받는 피해 1.5배)
  zoneW:     lv => 70 + lv * 12,                    // 포병 스킬: 구역 폭
  zoneDmg:   lv => Math.round((1 + lv) * 1.5),      // 포병 스킬: 0.2초마다 피해 (1.5배 상향)
};

const cvs = document.getElementById('game');
cvs.width = W * SCALE; cvs.height = H * SCALE;
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;   // 도트 그림이 흐려지지 않게

function fitCanvas() {
  // 창이 충분히 크면 정수배 확대, 작으면 창에 맞춰 축소
  const fit = Math.min(innerWidth / cvs.width, innerHeight / cvs.height);
  const s = fit >= 1 ? Math.floor(fit) : fit;
  cvs.style.width = cvs.width * s + 'px';
  cvs.style.height = cvs.height * s + 'px';
}
addEventListener('resize', fitCanvas);
fitCanvas();

// ===== 에셋 불러오기 (등록표는 assets.js 의 ASSETS) =====
// 파일이 없으면 조용히 건너뛰고 도형 그래픽 / 무음으로 대체
const IMAGES = {};   // 이름 → { img, cfg }
const SOUNDS = {};   // 이름 → { buffers, cfg, last }  (파일을 여러 개 적으면 번갈아 섞어 냄)
let bgmAudio = null, muted = false;
// 배경음·효과음 볼륨은 0 ~ 1 사이에서 0.1 단위로 조절하고 브라우저에 기억시킨다
let bgmVolume = 0.4, bgmVolumeSaved = false;
let sfxVolume = 1;                    // 효과음 전체 배율 (각 소리의 volume 에 곱해짐)
(function loadVolumes() {
  const read = (key, fallback) => {
    try {
      const v = parseFloat(localStorage.getItem(key));
      return isNaN(v) ? null : clampVol(v);
    } catch (e) { return null; }      // 저장을 못 써도 그냥 기본값
  };
  const b = read('lv_bgmVolume');
  if (b !== null) { bgmVolume = b; bgmVolumeSaved = true; }
  const x = read('lv_sfxVolume');
  if (x !== null) sfxVolume = x;
})();
function clampVol(v) { return Math.max(0, Math.min(1, Math.round(v * 10) / 10)); }
function setSfxVolume(v) {
  sfxVolume = clampVol(v);
  try { localStorage.setItem('lv_sfxVolume', String(sfxVolume)); } catch (e) { /* 무시 */ }
  showMsg(sfxVolume === 0 ? '효과음 꺼짐' : `효과음 볼륨 ${Math.round(sfxVolume * 100)}%`);
  playSound('select');
}

function setBgmVolume(v) {
  bgmVolume = clampVol(v);
  if (bgmAudio) bgmAudio.volume = bgmVolume;
  try { localStorage.setItem('lv_bgmVolume', String(bgmVolume)); } catch (e) { /* 무시 */ }
  showMsg(bgmVolume === 0 ? 'BGM 꺼짐' : `BGM 볼륨 ${Math.round(bgmVolume * 100)}%`);
  playSound('select');
}

// 효과음은 WebAudio 로 미리 디코드해 둔다.
// (Audio 태그를 복제해 재생하면 재생할 때마다 파일을 다시 풀어야 해서 뚝뚝 끊긴다)
let audioCtx = null;
function getAudioCtx() {
  const AC = typeof AudioContext !== 'undefined' ? AudioContext
           : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});   // 첫 키 입력 뒤에 깨어남
  return audioCtx;
}

(function loadAssets() {
  const A = typeof ASSETS !== 'undefined' ? ASSETS : {};
  // 그림·소리도 캐시 때문에 옛 파일이 나오지 않도록 주소 뒤에 번호를 붙임
  const bust = f => f + (typeof window !== 'undefined' && window.ASSET_V ? '?v=' + window.ASSET_V : '');
  const missing = [];
  let loaded = 0, pending = 0, fellBack = false;
  const done = () => {
    if (--pending > 0) return;
    console.log(`[에셋] 불러옴 ${loaded}개 / 없음 ${missing.length}개 (없는 것은 도형·무음으로 대체)`);
    if (missing.length) console.log('[에셋] 아직 없는 파일:', missing);
  };
  const addImage = (name, cfg) => {
    pending++;
    const img = new Image();
    img.onload = () => { IMAGES[name] = { img, cfg }; loaded++; done(); };
    img.onerror = () => { missing.push(cfg.file); done(); };
    img.src = bust(cfg.file);
  };
  // 소리 파일은 확장자가 달라도(wav / mp3 / ogg) 차례로 찾아 본다
  const EXTS = ['.wav', '.mp3', '.ogg'];
  // 효과음: 파일을 받아 미리 디코드해 둠 (재생은 즉시, 겹쳐도 끊기지 않음)
  // file 에 배열을 적으면 모두 불러와 재생할 때마다 무작위로 골라 낸다
  const decodeOne = async (file) => {
    const base = file.replace(/\.(wav|mp3|ogg)$/i, '');
    for (const ext of EXTS) {
      try {
        const res = await fetch(bust(base + ext));
        if (!res.ok) continue;
        const ctxA = getAudioCtx();
        if (!ctxA) return null;
        return await ctxA.decodeAudioData(await res.arrayBuffer());
      } catch (e) { /* 다음 확장자로 */ }
    }
    return null;
  };
  // index.html 을 파일로 바로 열면(file://) fetch 가 막혀 WebAudio 로 읽지 못한다.
  // 그때는 Audio 태그로 불러와 복제 재생한다 (조금 무겁지만 소리는 난다)
  const loadAudioEl = (file) => new Promise((resolve) => {
    if (typeof Audio === 'undefined') return resolve(null);
    const base = file.replace(/\.(wav|mp3|ogg)$/i, '');
    let tried = 0;
    const el = new Audio();
    el.preload = 'auto';
    el.addEventListener('canplaythrough', () => resolve(el), { once: true });
    el.addEventListener('error', () => {
      if (++tried < EXTS.length) { el.src = bust(base + EXTS[tried]); return; }
      resolve(null);
    });
    el.src = bust(base + EXTS[0]);
  });
  const addSound = (name, cfg) => {
    pending++;
    (async () => {
      const files = Array.isArray(cfg.file) ? cfg.file : [cfg.file];
      const buffers = (await Promise.all(files.map(decodeOne))).filter(Boolean);
      if (buffers.length) {
        SOUNDS[name] = { buffers, cfg, last: 0, prev: -1 };
        loaded += buffers.length;
        done();
        return;
      }
      const els = (await Promise.all(files.map(loadAudioEl))).filter(Boolean);
      if (els.length) {
        if (!fellBack) { fellBack = true; console.log('[소리] 파일로 직접 열어 WebAudio 를 못 씁니다 → Audio 태그로 재생합니다 (조금 끊길 수 있음)'); }
        SOUNDS[name] = { els, cfg, last: 0, prev: -1 };
        loaded += els.length;
      } else {
        missing.push(files[0].replace(/\.(wav|mp3|ogg)$/i, '') + EXTS.join('/'));
      }
      done();
    })();
  };
  // 배경음악만 Audio 태그로 (길고 반복 재생이라 스트리밍이 유리)
  const addAudio = (cfg, onReady) => {
    if (typeof Audio === 'undefined') return;
    pending++;
    const base = cfg.file.replace(/\.(wav|mp3|ogg)$/i, '');
    let tried = 0;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => { onReady(audio); loaded++; done(); }, { once: true });
    audio.addEventListener('error', () => {
      if (++tried < EXTS.length) { audio.src = bust(base + EXTS[tried]); return; }   // 다음 확장자로 재시도
      missing.push(base + EXTS.join('/'));
      done();
    });
    audio.src = bust(base + EXTS[0]);
  };
  for (const [name, cfg] of Object.entries(A.sprites || {})) addImage(name, cfg);
  for (const [name, cfg] of Object.entries(A.backgrounds || {})) addImage('bg_' + name, cfg);
  for (const [name, cfg] of Object.entries(A.tiles || {})) addImage('tile_' + name, cfg);
  for (const [name, cfg] of Object.entries(A.weapons || {})) addImage('weapon_' + name, cfg);
  for (const [name, cfg] of Object.entries(A.faces || {})) addImage('face_' + name, cfg);
  for (const [name, cfg] of Object.entries(A.bullets || {})) addImage('bullet_' + name, cfg);
  for (const [name, cfg] of Object.entries(A.pbullets || {})) addImage('pbullet_' + name, cfg);
  for (const [name, cfg] of Object.entries(A.sounds || {})) addSound(name, cfg);
  // 저장된 값이 없으면 assets.js 의 bgm.volume 을 기본값으로 쓴다
  if (A.bgm && !bgmVolumeSaved) bgmVolume = clampVol(A.bgm.volume ?? 0.4);
  if (A.bgm) addAudio(A.bgm, audio => { audio.loop = true; audio.volume = bgmVolume; bgmAudio = audio; });
})();

// 효과음 재생 (파일이 없거나 소리 끔 상태면 무시)
function playSound(name) {
  const s = SOUNDS[name];
  if (!s || muted) return;
  const now = performance.now();
  if (now - s.last < (s.cfg.gap ?? 0.03) * 1000) return;
  // 파일이 여러 개면 무작위로 고르되 직전 것은 피해 같은 소리가 반복되지 않게 함
  const list = s.buffers || s.els;
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === s.prev) i = (i + 1) % list.length;
  s.prev = i;
  if (s.els) { s.last = now; playAudioEl(s.els[i], s.cfg); return; }   // file:// 대체 경로
  if (sfxVolume <= 0) return;
  const ac = getAudioCtx();
  if (!ac) return;
  s.last = now;
  const src = ac.createBufferSource();
  src.buffer = s.buffers[i];
  const gain = ac.createGain();
  const vol = (s.cfg.volume ?? 0.5) * sfxVolume;
  const t = ac.currentTime;
  gain.gain.setValueAtTime(vol, t);
  src.connect(gain).connect(ac.destination);
  // len(초)이 있으면 그만큼만 재생하고 부드럽게 줄임 (원본이 길어서 계속 겹치는 것 방지)
  const dur = src.buffer.duration;
  const len = s.cfg.len ? Math.min(s.cfg.len, dur) : 0;
  if (len && len < dur - 0.01) {
    const fade = Math.min(0.35, len * 0.45);   // 끝음이 뚝 끊기지 않게 넉넉히 줄임
    gain.gain.setValueAtTime(vol, t + len - fade);
    gain.gain.linearRampToValueAtTime(0.0001, t + len);
    src.start(t, 0, len + 0.02);
  } else {
    src.start(t);
  }
}
// Audio 태그로 재생 (file:// 대체 경로). len 이 있으면 그만큼만 내고 줄여서 끈다
function playAudioEl(el, cfg) {
  if (sfxVolume <= 0) return;
  const a = el.cloneNode();
  const vol = (cfg.volume ?? 0.5) * sfxVolume;
  a.volume = vol;
  a.play().catch(() => {});
  if (!cfg.len) return;
  const fade = Math.min(350, cfg.len * 450);
  setTimeout(() => {
    let t = 0;
    const timer = setInterval(() => {
      t += 25;
      a.volume = Math.max(0, vol * (1 - t / fade));
      if (t >= fade) { clearInterval(timer); a.pause(); }
    }, 25);
  }, Math.max(0, cfg.len * 1000 - fade));
}

function playBgm() {
  if (!bgmAudio || muted) return;
  bgmAudio.volume = bgmVolume;
  bgmAudio.currentTime = 0;
  bgmAudio.play().catch(() => {});
}
function stopBgm() { if (bgmAudio) bgmAudio.pause(); }

// 스프라이트 그리기: 이미지가 있으면 그리고 true, 없으면 false (호출한 쪽에서 도형으로 그림)
// 판정 박스의 "하단 중앙"에 그림의 칸 하단 중앙을 맞춰서 그림
// cfg.scale = 2 면 그림이 게임 좌표의 2배 크기로 그려져 있다는 뜻 (그만큼 촘촘하게 보임)
function drawSprite(key, e, facing = 1, anim = 'idle', tint = null) {
  const s = IMAGES[key];
  if (!s) return false;
  const { img, cfg } = s;
  const sc = cfg.scale || 1;
  const fw = cfg.frameW || img.naturalWidth, fh = cfg.frameH || img.naturalHeight;
  const a = (cfg.anims && (cfg.anims[anim] || cfg.anims.idle)) || [0, 1, 1];
  let idx = a[0] + (Math.floor(frame * a[2] / 60) % a[1]);
  // 안전장치: 등록표의 칸 번호가 그림 칸 수를 넘으면 빈 칸이 그려져 캐릭터가 깜박인다
  const cells = Math.max(1, Math.floor(img.naturalWidth / fw));
  if (idx >= cells) {
    if (!s.warned) {
      console.warn(`[에셋] ${key}: anims 가 ${idx + 1}번째 칸을 가리키는데 그림은 ${cells}칸뿐입니다. assets.js 를 확인하세요.`);
      s.warned = true;
    }
    idx = cells - 1;
  }
  // 2배 그림은 게임 좌표의 0.5칸 단위까지 위치를 맞출 수 있다 (움직임이 덜 끊김)
  const snap = v => Math.round(v * sc) / sc;
  const w = fw / sc, h = fh / sc;
  ctx.save();
  ctx.translate(snap(e.x + e.w / 2), snap(e.y + e.h));
  if (facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, idx * fw, 0, fw, fh, -Math.floor(w / 2), -h, w, h);
  if (tint) {                                   // 같은 칸을 색칠한 사본으로 덮어 물들인다
    ctx.globalAlpha = 0.55;
    ctx.drawImage(tinted(img, tint), idx * fw, 0, fw, fh, -Math.floor(w / 2), -h, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  return true;
}

// ===== 입력 =====
const BIND = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  // 사격은 자동이라 키가 없다. 스킬은 Z X C (숫자키도 됨)
  skill1: ['KeyZ', 'Digit1'], skill2: ['KeyX', 'Digit2'], skill3: ['KeyC', 'Digit3'],
  start: ['Enter'], pause: ['KeyP', 'Escape'], mute: ['KeyM'],
  bgmDown: ['Minus', 'NumpadSubtract'], bgmUp: ['Equal', 'NumpadAdd'],   // BGM 볼륨
  sfxDown: ['BracketLeft'], sfxUp: ['BracketRight'],                     // 효과음 볼륨
};
const keys = {}, pressed = {};
let typed = '';                 // 이름 입력 화면에서 이번 프레임에 눌린 글자
let typedBack = false;          // 지우기(Backspace)
addEventListener('keydown', e => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  // 이름 입력 중에는 알파벳과 지우기를 따로 모은다
  if (state === 'name') {
    if (/^Key[A-Z]$/.test(e.code)) typed += e.code.slice(3);
    else if (e.code === 'Backspace') { typedBack = true; e.preventDefault(); }
  }
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
for (const [n, fn] of [['touchstart', touchStart], ['touchmove', touchMove],
                       ['touchend', touchEnd], ['touchcancel', touchEnd]]) {
  cvs.addEventListener(n, fn, { passive: false });
}
// 창이 포커스를 잃으면 자동 일시정지 (키가 눌린 채로 남는 것도 방지)
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  touch.id = null; touch.on = false; touch.dx = touch.dy = 0;
  // 휴대폰은 주소창만 건드려도 포커스가 빠져 걸핏하면 멈추므로 자동 일시정지를 걸지 않는다
  if (state === 'play' && !isTouch) state = 'pause';
});
// ===== 터치 조작 (휴대폰) =====
// 화면 아무 데나 끌면 그 방향으로 움직이고, 오른쪽 아래 버튼 세 개로 스킬을 쓴다.
// 키보드와 같이 쓸 수 있게 keys/pressed 를 그대로 건드린다.
const touch = { on: false, dx: 0, dy: 0, id: null, bx: 0, by: 0 };
let isTouch = false;            // 한 번이라도 터치가 들어오면 화면에 버튼을 띄운다

// 화면 좌표 → 게임 좌표(480x270)
function toGame(e) {
  const r = cvs.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}

// 오른쪽 아래 스킬 버튼 세 개의 위치 (그리기와 판정에 같이 씀)
const TOUCH_BTN = 34, TOUCH_GAP = 8;
function touchButtons() {
  const y = H - TOUCH_BTN - 8;
  return SQUAD_ORDER.map((type, i) => ({
    type,
    x: W - (3 - i) * (TOUCH_BTN + TOUCH_GAP) - 8 + TOUCH_GAP,
    y, w: TOUCH_BTN, h: TOUCH_BTN,
  }));
}

function touchStart(e) {
  isTouch = true;
  for (const t of e.changedTouches) {
    const g = toGame(t);
    // 스킬 버튼을 눌렀나?
    const btn = touchButtons().find(b => g.x > b.x - 6 && g.x < b.x + b.w + 6 &&
                                         g.y > b.y - 6 && g.y < b.y + b.h + 6);
    if (btn) {
      const code = BIND[SQUAD_TYPES[btn.type].key][0];
      keys[code] = true; pressed[code] = true;
      setTimeout(() => { keys[code] = false; }, 80);
      continue;
    }
    // 그 밖의 곳은 이동(끌기) 또는 화면 넘기기
    if (touch.id === null) {
      touch.id = t.identifier; touch.on = true;
      touch.bx = g.x; touch.by = g.y; touch.dx = 0; touch.dy = 0;
      if (state === 'pause') {
        // 휴대폰에는 P/Esc 가 없으므로 화면을 누르면 풀리게 한다 (안 그러면 갇힌다)
        const code = BIND.pause[0];
        keys[code] = true; pressed[code] = true;
        setTimeout(() => { keys[code] = false; }, 80);
      } else if (state !== 'play') {
        keys['Enter'] = true; pressed['Enter'] = true;
      }
    }
  }
  e.preventDefault();
}

function touchMove(e) {
  for (const t of e.changedTouches) {
    if (t.identifier !== touch.id) continue;
    const g = toGame(t);
    touch.dx = g.x - touch.bx;
    touch.dy = g.y - touch.by;
    // 기준점을 따라오게 해서 손가락을 멀리 끌지 않아도 계속 움직이게 한다
    const max = 26;
    const d = Math.hypot(touch.dx, touch.dy);
    if (d > max) {
      touch.bx += (d - max) * touch.dx / d;
      touch.by += (d - max) * touch.dy / d;
      touch.dx = g.x - touch.bx; touch.dy = g.y - touch.by;
    }
  }
  e.preventDefault();
}

function touchEnd(e) {
  for (const t of e.changedTouches) {
    if (t.identifier !== touch.id) continue;
    touch.id = null; touch.on = false; touch.dx = touch.dy = 0;
    keys['Enter'] = false;
  }
  e.preventDefault();
}

const held = a => BIND[a].some(c => keys[c]);
const tap = a => BIND[a].some(c => pressed[c]);

// ===== 유틸 =====
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pointIn = (p, r) => p.x + p.r > r.x && p.x - p.r < r.x + r.w && p.y + p.r > r.y && p.y - p.r < r.y + r.h;
function distToRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// ===== 스테이지 데이터 =====
// 공중전이라 발판은 전부 없앴다 (바닥만 그림용으로 남긴다)
const platforms = [
  { x: 0, y: GROUND_Y, w: LEVEL_END, solid: true },   // 바닥 (그림용)
];

// ===== 적 등장: 페이즈 → 웨이브 → 편대 =====
// 슈팅 게임처럼 "한 덩어리"로 몰려왔다가 잠깐 숨 돌리는 리듬을 만든다.
// x 는 카메라가 그 지점에 닿으면 등장한다는 뜻 (스테이지 끝 = ARENA_X 3220)
const SPAWNS = [];
const FLY_BAND = [40, 165];          // 공중 적이 뜨는 높이 범위

// 페이즈 안내판
const wave = (x, label) => SPAWNS.push({ x, t: 'label', label });
// 하나만. carry: true 면 이 한 마리가 파워업 아이템을 들고 나온다
const one = (x, t, y, o = {}) =>
  SPAWNS.push({ x, t, y, fire: o.fire, hold: o.hold, laneAlt: o.laneAlt, carrier: o.carry === true });
// 롤러코스터: 한 줄이 그대로 크게 오르내리며 흘러온다 (같은 궤도를 줄줄이 따라간다)
function coaster(x, t, n, o = {}) {
  const gap = o.gap ?? 22, y = o.y ?? 70, amp = o.amp ?? 38;
  for (let i = 0; i < n; i++)
    SPAWNS.push({ x: x + i * gap, t, y, amp, path: 'coaster', speed: o.speed ?? 1.9, fire: o.fire,
                  carrier: o.carry !== false && i === n - 1 });
}
// 줄줄이 한 줄로 흘러오는 편대. 맨 뒤(가장 나중에 들어오는) 기체가 파워업 아이템을 가진다
function line(x, t, n, o = {}) {
  const gap = o.gap ?? 26, y = o.y ?? 100;
  for (let i = 0; i < n; i++)
    SPAWNS.push({ x: x + i * gap, t, y, path: 'line', speed: o.speed, fire: o.fire, carrier: o.carry !== false && i === n - 1 });
}
// 원을 그리며 도는 편대 (같은 중심을 공유하고 각도만 어긋나 고리처럼 돈다)
function ring(x, t, n, o = {}) {
  const y = o.y ?? 100, r = o.r ?? 48, spin = o.spin ?? 0.045;
  for (let i = 0; i < n; i++)
    SPAWNS.push({ x: x + i * 8, t, y, path: 'circle', r, spin, ang: (i * Math.PI * 2) / n, drift: o.drift, fire: o.fire });
}
// V 자 편대
function vee(x, t, n, o = {}) {
  const y = o.y ?? 100, gap = o.gap ?? 24;
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2;
    SPAWNS.push({ x: x + Math.abs(k) * gap, y: y + k * gap, t, path: 'line', speed: o.speed, fire: o.fire, carrier: o.carry !== false && i === 0 });
  }
}
// 위아래 두 줄이 동시에 들어온다 (2탄 오프닝에서 쓰던 그 배치)
function pair(x, t, n, o = {}) {
  const gap = o.gap ?? 24, top = o.top ?? 55, bottom = o.bottom ?? 155;
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    SPAWNS.push({ x: x + i * gap, t, y: top, path: 'line', speed: o.speed, fire: o.fire, carrier: o.carry !== false && last });
    SPAWNS.push({ x: x + i * gap, t, y: bottom, path: 'line', speed: o.speed, fire: o.fire, carrier: o.carry !== false && last && !!o.both });
  }
}
// 위아래를 번갈아 밟는 지그재그
function zigzag(x, t, n, o = {}) {
  const gap = o.gap ?? 26, y = o.y ?? 100, amp = o.amp ?? 42;
  for (let i = 0; i < n; i++)
    SPAWNS.push({ x: x + i * gap, t, y: y + (i % 2 ? amp : -amp), path: 'line', speed: o.speed, fire: o.fire, carrier: o.carry !== false && i === n - 1 });
}
// 계단식으로 비스듬히 내려오거나 올라오는 줄
function stair(x, t, n, o = {}) {
  const gap = o.gap ?? 24, y = o.y ?? 60, step = o.step ?? 18;
  for (let i = 0; i < n; i++)
    SPAWNS.push({ x: x + i * gap, t, y: y + i * step, path: 'line', speed: o.speed, fire: o.fire, carrier: o.carry !== false && i === n - 1 });
}
// 세로로 한 줄 선 벽이 그대로 밀고 들어온다
function wall(x, t, n, o = {}) {
  const y0 = o.y0 ?? 45, y1 = o.y1 ?? 165;
  for (let i = 0; i < n; i++)
    SPAWNS.push({ x, t, y: y0 + (y1 - y0) * (i / (n - 1)), path: 'line', speed: o.speed, fire: o.fire, carrier: o.carry !== false && i === n - 1 });
}

// 지상 무리 (스파이더는 뛰면서 다가온다)
function rush(x, t, n, gap = 42, o = {}) {
  for (let i = 0; i < n; i++)
    SPAWNS.push({ x: x + i * gap, t, fast: !!o.fast, carrier: o.carry === true && i === n - 1 });
}

// ===== 스테이지 =====
// 각 스테이지는 자기 웨이브 스크립트와 보스 설정을 가진다
const STAGES = [
  {
    name: 'STAGE 1  —  폐허 도시',
    arena: 2920,
    bossHp: 8100,
    tint: null,
    build() {
      // 성장 동선
      //   파워 1 = 위쪽 롤러코스터 한 줄 / 파워 2 = 아래쪽 한 줄
      //   → 곧바로 중간보스 M6. 아이템 3개로 파워 3~5 (스노우화이트 합류 + 강화)
      //   중간보스 전까지는 짧게 끊고, 그 뒤부터는 쉴 틈 없이 몰아친다
      // --- WAVE 1: 위아래 롤러코스터 두 줄 → 바로 중간보스 ---
      wave(300, 'WAVE 1');
      // 열차처럼 바짝 붙어 같은 궤도를 타고 들어온다 (gap 을 좁히고 위상을 맞춤)
      coaster(320, 'm4', 6, { y: 62, amp: 34, speed: 2.2, gap: 9 });    // 아이템 1 → 홍련
      coaster(500, 'm4', 6, { y: 150, amp: 34, speed: 2.2, gap: 9 });   // 아이템 2 → 라푼젤
      one(660, 'm6', 80);                                           // 중간보스 → 아이템 3개 (파워 3~5)
      // --- WAVE 2 (35기): 수는 적어도 피하기 쉬운 탄이 자주 오도록 fire 0.8 (발사 20% 증가) ---
      wave(700, 'WAVE 2');
      pair(720, 'm4', 4, { top: 55, bottom: 160, carry: false, fire: 0.8 });
      wall(840, 'drone', 6, { carry: false, fire: 0.8 });
      zigzag(920, 'm4', 6, { y: 100, amp: 44, carry: false, fire: 0.8 });
      one(1060, 'm2h', 60, { fire: 0.8 });                          // 탱커 1
      coaster(1140, 'm4', 6, { y: 70, amp: 40, carry: false, fire: 0.8 });
      ring(1260, 'm4', 7, { y: 110, r: 48, fire: 0.8 });
      one(1320, 'm6s', 90, { fire: 0.8 });                          // 약한 중간보스 1
      // --- WAVE 3 (40기): 여기부터 지상도 섞인다 (웨이브 1~2 는 전부 비행) ---
      wave(1420, 'WAVE 3');
      one(1440, 'heavy', 0);
      coaster(1460, 'm4', 7, { y: 150, amp: 40, carry: false });
      one(1520, 'm2h', 130);                                        // 탱커 2
      wall(1580, 'drone', 6, { carry: false });
      zigzag(1640, 'm4', 8, { y: 95, amp: 50, carry: false });
      ring(1720, 'm4', 8, { y: 70, r: 46 });
      one(1800, 'm6s', 60);                                         // 약한 중간보스 2
      line(1860, 'm4', 7, { y: 110 });                              // 아이템 6
      rush(1920, 'soldier', 6);
      // --- WAVE 4 (45기) ---
      wave(2000, 'WAVE 4');
      pair(2020, 'm4', 4, { top: 50, bottom: 165, carry: false });
      one(2080, 'm5', 60);
      wall(2140, 'drone', 5, { carry: false });
      coaster(2200, 'm4', 7, { y: 80, amp: 46, carry: false });
      one(2260, 'm2h', 150);                                        // 탱커 3
      one(2300, 'heavy', 0);
      stair(2340, 'm4', 4, { y: 170, step: -20, carry: false });
      zigzag(2400, 'm4', 7, { y: 100, amp: 52, carry: false });
      one(2440, 'm6s', 150);                                        // 약한 중간보스 3
      one(2480, 'mid');
      ring(2520, 'm4', 4, { y: 100, r: 52 });
      // --- WAVE 5: 보스 직전, 중간보스형 두 마리만 (각자 파워업을 들고 나온다) ---
      wave(2580, 'WAVE 5');
      // 같은 x 에 위아래로 배치해 "중간보스 2" 한 세트처럼 보이게 한다.
      // hold = 지나쳐 버리지 않고 자리를 잡고 싸운다, laneAlt = 3초마다 바꿔 설 높이
      one(2680, 'm6s', 62, { carry: true, hold: true, laneAlt: 148 });   // 아이템 7
      one(2680, 'm6s', 148, { carry: true, hold: true, laneAlt: 62 });   // 아이템 8 → 최대
    },
  },
  {
    name: 'STAGE 2  —  야간 침공',
    arena: 3600,
    bossHp: 11700,
    tint: 'rgba(24,26,72,0.42)',        // 밤 느낌의 푸른 막
    build() {
      // --- WAVE 1: 위아래 두 줄이 연달아 세 번 ---
      wave(300, 'WAVE 1');
      pair(320, 'm4', 5, { top: 55, bottom: 160 });
      pair(520, 'm4', 5, { top: 70, bottom: 145 });
      pair(720, 'm4', 5, { top: 85, bottom: 130 });
      rush(880, 'soldier', 6, 42, { carry: true });
      // --- WAVE 2: 계단 + 벽 + 지상 압박 ---
      wave(1100, 'WAVE 2');
      stair(1120, 'm4', 7, { y: 40, step: 20 });
      stair(1320, 'm4', 7, { y: 170, step: -20 });
      wall(1500, 'drone', 6);
      one(1540, 'mid');
      rush(1580, 'soldier', 8);
      one(1700, 'heavy', 0);
      // --- WAVE 3: 두 겹 고리와 대형 비행 ---
      wave(1850, 'WAVE 3');
      ring(1870, 'm4', 7, { y: 80, r: 52 });
      ring(1930, 'm4', 7, { y: 150, r: 52, spin: -0.05 });
      one(2040, 'm5', 40);
      one(2140, 'm5', 130);
      rush(2220, 'soldier', 8);
      // --- WAVE 4: 장갑 벽 사이로 지그재그 ---
      wave(2450, 'WAVE 4');
      one(2470, 'heavy', 0);
      one(2550, 'heavy', 0);
      one(2630, 'heavy', 0);
      zigzag(2500, 'm4', 8, { y: 100, amp: 50 });
      wall(2720, 'drone', 6);
      // --- WAVE 5: 총력전 ---
      wave(2950, 'WAVE 5');
      one(2970, 'm5', 55);
      one(3060, 'm5', 125);
      pair(3000, 'm4', 6, { top: 45, bottom: 170 });
      one(3120, 'mid');
      one(3200, 'mid');
      rush(3240, 'soldier', 12);
      ring(3320, 'm4', 8, { y: 100, r: 54 });
      vee(3460, 'm4', 9, { y: 100 });
    },
  },
];

// 스테이지 번호(1부터)를 받아 등장표를 새로 만든다
const LEAD_IN = 300;               // 시작하자마자 적과 마주치지 않도록 두는 도입 구간
                                   // 400 은 빈 화면이 6초 넘게 이어져 길었고,
                                   // 200 은 시작하자마자 적이 코앞이라 300 으로 잡았다 (약 3.6초)

function buildStage(n) {
  const st = STAGES[n - 1];
  SPAWNS.length = 0;
  st.build();
  for (const sp of SPAWNS) sp.x += LEAD_IN;     // 전부 뒤로 밀어 숨 돌릴 틈을 만든다
  ARENA_X = st.arena + LEAD_IN;
  SPAWNS.sort((a, b) => a.x - b.x);
  return st;
}

// 배경 건물 (고정 시드로 매번 같은 모양)
const bgFar = [], bgNear = [];
let bgX = 0;                        // 배경 전용 스크롤 거리 (camX 와 별개로 계속 늘어난다)
(() => {
  const r = seeded(7);
  // 배경이 빨리 흐르는 만큼 더 멀리까지 깔아 둬야 끝에서 비지 않는다
  for (let x = 0; x < LEVEL_END * 0.55 + W; x += 30 + r() * 40) bgFar.push({ x, w: 20 + r() * 40, h: 40 + r() * 90 });
  for (let x = 0; x < LEVEL_END * 0.9 + W; x += 50 + r() * 60) bgNear.push({ x, w: 30 + r() * 50, h: 30 + r() * 70, cut: r() * 20 });
})();
const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
skyGrad.addColorStop(0, '#3b2a3a');
skyGrad.addColorStop(0.6, '#b8653b');
skyGrad.addColorStop(1, '#e0a15a');

// ===== 게임 상태 =====
let state = 'title', frame = 0;
// 랭킹: 이름 입력 → 순위표
let entryName = '', entryBusy = false, entryMsg = '';
let rankRows = null, rankMine = 0, rankOffline = false;
let camX, shake, score, lives, msg, graze;
let plv, items;   // plv = 파워 단계 (아이템으로 오름), items = 파워업 아이템
let playTime = 0;          // 플레이한 프레임 수 (클리어 시간 보너스 계산용)
let result = null;         // 클리어 결과 내역 (기본 점수 · 시간 · 목숨 보너스)

// 클리어 보너스 기준
const PAR_TIME = 210;      // 기준 시간(초). 이보다 빨리 깬 만큼 점수를 준다
const TIME_RATE = 200;     // 1초 단축당 점수
const LIFE_BONUS = 5000;   // 남은 목숨 1개당 점수
let player, enemies, pBullets, eBullets, particles, warns;
let allies, squadFire;
let zones, beams, clones, squadBuff;   // clones = 홍련 궁극기의 거대 분신
let shields;     // 이번 프레임 검술병 칼 판정 목록
let bladeSpin;   // 칼이 도는 각도
// 병과별 레벨 (분대는 항상 3명이라 같은 값이지만, 죽거나 빠질 때를 대비해 개별로 본다)
const lvOf = t => { const a = allies.find(o => o.type === t); return a ? a.level : 0; };
let boss, bossWarn, spawnIdx, clearTimer;
let miniHold = 0;      // 중간보스를 잡은 뒤 웨이브를 다시 시작하기까지 남은 프레임
let finaleTimer = 0;   // 마지막 웨이브를 정리한 뒤 보스가 나오기까지 센 프레임
// 연출 타이밍 (프레임)
const MINI_HOLD = 120;     // 중간보스 처치 → 2초 뒤 다음 웨이브
const FINALE_WARN = 120;   // 마지막 웨이브 정리 → 2초 뒤 경고 (그 동안 보상을 줍는다)
const FINALE_BOSS = 240;   // 마지막 웨이브 정리 → 4초 뒤 보스 등장
const FINALE_RUSH = 10;    // 경고가 뜬 뒤 화면이 보스장까지 밀려가는 속도 배수
let stage, stageInfo;              // 현재 스테이지 번호(1부터)와 설정
let popup;                         // 화면 가운데 알림 (보스 처치 등)

function newPlayer(x = 40, y = GROUND_Y - 34) {
  return {
    x, y, w: 16, h: 34, vx: 0, vy: 0, onGround: false, facing: 1,
    crouch: false, aimX: 1, aimY: 0, cool: 0,
    invuln: 90, aegis: 0, hurtFlash: 0, dead: false, respawn: 0, dropTimer: 0,
    hp: BASE_HP, maxHp: BASE_HP,
  };
}

function resetGame() {
  score = 0; lives = 3; playTime = 0; result = null;
  plv = 0; graze = 0;
  player = newPlayer();
  // 처음에는 혼자. 파워업 1~3단계에서 홍련 → 라푼젤 → 스노우화이트 순으로 합류한다
  allies = [];
  startStage(1);
}

// 스테이지 시작 (점수·레벨·동료는 그대로 이어진다)
function startStage(n) {
  stage = n;
  stageInfo = buildStage(n);
  camX = 0; bgX = 0; shake = 0; msg = null; popup = null;
  player = newPlayer(140, (FLY_TOP + FLY_BOTTOM) / 2 - 17);   // 화면 왼쪽 구석이 아니라 조금 앞
  player.invuln = 120;
  enemies = []; pBullets = []; eBullets = []; particles = []; warns = []; items = [];
  boss = null; bossWarn = 0; spawnIdx = 0; clearTimer = 0;
  miniHold = 0; finaleTimer = 0;
  squadFire = 0;
  zones = []; beams = []; clones = []; shields = []; bladeSpin = 0;
  squadBuff = { speed: 1, range: 1 };
  for (const a of allies) { a.skillCool = 0; a.x = player.x; a.y = player.y; }
  playSound('clear');
}

function makeEnemy(t, x, y, a) {
  const d = {
    // --- 지상 ---
    // 체력은 "일반 사격만으로는 오래 걸리고, 스킬을 쓰면 확 줄어드는" 선으로 잡았다
    soldier: { w: 24, h: 32, hp: 4, score: 100 },               // M1 소형 스파이더: 바닥에서 뛰어서 접근
    // 장갑형: M1 그림을 1.3배로 키워 쓴다. 지상에서 버티며 3발 부채꼴로 쏜다
    heavy:   { w: 32, h: 40, hp: 100, score: 600, sprite: 'soldier', scale: 1.3 },
    mid:     { w: 44, h: 46, hp: 160, score: 1500 },            // M3 중형
    // --- 공중 ---
    drone:   { w: 28, h: 22, hp: 6, score: 150 },               // M2 드론: 약하지만 빠르게 파고듦
    m4:      { w: 18, h: 44, hp: 11, score: 200, sprite: 'flyer_s' },   // M4 소형 비행 (그림 2배)
    m5:      { w: 48, h: 88, hp: 140, score: 1400, sprite: 'flyer_l' }, // M5 대형 비행 (그림 3배) — 공중 거점
    // 중형 비행(탱커): M2 그림을 키워 쓴다. 쉽게 안 죽어서 스킬을 쓰게 만드는 역할
    m2h:     { w: 46, h: 36, hp: 110, score: 900, sprite: 'drone', scale: 1.6 },
    // M6 중간보스: 잡으면 파워업 아이템 3개. 스테이지 한가운데의 성장 분기점
    m6:      { w: 66, h: 84, hp: 460, score: 8000, sprite: 'mini', mini: true },
    // 약한 중간보스: M6 그림을 줄여 쓴다. 스테이지를 멈추지 않고 잡몹 사이에 끼어들어
    // "여기서 궁 한 번 써야겠다" 싶게 만드는 역할
    m6s:     { w: 48, h: 62, hp: 110, score: 4000, sprite: 'mini', scale: 0.72 },
  }[t];
  // 동료가 다 모이기 전까지는 계단식으로 완화하고, 그 뒤부터는 30% 상향
  const band = x < SOLO_END ? 0 : x < EASY_END ? 1 : 2;
  const first = band < 2;
  // 0.35 는 한 대에 터져서 무슨 편대인지 보이지도 않았다 → 0.7 로 올림
  // 구간별 난이도. 초반 두 구간은 "화면을 지나가기 전에 다 잡을 수 있는" 선으로 맞췄다.
  // (탄 1~2줄로도 열차 한 줄을 정리할 수 있어야 파워업을 놓치지 않는다)
  // 긴장감은 체력이 아니라 사격 빈도(rate)로 준다
  // 마지막 구간(중간보스 처치 ~ 보스전 직전)은 10% 너프: 1.7 -> 1.53
  const wave = [0.45, 0.8, 1.53][band];
  // 여기에 더해 스테이지 뒤로 갈수록 단단해진다 (마지막 구간 1.8배). 보급 상자는 그대로
  // 지상 유닛은 공중전의 곁가지라 체력을 40% 깎는다 (위협은 공중이 맡는다)
  const tough = (1 + Math.min(1, x / LEVEL_END) * 0.8) * wave * ENEMY_HP
              * (GROUND_TYPES.has(t) ? GROUND_HP : 1);
  const hp = Math.max(1, Math.round(d.hp * tough));
  const e = {
    t, x, vx: 0, vy: 0, ...d, hp, maxHp: hp,
    // 발사 간격 배율 (혼자일 때는 훨씬 덜 쏨). 지상 유닛은 여기에 더해 1.5배 더 느긋하게
    rate: [1.15, 0.8, 0.55][band] * (GROUND_TYPES.has(t) ? GROUND_RATE : 1),
    timer: rand(18, 45) * (first ? 2 : 1),   // 금방 터져도 한두 발은 쏘고 가게
    phase: rand(0, Math.PI * 2),   // 위아래 물결의 시작 위상 (같은 줄로 몰려오지 않게)
    facing: -1, flash: 0, dead: false, onGround: false, age: 0, freed: false, ally: a, slashCool: 0,
  };
  // 지상 유닛(M1 스파이더·장갑형·M3 중형)은 바닥에서, 나머지는 공중에서 등장한다
  e.ground = t === 'soldier' || t === 'heavy' || t === 'mid';   // 나머지는 전부 공중
  if (t === 'soldier') { e.vy = 0; e.hop = rand(10, 40); e.air = false; }
  e.fast = false;
  // 중간보스형이 위아래로 쌍을 이뤄 나올 때, 아래쪽은 반 주기 늦게 쏴서 번갈아 보이게 한다
  if (t === 'm6s') e.cyclePhase = (y ?? 100) > (FLY_TOP + FLY_BOTTOM) / 2 ? 90 : 0;
  e.y = e.ground ? GROUND_Y - d.h
                 : clamp(y ?? rand(FLY_TOP + 10, FLY_BOTTOM - d.h - 10), FLY_TOP, FLY_BOTTOM - d.h);
  e.baseY = e.y;
  return e;
}

// ===== 물리 =====

// 중력 + 발판 착지 (발판은 위에서만 착지 가능)
function moveBody(b) {
  const prevBottom = b.y + b.h;
  b.vy = Math.min(b.vy + GRAV, MAX_FALL);
  b.x += b.vx;
  b.y += b.vy;
  b.onGround = false;
  if (b.vy < 0) return;
  for (const p of platforms) {
    if (!p.solid && b.dropTimer > 0) continue;
    if (b.x + b.w > p.x && b.x < p.x + p.w && prevBottom <= p.y + 0.01 && b.y + b.h >= p.y) {
      b.y = p.y - b.h; b.vy = 0; b.onGround = true;
      return;
    }
  }
}

function standingPlatform(b) {
  if (!b.onGround) return null;
  return platforms.find(p => Math.abs(b.y + b.h - p.y) < 0.5 && b.x + b.w > p.x && b.x < p.x + p.w);
}

// ===== 이펙트 =====
function burst(x, y, n, colors = ['#ffd23f', '#ff8c1a', '#ff4b1a', '#777']) {
  for (let i = 0; i < n; i++) {
    particles.push({ x, y, vx: rand(-2.5, 2.5), vy: rand(-3, 1), life: rand(15, 35),
      size: rand(2, 5), color: colors[i % colors.length], grav: 0.08 });
  }
}
function sparks(x, y, color = '#ffe066') {
  for (let i = 0; i < 4; i++) {
    particles.push({ x, y, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), life: 8, size: 2, color, grav: 0 });
  }
}
// quiet = 화면을 흔들지 않는다 (스노우화이트 폭탄 비처럼 연달아 터질 때)
function explosionAt(x, y, rad, dmg, quiet = false) {
  burst(x, y, 18);
  playSound('explosion');
  if (!quiet) shake = Math.max(shake, 6);
  for (const e of enemies) if (!e.dead && distToRect(x, y, e) < rad) damageEnemy(e, dmg);
  if (boss && !boss.dead && distToRect(x, y, boss) < rad) damageBoss(dmg);
}
// 클리어 정산: 기본 점수에 시간 보너스와 남은 목숨 보너스를 더한다
function finishRun() {
  const secs = playTime / 60;
  const saved = Math.max(0, PAR_TIME - secs);          // 기준 시간보다 빠른 만큼
  const timeBonus = Math.round(saved) * TIME_RATE;
  const lifeBonus = Math.max(0, lives) * LIFE_BONUS;
  result = { base: score, secs, timeBonus, lifeBonus, total: score + timeBonus + lifeBonus };
  score = result.total;
  state = 'clear';
  stopBgm();
  playSound('clear');
}

// 휴대폰에는 물리 키보드가 없으므로 보이지 않는 입력칸을 띄워 운영체제 키보드를 부른다
let mobileInput = null;
function openMobileKeyboard() {
  if (mobileInput) return;
  const el = document.createElement('input');
  el.type = 'text';
  el.maxLength = RANK.NAME_MAX;
  el.autocapitalize = 'characters';
  el.autocomplete = 'off';
  el.setAttribute('autocorrect', 'off');
  el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:42%;' +
    'width:70%;max-width:340px;font-size:20px;text-align:center;letter-spacing:3px;' +
    'padding:10px;border:2px solid #ffe066;border-radius:8px;background:#14151a;color:#fff;' +
    'font-family:monospace;z-index:10;outline:none';
  el.value = entryName;
  el.addEventListener('input', () => {
    entryName = RANK.clean(el.value);
    el.value = entryName;
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); closeMobileKeyboard(); sendScore(); }
  });
  document.body.appendChild(el);
  mobileInput = el;
  setTimeout(() => el.focus(), 60);
}
function closeMobileKeyboard() {
  if (!mobileInput) return;
  mobileInput.remove();
  mobileInput = null;
}

// 이름을 확정하고 랭킹 서버로 보낸다 (실패해도 게임이 멈추지 않게 한다)
function sendScore() {
  closeMobileKeyboard();
  entryBusy = true;
  entryMsg = '기록하는 중...';
  const secs = playTime / 60;
  RANK.submit(entryName, score, secs)
    .then(r => {
      rankRows = r.rows || [];
      rankMine = r.rank || 0;
      rankOffline = !!r.offline;
      state = 'rank';
      playSound('clear');
    })
    .catch(err => {
      // 서버가 안 되면 이 브라우저 기록만이라도 보여 준다
      entryMsg = String(err.message || err);
      RANK.top().then(r => {
        rankRows = r.rows || [];
        rankOffline = true;
        state = 'rank';
      }).catch(() => { rankRows = []; rankOffline = true; state = 'rank'; });
    })
    .finally(() => { entryBusy = false; });
}

// 초 → "2:34" 꼴
const mmss = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function showMsg(text) { msg = { text, timer: 90 }; }

// ===== 전투 판정 =====
// 슈팅 게임답게 피격 판정은 몸 한가운데 작은 코어만 (16x34 그림 → 6x8)
function hitbox(p) { return { x: p.x + 5, y: p.y + 13, w: 6, h: 8 }; }
const coreX = p => p.x + 8, coreY = p => p.y + 17;

// 도는 칼에 닿았는지 (칼 한 자루는 작은 원으로 판정)
const bladeHit = (s, x, y) => Math.hypot(s.x - x, s.y - y) < s.r;

// 플레이어는 HP 2칸 = 총탄 2번까지 버틴다 (힐러가 시간이 지나면 채워 줌)
function hurtPlayer() {
  const p = player;
  if (p.dead || p.invuln > 0) return;
  if (--p.hp > 0) {
    p.invuln = 60; p.hurtFlash = 24; shake = 5;      // hurtFlash 동안 몸이 붉게 번쩍인다
    burst(p.x + p.w / 2, p.y + p.h / 2, 12, ['#ff7070', '#ffffff']);
    showMsg(`HP ${p.hp}/${p.maxHp}`);
    playSound('player_hit');
    return;
  }
  p.dead = true; p.respawn = 80; lives--;
  playSound('player_die');
  burst(p.x + p.w / 2, p.y + p.h / 2, 24, ['#fff', '#ffd23f', '#5a7d4a']);
  shake = 8;
}

function damageEnemy(e, dmg) {
  if (e.dead) return;
  if (e.slow > 0) dmg = Math.ceil(dmg * 1.5);   // 포격 구역 안이면 받는 피해 +50%
  e.hp -= dmg; e.flash = 4;
  playSound('hit');
  if (e.hp <= 0) {
    e.dead = true;
    score += e.score;
    playSound('enemy_die');
    burst(e.x + e.w / 2, e.y + e.h / 2, e.t === 'mid' ? 28 : 12);
    if (e.t === 'mid') shake = Math.max(shake, 5);
    if (e.mini) {                                // 중간보스는 파워업을 3개 뱉는다
      for (let i = 0; i < 3; i++) dropPower(e.x + e.w / 2 + (i - 1) * 26, e.y + e.h / 2);
      shake = Math.max(shake, 8);
      burst(e.x + e.w / 2, e.y + e.h / 2, 30, ['#ffe066', '#ffffff', '#ff9f1c']);
    } else if (e.carrier) dropPower(e.x + e.w / 2, e.y + e.h / 2);
  }
}

// 파워업 아이템을 떨어뜨린다 (붉은 기체와 보급 상자)
function dropPower(x, y) {
  items.push({ x: x - 7, y: y - 7, w: 14, h: 14, vx: -0.5, phase: rand(0, 6.3), life: 900 });
  sparks(x, y, '#ffd23f');
}

// 아이템을 먹으면 한 단계 강해진다 (화면은 멈추지 않는다)
function powerUp() {
  if (plv >= MAX_POWER) { score += 2000; showMsg('POWER MAX · SCORE +2000'); playSound('item'); return; }
  plv++;
  // 이미 있는 동료를 먼저 키우고, 그 다음에 새 동료를 1레벨로 합류시킨다
  for (const a of allies) if (a.level < MAX_LEVEL) a.level++;
  const join = SQUAD_ORDER[plv - 1];
  if (join && !allies.some(a => a.type === join)) {
    allies.push(makeAlly(join, player.x, player.y + player.h));
  }
  playSound('rescue');
  showMsg(join ? `${SQUAD_TYPES[join].name} 합류!  ${KEY_LABEL[join]} 키 스킬 해금`
        : `POWER UP!  스킬 피해 +${Math.round((skillMul() - 1) * 100)}% · 쿨 -${Math.round((1 - skillCut()) * 100)}%`);
  burst(player.x + player.w / 2, player.y + player.h / 2, 18, ['#ffe066', '#ffffff']);
}

function updateItems() {
  for (const it of items) {
    it.x += it.vx;
    it.y += Math.sin((frame + it.phase * 10) * 0.08) * 0.6;
    if (--it.life <= 0 || it.x + it.w < camX - 20) { it.dead = true; continue; }
    // 넉넉하게 판정 (도트 슈팅답게 빨아들이듯)
    if (!player.dead && Math.hypot(it.x + 7 - coreX(player), it.y + 7 - coreY(player)) < 52) {
      it.dead = true;
      score += 500;
      powerUp();
    }
  }
  items = items.filter(it => !it.dead);
}

// 동료는 무적 (피격 판정 없음) — 인원이 늘어도 맞는 면적이 커지지 않게
function makeAlly(type, x, bottom) {
  return { type, x, y: bottom - 34, w: 16, h: 34, cool: 20, facing: 1, level: 1,
           slashCool: 0, skillCool: 0 };   // skillCool = 액티브 스킬 남은 쿨타임(프레임)
}

function damageBoss(dmg) {
  const b = boss;
  if (b.dead || b.state === 'intro') return;
  if (b.slow > 0) dmg = Math.ceil(dmg * 1.5);   // 포격 구역 안이면 받는 피해 +50%
  b.hp -= dmg; b.flash = 3;
  if (b.hp <= 0) {
    b.hp = 0; b.dead = true; b.deathTimer = 110;
    score += 20000;
    eBullets = []; warns = []; beams = []; zones = [];
    clearTimer = 260;
    player.invuln = 9999;
  }
}

function eShoot(x, y, vx, vy, opt = {}) {
  playSound('enemy_shoot');
  eBullets.push({
    x, y, vx, vy, r: opt.r || 2, grav: opt.grav || 0,
    color: opt.color || '#ff5a3c', big: !!opt.big,
    // split = 터질 때 갈라져 나올 작은 탄 수, fuse = 터지기까지 남은 프레임
    split: opt.split || 0, fuse: opt.fuse || 0, splitSpeed: opt.splitSpeed || 2.4,
  });
}

// 분열탄이 터진다: 그 자리에서 사방으로 작은 탄을 흩뿌린다
function splitBullet(b) {
  burst(b.x, b.y, 10, ['#ff9f1c', '#ffd23f']);
  playSound('explosion');
  const base = Math.atan2(b.vy, b.vx);
  for (let i = 0; i < b.split; i++) {
    const ang = base + (i * Math.PI * 2) / b.split;
    eBullets.push({
      x: b.x, y: b.y,
      vx: Math.cos(ang) * b.splitSpeed, vy: Math.sin(ang) * b.splitSpeed,
      r: 3, grav: 0, color: '#ffd23f', big: false, split: 0, fuse: 0,
    });
  }
}

// 여러 발을 부채꼴로 흩뿌려 쏜다
function eFan(x, y, speed, count, spread, opt = {}) {
  const base = Math.atan2(player.y + player.h / 2 - y, player.x + player.w / 2 - x);
  for (let i = 0; i < count; i++) {
    const ang = base + (i - (count - 1) / 2) * spread;
    eShoot(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, opt);
  }
}

function aimAt(x, y, speed) {
  const a = Math.atan2(player.y + player.h / 2 - y, player.x + player.w / 2 - x);
  return [Math.cos(a) * speed, Math.sin(a) * speed];
}

// ===== 업데이트 =====
function update() {
  frame++;
  // M: 소리 켜기/끄기 (어느 화면에서나)
  // 볼륨 조절 (어느 화면에서나)
  if (tap('bgmDown')) setBgmVolume(bgmVolume - 0.1);
  if (tap('bgmUp')) setBgmVolume(bgmVolume + 0.1);
  if (tap('sfxDown')) setSfxVolume(sfxVolume - 0.1);
  if (tap('sfxUp')) setSfxVolume(sfxVolume + 0.1);
  if (tap('mute')) {
    muted = !muted;
    if (muted) stopBgm(); else if (bgmAudio && state !== 'title') bgmAudio.play().catch(() => {});
    showMsg(muted ? '소리 끔 (M)' : '소리 켬 (M)');
  }
  // 일시정지 토글
  if (popup) {                      // 알림이 떠 있는 동안은 멈춘다
    popup.t++;
    if (popup.t > 24 && (tap('start') || tap('pause'))) { popup = null; playSound('confirm'); }
    return;
  }
  // 이름 입력 화면
  if (state === 'name') {
    if (isTouch) openMobileKeyboard();
    if (typed) {
      entryName = (entryName + typed).slice(0, RANK.NAME_MAX);
      typed = '';
      playSound('select');
    }
    if (typedBack) {
      typedBack = false;
      if (entryName) { entryName = entryName.slice(0, -1); playSound('select'); }
    }
    if (!entryBusy && tap('start')) sendScore();
    return;
  }
  // 순위표 화면
  if (state === 'rank') {
    if (tap('start')) { state = 'title'; playSound('confirm'); }
    return;
  }
  if (state === 'pause') { if (tap('pause')) state = 'play'; return; }
  if (state === 'play' && tap('pause')) { state = 'pause'; return; }
  if (state !== 'play') {
    // 결과 화면에서 Enter 를 누르면 이름을 받아 랭킹에 올린다
    if ((state === 'over' || state === 'clear') && tap('start')) {
      entryName = ''; entryBusy = false; entryMsg = '';
      state = 'name';
      playSound('confirm');
      return;
    }
    if (tap('start')) { resetGame(); state = 'play'; playBgm(); }   // 브라우저는 키 입력 후에만 소리 재생 허용
    return;
  }
  playTime++;                       // 클리어 시간 보너스용
  bgX += BG_SPEED;                  // 배경은 무슨 일이 있어도 계속 뒤로 흐른다
  spawnEnemies();
  updatePlayer();
  updateCamera();
  updateAllies();
  updateEnemies();
  updateBoss();
  updateBeams();
  updateBullets();
  updateItems();
  updateParticles();
  updateWarns();
  shake *= 0.85;
  if (msg && --msg.timer <= 0) msg = null;
  // 보스가 터지고 잠시 뒤 마음 파편 알림
  if (clearTimer === 150 && !popup) {
    popup = {
      title: '마음 파편 획득',
      lines: [`도로시의 잃어버린 마음 파편 ${stage}을 얻었다.`, '도로시의 침식을 해결할 수 있을 것 같다.'],
      t: 0,
    };
    playSound('clear');
  }
  if (clearTimer > 0 && --clearTimer === 0) {
    if (stage < LAST_STAGE) startStage(stage + 1);       // 다음 스테이지로 이어짐
    else { finishRun(); }
  }
}

function spawnEnemies() {
  while (spawnIdx < SPAWNS.length && SPAWNS[spawnIdx].x < camX + W + 20) {
    const s = SPAWNS[spawnIdx++];
    if (s.t === 'label') continue;               // 페이즈 구분만 하고 화면에는 띄우지 않는다
    const e = makeEnemy(s.t, s.x, s.y, s.a);
    if (s.carrier) { e.carrier = true; e.hp = e.maxHp = Math.round(e.maxHp * 1.6); }   // 아이템 보유 기체는 조금 단단
    if (s.fast) e.fast = true;                   // 성큼성큼 달려드는 지상 무리
    if (s.fire) e.rate *= s.fire;                // 편대별 발사 빈도 (작을수록 자주 쏨)
    if (s.hold) { e.hold = true; e.lane = e.baseY; e.laneAlt = s.laneAlt; }   // 자리를 잡고 버틴다
    if (s.path) {                                // 편대 비행 정보
      e.path = s.path;
      e.speed = s.speed ?? 1.2;
      e.r = s.r ?? 0; e.spin = s.spin ?? 0; e.ang = s.ang ?? 0; e.amp = s.amp ?? 0;
      // 열차처럼 앞 기체가 지나간 길을 그대로 따라가도록 물결 위상을 0 으로 맞춘다
      if (s.path === 'coaster') e.phase = 0;
      e.cx = s.x; e.cy = e.y;
      e.drift = s.drift ?? SCROLL + 0.25;        // 고리가 화면에 잠깐 머물도록 천천히 흐름
    }
    enemies.push(e);
  }
}

function updatePlayer() {
  const p = player;
  if (p.dead) {
    if (--p.respawn <= 0) {
      if (lives <= 0) { state = 'over'; stopBgm(); playSound('gameover'); return; }
      player = newPlayer(camX + 140, (FLY_TOP + FLY_BOTTOM) / 2 - 17);
      player.invuln = 150;
    }
    return;
  }

  const L = held('left'), R = held('right'), U = held('up'), D = held('down');
  let dir = (R ? 1 : 0) - (L ? 1 : 0);
  let vdir = (D ? 1 : 0) - (U ? 1 : 0);

  // 비행: 8방향 자유 이동 (대각선은 속도를 맞춰 줄임)
  const sp = FLY_SPEED * squadBuff.speed * (dir && vdir ? 0.75 : 1);
  p.vx = dir * sp;
  p.vy = vdir * sp;
  // 터치로 끌고 있으면 그쪽으로 (끈 거리에 비례해 속도가 붙는다)
  if (touch.on) {
    const d = Math.hypot(touch.dx, touch.dy);
    if (d > 2) {
      const k = Math.min(1, d / 22) * FLY_SPEED * squadBuff.speed;
      p.vx = touch.dx / d * k;
      p.vy = touch.dy / d * k;
    } else { p.vx = 0; p.vy = 0; }
  }
  p.facing = 1;               // 슈팅이라 언제나 오른쪽을 본다
  p.x += p.vx;
  p.y += p.vy;
  p.onGround = false;
  p.x = clamp(p.x, camX + 4, camX + W - p.w - 4);
  p.y = clamp(p.y, FLY_TOP, FLY_BOTTOM - p.h);
  // 보스를 통과해 뒤로 넘어가지 못하게 막음
  if (boss && !boss.dead) p.x = Math.max(camX, Math.min(p.x, boss.x - p.w + 6));

  // 사격은 언제나 정면(오른쪽). 각도는 동료들이 맡는다
  p.aimX = 1; p.aimY = 0;

  // 사격은 자동 (플레이어와 동료 모두 계속 쏜다)
  p.cool--;
  if (p.cool <= 0) { fire(); p.cool = 6; }
  squadFire = 15;

  if (p.invuln > 0) p.invuln--;
  if (p.hurtFlash > 0) p.hurtFlash--;
  if (p.aegis > 0) p.aegis--;   // 성역(무적) 연출 남은 시간
}

// 파워 1~3 은 탄 줄 수를 올리고, 그 위는 궁극기 쪽으로 간다
const shotLines = () => Math.min(3, plv + 1);      // 파워 0 = 1줄, 3단계부터 3줄 고정
const powerBonus = () => Math.max(0, plv - 3);                 // 4단계부터 쌓이는 보너스
const skillMul = () => 1 + powerBonus() * 0.09;                // 스킬 피해 배율 (최대 +45%)
const skillCut = () => 1 - Math.min(0.35, powerBonus() * 0.07); // 스킬 쿨타임 감소 (최대 -35%)

function fire() {
  const p = player, sp = 7;
  const len = Math.hypot(p.aimX, p.aimY);
  const dx = p.aimX / len, dy = p.aimY / len;
  // 어깨 위치에서 조준 방향으로 총구까지
  const x = p.x + p.w / 2 + dx * 17, y = p.y + 14 + dy * 17;
  const n = shotLines(), gap = 7;                  // 레벨이 오를수록 줄 수만 늘어난다 (부채꼴 없음)
  // 조준 방향과 직각인 쪽으로 줄을 벌려 서로 평행하게 날아가게 한다
  const ox = -dy * gap, oy = dx * gap;
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2;
    pBullets.push({ x: x + ox * k, y: y + oy * k, vx: dx * sp, vy: dy * sp,
                    r: 2 * squadBuff.range, dmg: 1 });
  }
  playSound('shoot');
  sparks(x, y, '#fff3b0');
}

// ===== 동료 =====
function updateAllies() {
  const p = player;
  if (squadFire > 0) squadFire--;

  // 힐러 패시브: 분대 이동속도·공격 범위 버프 (자동 회복은 없앴다)
  const hLv = lvOf('healer');
  squadBuff = { speed: hLv ? LV.speed(hLv) : 1, range: hLv ? LV.range(hLv) : 1 };
  p.maxHp = BASE_HP;

  // 액티브 스킬: 쿨타임을 돌리고, 키를 누르면 사용
  for (const a of allies) {
    if (a.skillCool > 0) a.skillCool--;
    if (!p.dead && a.skillCool <= 0 && tap(SQUAD_TYPES[a.type].key)) castSkill(a);
  }
  updateZones();
  updateClones();

  const len = Math.hypot(p.aimX, p.aimY);
  const dx = p.aimX / len, dy = p.aimY / len;
  shields = [];

  // 검술병 패시브: 플레이어 주위를 도는 수호검 (탄을 막고 닿은 적을 벤다)
  const sLv = lvOf('sword');
  if (sLv && !p.dead) {
    const blades = LV.blades(sLv);
    const slash = true;                      // 이제 언제나 적을 벤다
    const slashDmg = LV.bladeDmg(sLv);
    const radius = LV.bladeR(sLv);
    bladeSpin -= 0.055;   // 반시계 방향으로 돎
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (let i = 0; i < blades; i++) {
      const ang = bladeSpin + (i * Math.PI * 2) / blades;
      shields.push({ x: cx + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius,
                     r: 9, ang, slash, cx, cy, r2: radius });   // cx·cy·r2 는 잔상을 그릴 때 씀
    }
    // 참격형: 칼에 닿은 적을 벤다 (같은 적을 계속 때리지 않도록 잠깐 쉼)
    if (slash) {
      for (const e of enemies) {
        if (e.dead) continue;
        if (e.slashCool > 0) { e.slashCool--; continue; }
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2, reach = Math.min(e.w, e.h) / 2;
        if (shields.some(s => s.slash && Math.hypot(s.x - ex, s.y - ey) < s.r + reach)) {
          damageEnemy(e, slashDmg);
          sparks(ex, ey, '#dfe8f2');
          e.slashCool = 24;
        }
      }
      if (boss && !boss.dead && !(boss.slashCool > 0)) {
        const bx = clamp(p.x, boss.x, boss.x + boss.w), by = clamp(p.y, boss.y, boss.y + boss.h);
        if (shields.some(s => s.slash && Math.hypot(s.x - bx, s.y - by) < s.r + 4)) {
          damageBoss(slashDmg);
          boss.slashCool = 24;
        }
      }
    }
    if (boss && boss.slashCool > 0) boss.slashCool--;
  }
  for (const a of allies) {
    a.cool--;
    if (p.dead) continue;
    a.h = 34;
    a.facing = 1;     // 슈팅이라 언제나 오른쪽을 본다

    // 진형 위치로 부드럽게 따라붙는다 (플레이어 가운데 · 검술 전방 · 힐러 위 · 포병 아래)
    const F = FORMATION[a.type];
    const bob = Math.sin(frame * 0.05 + (a.type === 'healer' ? 1.7 : 0)) * 2;
    const tx = clamp(p.x + F.dx, camX + 4, camX + W - a.w - 4);
    // 동료는 무적이라 화면 위아래 끝을 조금 넘어가도 된다 (진형이 무너지지 않게)
    const ty = clamp(p.y + F.dy + bob, 2, GROUND_Y - a.h);
    // 따라붙는 속도. 느리면 앞으로 날 때 검술병이 뒤처져 플레이어와 겹친다
    a.x += (tx - a.x) * 0.22;
    a.y += (ty - a.y) * 0.22;
    a.anim = 'idle';
    // 일반 공격: 포병은 유도 포탄, 힐러는 전방으로 십자가 (검술병은 수호검·대참격 담당)
    if (a.type !== 'sword' && squadFire > 0 && a.cool <= 0) allyFire(a, dx, dy);
  }
}

// 화면 안에서 가장 가까운 적의 위치 (없으면 null)
function nearestTarget(a) {
  const cx = a.x + (a.w || 0) / 2, cy = a.y + (a.h || 0) / 2;
  let best = null, bd = Infinity;
  const consider = (tx, ty) => {
    const d = Math.hypot(tx - cx, ty - cy);
    if (d > 1 && d < bd) { bd = d; best = { x: tx, y: ty }; }
  };
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.x + e.w < camX || e.x > camX + W) continue;       // 화면 밖은 제외
    consider(e.x + e.w / 2, e.y + e.h / 2);
  }
  if (boss && !boss.dead && boss.x < camX + W) consider(boss.x + boss.w / 2, boss.y + boss.h / 2);
  return best;
}

// 십자가·저격탄의 위력 기준: 플레이어 기관총이 같은 시간 동안 내는 피해의 80%
const ALLY_OUTPUT = 0.8;
const PLAYER_FIRE_COOL = 6;                  // 플레이어 사격 간격(프레임)
const allyShotDmg = cool =>
  Math.max(1, Math.round(shotLines() / PLAYER_FIRE_COOL * cool * ALLY_OUTPUT));

// 대상이 없을 때 날아갈 방향 (십자가는 위, 저격탄은 아래 대각선)
const DIAG = 0.55;                           // 약 32도

// 동료 사격: 기본은 플레이어 조준 방향, 저격수는 가장 가까운 적을 직접 조준
function allyFire(a, dx, dy) {
  const t = a.type;
  let cool = SQUAD_TYPES[t].cool;
  if (t === 'sniper') cool *= 1 - Math.min(0.35, (a.level - 1) * 0.09);   // 레벨이 오르면 조금 빨라짐
  a.cool = cool + rand(0, 3);   // 동료끼리 사격 타이밍이 조금씩 어긋나게

  const x = a.x + a.w / 2 + dx * 17, y = a.y + (a.h < 34 ? 9 : 14) + dy * 17;
  const base = Math.atan2(dy, dx);
  const shot = (ang, sp, extra = {}) =>
    pBullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 2, dmg: 1, ...extra });

  const aim = nearestTarget(a);
  // 적이 있으면 그쪽을 겨누고, 없으면 각자 대각선으로 흘려보낸다 (나중에 적을 만나면 유도된다)
  const aimAngle = tilt => aim ? Math.atan2(aim.y - y, aim.x - x) : base + tilt;

  if (t === 'healer') {
    // 힐러: 십자가를 유도탄으로 날린다 (대상이 없으면 위쪽 대각선)
    const ang = aimAngle(-DIAG), sp = 4.4;
    pBullets.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      r: 7, dmg: allyShotDmg(SQUAD_TYPES.healer.cool), blast: 20 + a.level * 2,
      home: LV.homing(a.level),
      shell: true, cross: true, life: 130,
    });
  } else if (t === 'sniper') {
    // 포병: 유도 포탄 (대상이 없으면 아래쪽 대각선)
    const ang = aimAngle(DIAG), sp = 3.4;
    pBullets.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      r: 8,                              // 그림이 커진 만큼 판정도 함께 키움
      dmg: allyShotDmg(SQUAD_TYPES.sniper.cool),
      blast: Math.round(26 * squadBuff.range),
      home: LV.homing(a.level),          // 패시브: 적을 따라간다
      shell: true, sniper: true, bomb: true,   // 그림은 저격_FinalAttack 폭탄
    });
  }
  sparks(x, y, '#fff3b0');
  playSound(t === 'sniper' ? 'sniper' : t === 'sword' ? 'throw' : 'shoot');
}

// ===== 액티브 스킬 =====
// 키 안내 (일시정지·HUD 표시용)
const KEY_LABEL = { sword: 'Z', healer: 'X', sniper: 'C' };

function castSkill(a) {
  const p = player, T = SQUAD_TYPES[a.type], lv = a.level;
  a.skillCool = Math.round(T.skillCool * skillCut());
  const len = Math.hypot(p.aimX, p.aimY) || 1;
  const dx = p.aimX / len, dy = p.aimY / len;

  if (a.type === 'sword') {
    // 거대 분신을 불러내 전방으로 돌진시킨다 (닿는 적을 계속 베며 지나감)
    clones.push({
      x: p.x + p.w / 2 - 10, y: p.y + p.h / 2,
      w: 44, h: 92,
      vx: 4.6, life: 150, age: 0,
      dmg: Math.round(LV.slashDmg(lv) * skillMul() * 0.9),
      hits: new Map(),                          // 적마다 다시 벨 때까지의 대기 시간
    });
    // 뽑는 순간 번쩍임
    burst(p.x + p.w / 2 + dx * 20, p.y + 17, 16, ['#ffffff', '#9fd4ff']);
    for (let i = 0; i < 10; i++) {
      const a2 = rand(0, Math.PI * 2);
      particles.push({ x: p.x + p.w / 2, y: p.y + 17, vx: Math.cos(a2) * 3, vy: Math.sin(a2) * 3,
                       life: 14, size: 2, color: '#dfe8f2', grav: 0 });
    }
    shake = Math.max(shake, 7);
    playSound('throw');
  } else if (a.type === 'healer') {
    // 성역: 일정 시간 무적 (십자가가 플레이어 주위를 돈다)
    const dur = Math.round(LV.aegis(lv) * skillMul());
    p.invuln = Math.max(p.invuln, dur);
    p.aegis = dur;
    burst(p.x + p.w / 2, p.y + p.h / 2, 18, ['#ffe066', '#ffffff']);
    playSound('block');
  } else {
    // 융단 포격: 조준 방향 앞쪽 구역을 일정 시간 지진다
    const w = LV.zoneW(lv);
    const target = nearestTarget(a);
    const cx = target ? target.x : p.x + p.w / 2 + dx * 110;
    const dmg = Math.round(LV.zoneDmg(lv) * skillMul());
    // 화면 흔들림은 넣지 않는다 (폭탄이 오래 쏟아져서 어지럽다)
    zones.push({
      x: clamp(cx - w / 2, camX + 4, camX + W - w - 4), w,
      timer: LV.zoneTime(lv), tick: 0,
      dmg: Math.max(1, Math.round(dmg * 0.4)),   // 지지는 피해는 줄이고
      rain: 0,                                   // 나머지는 떨어지는 폭탄이 담당
      bombDmg: Math.max(1, Math.round(dmg * 0.35)),   // 총 피해량은 예전 융단 포격과 같게 맞춤
    });
    playSound('sniper');
  }
}

// 레이저가 화면 밖까지 닿도록 넉넉히 잡은 길이
const beamLen = b => W + 120;
// 포구에서 ang 방향으로 뻗는 선과 점 사이의 거리 판정 (선 뒤쪽은 맞지 않는다)
function beamHit(b, px, py) {
  const dx = px - b.x, dy = py - b.y;
  const along = dx * Math.cos(b.ang) + dy * Math.sin(b.ang);     // 빔 진행 방향으로의 거리
  if (along < 0 || along > beamLen(b)) return false;             // 포구 뒤 / 사거리 밖
  const side = -dx * Math.sin(b.ang) + dy * Math.cos(b.ang);     // 빔 중심선에서 벗어난 거리
  return Math.abs(side) < b.h / 2;
}

// 보스의 레이저: 붉은 경고선이 보인 뒤 굵은 빔이 나간다 (가로줄 / 대각선을 번갈아 씀)
function updateBeams() {
  for (const b of beams) {
    b.t--;
    if (b.t <= 0) { b.dead = true; continue; }
    if (b.t > b.fire) continue;                     // 아직 경고 단계
    if (b.t === b.fire) { shake = Math.max(shake, 6); playSound('explosion'); }
    // 빔에 닿으면 피해 (코어 기준). 포구에서 ang 방향으로 뻗는 직선과의 거리로 판정
    if (!player.dead && player.invuln <= 0 && beamHit(b, coreX(player), coreY(player))) hurtPlayer();
    if ((frame & 3) === 0) {
      const d = rand(0, beamLen(b));
      sparks(b.x + Math.cos(b.ang) * d, b.y + Math.sin(b.ang) * d + rand(-b.h / 2, b.h / 2), '#ff9f1c');
    }
  }
  beams = beams.filter(b => !b.dead);
}

// 홍련 궁극기: 거대 분신이 앞으로 돌진하며 닿는 적을 벤다
function updateClones() {
  for (const c of clones) {
    c.age++;
    c.x += c.vx;
    if (--c.life <= 0 || c.x > camX + W + 60) { c.dead = true; continue; }
    const box = { x: c.x - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h };
    for (const e of enemies) {
      if (e.dead) continue;
      const wait = c.hits.get(e) || 0;
      if (wait > 0) { c.hits.set(e, wait - 1); continue; }
      if (overlap(box, e)) {
        damageEnemy(e, c.dmg);
        c.hits.set(e, 22);                       // 같은 적은 잠깐 뒤에 다시 벤다
        sparks(e.x + e.w / 2, e.y + e.h / 2, '#dfe8f2');
        shake = Math.max(shake, 3);
      }
    }
    if (boss && !boss.dead && overlap(box, boss)) {
      const wait = c.hits.get(boss) || 0;
      if (wait > 0) c.hits.set(boss, wait - 1);
      else { damageBoss(c.dmg); c.hits.set(boss, 22); sparks(boss.x, boss.y + boss.h / 2, '#dfe8f2'); }
    }
    if ((frame & 1) === 0) sparks(c.x - 20, c.y + rand(-c.h / 2, c.h / 2), '#9fd4ff');
  }
  clones = clones.filter(c => !c.dead);
}

// 지지는 구역: 0.2초마다 그 안의 적에게 피해
function updateZones() {
  // 구역 안의 적은 느려지고 받는 피해가 늘어난다 (매 프레임 표시를 새로 찍어 준다)
  for (const z of zones) {
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.x + e.w > z.x && e.x < z.x + z.w) e.slow = 6;
    }
    if (boss && !boss.dead && boss.x + boss.w > z.x && boss.x < z.x + z.w) boss.slow = 6;
  }
  for (const z of zones) {
    z.timer--;
    // 폭탄 비: 구역 위로 저격 폭탄이 계속 쏟아진다
    if (--z.rain <= 0) {
      z.rain = 7;
      pBullets.push({
        x: rand(z.x + 4, z.x + z.w - 4), y: rand(-34, -14),
        vx: rand(-0.3, 0.3), vy: 2.2, grav: 0.06,
        r: 11, dmg: z.bombDmg, blast: 32,
        shell: true, bomb: true, fromSky: true, size: 1.4,   // 궁극기 폭탄은 더 크게
      });
    }
    if (++z.tick >= 12) {
      z.tick = 0;
      for (const e of enemies) {
        if (e.dead) continue;
        if (e.x + e.w > z.x && e.x < z.x + z.w) damageEnemy(e, z.dmg);
      }
      if (boss && !boss.dead && boss.x + boss.w > z.x && boss.x < z.x + z.w) damageBoss(z.dmg);
      burst(rand(z.x, z.x + z.w), rand(GROUND_Y - 40, GROUND_Y), 4, ['#ffd23f', '#ff7a1c']);
      playSound('hit');
    }
  }
  zones = zones.filter(z => z.timer > 0);
}

// 중간보스(M6)가 화면 안에 살아 있으면 스테이지 진행을 멈춘다
function miniBossFight() {
  return enemies.some(e => e.mini && !e.dead && e.x < camX + W && e.x + e.w > camX);
}

function updateCamera() {
  // 중간보스를 잡아도 곧바로 다음 웨이브가 쏟아지지 않게 2초 쉰다
  if (miniBossFight()) miniHold = MINI_HOLD;
  else if (miniHold > 0) miniHold--;

  // 슈팅 게임처럼 화면이 저절로 흘러간다 (플레이어가 앞서 나가면 조금 더 빨리)
  if (camX < ARENA_X && miniHold <= 0) {
    const lead = player.x - (camX + W * 0.35);
    camX = Math.min(ARENA_X, camX + SCROLL + Math.max(0, lead) * 0.04);
  }

  // 마지막 웨이브를 다 정리하면 0.5초 뒤 경고, 2초 뒤 보스가 나온다.
  // 보스장까지 남은 거리는 화면을 빠르게 밀어 붙여 기다리는 시간을 없앤다
  if (!boss) {
    if (spawnIdx >= SPAWNS.length && !enemies.some(e => !e.dead)) {
      finaleTimer++;
      // 경고가 뜨기 전(=보상 줍는 시간)에는 화면을 평소 속도로 두어 아이템이 밀려나지 않게 한다
      if (camX < ARENA_X && finaleTimer >= FINALE_WARN) {
        camX = Math.min(ARENA_X, camX + SCROLL * FINALE_RUSH);
      }
      if (finaleTimer === FINALE_WARN) {
        bossWarn = FINALE_BOSS - FINALE_WARN;     // 경고가 보스 등장까지 이어진다 (1.5초)
        playSound('warning');
      }
      if (finaleTimer >= FINALE_BOSS && camX >= ARENA_X) spawnBoss();
    } else {
      finaleTimer = 0;
    }
  }
}

function updateEnemies() {
  const px = player.x + player.w / 2;
  for (const e of enemies) {
    if (e.flash > 0) e.flash--;
    if (e.dead) continue;
    e.age++;
    const sx = e.x, sy = e.y;          // 둔화 계산용 (이동 뒤 일부만 반영)
    const dx = px - (e.x + e.w / 2);
    const dy = (player.y + player.h / 2) - (e.y + e.h / 2);
    const onScreen = e.x < camX + W && e.x + e.w > camX;
    const active = onScreen && !player.dead;

    // 편대 비행: 줄지어 흐르거나 원을 그리며 돈다 (종류별 기본 이동 대신)
    if (e.path === 'line') {
      e.x -= e.speed;
      e.y = e.baseY;
    } else if (e.path === 'coaster') {
      // 롤러코스터: 줄을 유지한 채 크게 오르내린다 (앞 기체가 지나간 길을 뒤가 그대로 따라간다)
      e.x -= e.speed;
      e.y = clamp(e.baseY + Math.sin(e.x * 0.022 + e.phase) * e.amp, FLY_TOP, FLY_BOTTOM - e.h);
    } else if (e.path === 'circle') {
      e.ang += e.spin;
      e.cx -= e.drift;
      e.x = e.cx + Math.cos(e.ang) * e.r;
      e.y = clamp(e.cy + Math.sin(e.ang) * e.r, FLY_TOP, FLY_BOTTOM - e.h);
    }

    switch (e.t) {
      // M1 소형 스파이더: 바닥에서 뿅뿅 뛰면서 다가온다 (뛰는 중에 크게 전진)
      case 'soldier': {
        e.facing = -1;
        e.vy += 0.35;
        e.y += e.vy;
        e.x -= (e.air ? 1.25 : 0.3) * (e.fast ? 2.1 : 1);
        if (e.y + e.h >= GROUND_Y) {          // 착지
          e.y = GROUND_Y - e.h;
          if (e.air) { sparks(e.x + e.w / 2, GROUND_Y, '#8a7a6a'); e.air = false; }
          e.vy = 0;
          // fast 무리는 거의 쉬지 않고 연달아 뛴다
          if (--e.hop <= 0) { e.vy = -5.2; e.air = true; e.hop = e.fast ? rand(2, 8) : rand(14, 34); }
        }
        if (active && --e.timer <= 0) {       // 가끔 조준 사격
          const mx = e.x, my = e.y + e.h / 2;
          const [vx, vy] = aimAt(mx, my, 3.3);
          eShoot(mx, my, vx, vy);
          e.timer = rand(75, 125) * e.rate;
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
      // M4 소형 비행: 빠르게 파고들며 물결치듯 훑고 지나간다
      case 'm4': {
        if (!e.path) { e.x -= 1.7; e.y = e.baseY + Math.sin(e.age * 0.08 + e.phase) * 26; }
        if (active && --e.timer <= 0) {
          const [vx, vy] = aimAt(e.x + e.w / 2, e.y + e.h, 3.5);
          eShoot(e.x + e.w / 2, e.y + e.h, vx, vy, { r: 2 });
          e.timer = rand(80, 130) * e.rate;
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
      // 중형 비행(탱커): 천천히 밀고 들어오며 조준 3연발. 체력이 높아 일반 사격만으로는 버겁다
      case 'm2h': {
        if (!e.path) { e.x -= 0.9; e.y = e.baseY + Math.sin(e.age * 0.05 + e.phase) * 16; }
        if (active && --e.timer <= 0) {
          const [vx, vy] = aimAt(e.x + e.w / 2, e.y + e.h / 2, 3.6);
          eShoot(e.x + e.w / 2, e.y + e.h / 2, vx, vy, { r: 3, color: '#8fd3ff' });
          if (e.burst > 0) { e.burst--; e.timer = 11; }
          else { e.burst = 2; e.timer = rand(95, 140) * e.rate; }
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
      // 약한 중간보스: 천천히 밀고 들어오며 부채꼴과 조준 연발을 번갈아 쏜다
      case 'm6s': {
        if (e.hold) {
          // 자리를 잡고 버틴다 (지나쳐 버리지 않게).
          // 둘이서 세로로 긴 타원 궤도를 반 바퀴씩 어긋나 돌아 자리가 계속 바뀐다
          const ORBIT = 240;                        // 한 바퀴 4초
          const RX = 16, RY = 44;                   // 가로는 좁고 세로로 긴 타원
          const hx = camX + W - e.w - 64;
          const cy = e.orbitCy ?? (e.orbitCy = (e.lane + (e.laneAlt ?? e.lane)) / 2);
          // 위쪽에서 시작한 쪽은 위(-PI/2), 아래쪽은 아래(+PI/2) 에서 출발
          const a0 = (e.laneAlt !== undefined && e.lane > cy) ? Math.PI / 2 : -Math.PI / 2;
          const ang = a0 + (e.age / ORBIT) * Math.PI * 2;
          e.x += ((hx + Math.cos(ang) * RX) - e.x) * 0.12;
          e.baseY = cy + Math.sin(ang) * RY;
          e.y = e.baseY;
          // 위아래 끝을 돌 때 반짝여 궤도가 읽히게
          if (e.age % (ORBIT / 2) === 0) sparks(e.x + e.w / 2, e.y + e.h / 2, '#8fd3ff');
        } else if (!e.path) {
          e.x -= 0.55;
          e.baseY += clamp(dy, -0.4, 0.4);
          e.baseY = clamp(e.baseY, FLY_TOP + 6, FLY_BOTTOM - e.h - 6);
          e.y = e.baseY + Math.sin(e.age * 0.045 + e.phase) * 6;
        }
        // 정해진 3초 주기를 그대로 돈다 (무작위 없음).
        // 두 마리가 나올 때는 위/아래가 반 주기씩 엇갈려 번갈아 쏘는 것처럼 보인다
        if (active) {
          const CYCLE = 180;
          const t2 = (e.age + (e.cyclePhase || 0)) % CYCLE;
          const mx = e.x, my = e.y + e.h / 2;
          if (t2 === 0) {                          // 0.0초: 부채꼴 5발
            eFan(mx, my, 3.2, 5, 0.24, { r: 3, color: '#ff9f1c' });
            sparks(mx, my, '#ff9f1c');
          } else if (t2 === 72 || t2 === 84 || t2 === 96) {   // 1.2~1.6초: 조준 3연발
            const [vx, vy] = aimAt(mx, my, 4.0);
            eShoot(mx, my, vx, vy, { r: 3, color: '#8fd3ff' });
          }
          // 1.6~3.0초는 쉬는 구간 — 이때 자리를 옮긴다
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
      // M6 중간보스: 화면 오른쪽에 자리를 잡고 조준 연발 + 확산탄
      case 'm6': {
        const hold = camX + W - e.w - 40;
        e.x += (hold - e.x) * 0.02;
        e.baseY += clamp(dy, -0.5, 0.5);
        e.baseY = clamp(e.baseY, FLY_TOP + 6, FLY_BOTTOM - e.h - 6);
        e.y = e.baseY + Math.sin(e.age * 0.04) * 5;
        if (active && --e.timer <= 0) {
          const mx = e.x, my = e.y + e.h / 2;
          if (e.burst > 0) {                       // 조준 3연발
            e.burst--;
            const [vx, vy] = aimAt(mx, my, 4.2);
            eShoot(mx, my, vx, vy, { r: 3, color: '#8fd3ff' });
            e.timer = 9;
          } else {
            // 네 패턴을 차례대로 돌린다 (조준 연발 → 원형 확산 → 부채꼴 → 분열 미사일)
            switch (e.step = (e.step || 0) + 1, (e.step - 1) % 4) {
              case 1:                              // 원형 확산
                for (let i = 0; i < 12; i++) {
                  const ang = (i * Math.PI * 2) / 12 + e.age * 0.01;
                  eShoot(e.x + e.w / 2, my, Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, { r: 3 });
                }
                shake = Math.max(shake, 3);
                e.timer = rand(60, 90) * e.rate;
                break;
              case 2:                              // 부채꼴: 플레이어 쪽으로 넓게 7발
                eFan(mx, my, 3.4, 7, 0.22, { r: 3, color: '#ff9f1c' });
                sparks(mx, my, '#ff9f1c');
                e.timer = rand(55, 80) * e.rate;
                break;
              case 3: {                            // 분열 미사일: 큰 탄이 날아가다 8갈래로 터짐
                const [vx, vy] = aimAt(mx, my, 2.3);
                eShoot(mx, my, vx, vy,
                       { r: 6, big: true, color: '#ff5a3c', split: 8, fuse: 62, splitSpeed: 2.4 });
                sparks(mx, my, '#ffd23f');
                e.timer = rand(75, 105) * e.rate;
                break;
              }
              default:                             // 조준 3연발 준비
                e.burst = 2;
                e.timer = 6;
            }
          }
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
      // M5 대형 비행: 플레이어 높이를 맞춰 오며 3발 부채꼴
      case 'm5': {
        if (!e.path) {
          e.x -= 0.6;
          e.baseY += clamp(dy, -0.35, 0.35);
          e.baseY = clamp(e.baseY, FLY_TOP, FLY_BOTTOM - e.h);
          e.y = e.baseY + Math.sin(e.age * 0.04 + e.phase) * 6;
        }
        if (active && --e.timer <= 0) {
          eFan(e.x + e.w / 2, e.y + e.h * 0.7, 3.2, 3, 0.3, { r: 3, color: '#8fd3ff' });
          sparks(e.x + e.w / 2, e.y + e.h * 0.7, '#8fd3ff');
          e.timer = rand(100, 150) * e.rate;
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
      // 장갑형: 지상에서 버티며 3발 부채꼴
      case 'heavy': {
        e.facing = -1;
        e.x -= 0.45;
        if (active && --e.timer <= 0) {
          eFan(e.x, e.y + e.h / 2, 2.9, 3, 0.26, { r: 3 });
          sparks(e.x, e.y + e.h / 2, '#ff9f1c');
          e.timer = rand(80, 120) * e.rate;
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
      // M2 드론: 플레이어 높이를 쫓아오며 빠르게 파고든다
      case 'drone': {
        if (e.x < camX + W + 40) {
          if (!e.path) {
            e.vx = clamp(e.vx + (Math.sign(dx) * 0.03) - 0.02, -1.6, 1.0);
            e.x += e.vx;
            e.baseY += clamp(dy, -0.5, 0.5) * 0.35;
            e.baseY = clamp(e.baseY, FLY_TOP, FLY_BOTTOM - e.h);
            e.y = e.baseY + Math.sin(e.age * 0.06) * 8;
          }
          if (active && --e.timer <= 0) {
            const [vx, vy] = aimAt(e.x + e.w / 2, e.y + e.h, 3.0);
            eShoot(e.x + e.w / 2, e.y + e.h, vx, vy);
            e.timer = rand(70, 120) * e.rate;
          }
        }
        break;
      }
      // M3 중형: 땅 위를 밀고 오며, 바닥에서 플레이어를 향해 빠른 직선탄을 쏜다
      case 'mid': {
        e.facing = -1;
        e.x -= 0.4;
        if (active) {
          if (--e.timer <= 0) {
            const mx = e.x, my = e.y + 14;
            const [vx, vy] = aimAt(mx, my, 5.2);   // 쏘는 순간의 플레이어 방향으로 일직선·고속
            eShoot(mx, my, vx, vy, { r: 4, big: true, color: '#8fd3ff' });
            sparks(mx, my, '#8fd3ff');
            shake = Math.max(shake, 2);
            // 첫 발을 쏘면 14프레임 뒤에 두 번째가 붙고, 그다음 길게 쉰다
            if (e.burst > 0) { e.burst--; e.timer = rand(80, 120) * e.rate; }
            else { e.burst = 1; e.timer = 14; }
          }
        }
        if (!player.dead && overlap(e, hitbox(player))) hurtPlayer();
        break;
      }
    }
    if (e.slow > 0) {                  // 포격 구역: 이동 55% 감소
      e.slow--;
      e.x = sx + (e.x - sx) * 0.45;
      e.y = sy + (e.y - sy) * 0.45;
      if ((frame & 7) === 0) sparks(e.x + e.w / 2, e.y + e.h / 2, '#ffd23f');
    }
  }
  enemies = enemies.filter(e => !e.dead && e.x + e.w > camX - 120);
}

function spawnBoss() {
  const homeX = ARENA_X + W - 110;
  boss = {
    x: homeX + 140, y: 110, w: 64, h: 92,
    hp: stageInfo.bossHp, maxHp: stageInfo.bossHp, baseY: 110,
    state: 'intro', timer: 0, flash: 0, dead: false, deathTimer: 0,
    step: 0, count: 0, homeX,
  };
}

function updateBoss() {
  if (!boss) return;
  const b = boss;
  if (b.flash > 0) b.flash--;
  if (bossWarn > 0) bossWarn--;

  if (b.dead) {
    if (b.deathTimer > 0) {
      b.deathTimer--;
      if (b.deathTimer % 6 === 0) {
        burst(rand(b.x, b.x + b.w), rand(b.y, b.y + b.h), 14);
        shake = Math.max(shake, 5);
      }
    }
    return;
  }

  // 체력에 따라 3단계로 사나워진다
  // 마지막 페이즈를 절반부터 열어 후반을 길게 가져간다 (1단계 100~75% / 2단계 75~50% / 3단계 50%~)
  const ph = b.hp < b.maxHp * 0.5 ? 3 : b.hp < b.maxHp * 0.75 ? 2 : 1;
  const phase2 = ph >= 2;
  if (b.phase !== ph) {            // 단계가 바뀌는 순간 연출 (글자 없이 효과만)
    b.phase = ph;
    if (ph > 1) {                  // 소리는 내지 않고 화면 연출로만 알린다
      shake = Math.max(shake, 7);
      burst(b.x + b.w / 2, b.y + b.h / 2, 20, ['#ff3b3b', '#ffd23f']);
    }
  }
  switch (b.state) {
    case 'intro':
      if (b.x > b.homeX) { b.x -= 1; shake = Math.max(shake, 1.5); }
      else { b.state = 'idle'; b.timer = 40; }
      break;
    case 'idle': {
      if (--b.timer <= 0) {
        // 1단계: 기본 / 2단계: 돌진·소환 추가 / 3단계: 소사까지 전부
        // 범위기(레이저·회전탄막·확산탄) 비중을 높여 "피하는 맛" 위주로
        // 원형 확산과 조준 연발을 자주 섞어 "자리를 잘못 잡으면 맞는" 구성으로
        const list = ph === 1 ? ['laser', 'spread', 'laser', 'fan', 'laser', 'spiral', 'laser', 'mirv', 'volley', 'laser', 'spread', 'sweep', 'laser', 'fan', 'cannon']
                   : ph === 2 ? ['laser', 'spread', 'laser', 'fan', 'laser', 'spiral', 'laser', 'mirv', 'laser', 'volley', 'laser', 'spread', 'sweep', 'laser', 'fan', 'laser', 'mirv', 'missile', 'spiral', 'charge', 'summon']
                              : ['laser', 'spread', 'laser', 'fan', 'laser', 'mirv', 'laser', 'spiral', 'laser', 'sweep', 'laser', 'spread', 'laser', 'fan', 'volley', 'laser', 'mirv', 'laser', 'spiral', 'sweep', 'charge', 'missile', 'summon'];
        let next = list[b.step++ % list.length];
        // 레이저가 아직 살아 있으면 연발은 쓰지 않는다 (탄막과 빔이 겹치면 피할 길이 없다)
        while (next === 'volley' && beams.length) next = list[b.step++ % list.length];
        b.state = next;
        b.count = 0; b.timer = ph === 3 ? 5 : ph === 2 ? 9 : 14;    // 쉬는 시간 단축
      }
      break;
    }
    case 'spread': // 확산탄: 사방으로 뿌린다
      if (--b.timer <= 0) {
        const mx = b.x + 8, my = b.y + b.h / 2;
        const n = ph >= 3 ? 40 : 28;                // 탄 간격을 절반으로 (촘촘한 원형)
        const off = b.count * 0.19;                 // 볼리마다 조금씩 돌려 틈을 메움
        for (let i = 0; i < n; i++) {
          const ang = off + (i * Math.PI * 2) / n;
          eShoot(mx, my, Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, { r: 3, color: '#ff5a3c' });
        }
        sparks(mx, my, '#ff9f1c');
        shake = Math.max(shake, 3);
        b.timer = ph >= 3 ? 20 : 30;
        if (++b.count >= (ph >= 3 ? 6 : ph >= 2 ? 5 : 4)) { b.state = 'idle'; b.timer = 30; }
      }
      break;
    case 'fan': // 부채꼴: 플레이어 쪽으로 넓게 흩뿌린다 (단계가 오를수록 발 수가 늘고 두 번 쏜다)
      if (--b.timer <= 0) {
        const mx = b.x - 10, my = b.y + b.h / 2;
        const n = ph >= 3 ? 13 : ph >= 2 ? 11 : 9;
        eFan(mx, my, ph >= 3 ? 3.8 : 3.4, n, 0.17, { r: 3, color: '#ff9f1c' });
        sparks(mx, my, '#ff9f1c');
        b.timer = ph >= 3 ? 24 : 34;
        if (++b.count >= (ph >= 3 ? 4 : ph >= 2 ? 3 : 2)) { b.state = 'idle'; b.timer = 32; }
      }
      break;
    case 'mirv': // 분열 미사일: 큰 탄이 날아가다 터지면서 작은 탄으로 갈라진다
      if (--b.timer <= 0) {
        const mx = b.x - 10, my = b.y + b.h / 2 + rand(-16, 16);
        const [vx, vy] = aimAt(mx, my, ph >= 3 ? 2.6 : 2.2);
        eShoot(mx, my, vx, vy, {
          r: 6, big: true, color: '#ff5a3c',
          split: ph >= 3 ? 12 : ph >= 2 ? 10 : 8,
          fuse: rand(46, 66),                     // 플레이어 근처에서 터지도록
          splitSpeed: ph >= 3 ? 2.8 : 2.4,
        });
        sparks(mx, my, '#ffd23f');
        b.timer = ph >= 3 ? 26 : 38;
        if (++b.count >= (ph >= 3 ? 4 : ph >= 2 ? 3 : 2)) { b.state = 'idle'; b.timer = 38; }
      }
      break;
    case 'sweep': { // 소사: 포신이 호를 그리며 훑는다. 궤도는 그대로 두고 탄 사이에 틈을 낸다
      // 멈추지 않고 훑되 8칸마다 2칸을 비워, 그 빈 줄로 빠져나가야 살 수 있게 했다
      // (오래 쉬게 하면 "옮길 시간"은 생기지만 궤도를 읽는 맛이 사라진다)
      const steps = 56, period = 8, hole = 2;
      if (--b.timer <= 0) {
        const mx = b.x - 14, my = b.y + b.h / 2;
        const slot = b.count % period;
        if (slot < period - hole) {                 // 8칸 중 6칸만 쏘고 2칸은 빈 줄
          const ang = Math.PI + (-0.62 + 1.24 * (b.count / steps));
          eShoot(mx, my, Math.cos(ang) * 3.4, Math.sin(ang) * 3.4, { r: 3, color: '#ffd23f' });
          sparks(mx, my, '#ffd23f');
        }
        b.count++;
        b.timer = 2;                                // 포신은 쉬지 않고 계속 훑는다
        if (b.count >= steps) { b.state = 'idle'; b.timer = 32; }
      }
      break;
    }
    case 'laser': { // 범위기: 가로 레이저 2~3줄 (위아래로 피해야 한다)
      if (--b.timer <= 0) {
        const n = ph >= 3 ? 4 : ph >= 2 ? 3 : 2;
        const mx = b.x + 6, my = b.y + b.h / 2;
        // 가로줄과 대각선을 번갈아 쓴다. 대각선은 자리를 정확히 잡지 않으면 빠져나갈 틈이 없다
        const diagonal = (b.laserKind = (b.laserKind || 0) + 1) % 2 === 0;
        if (diagonal) {
          // 포구에서 부채처럼 갈라지는 대각선. 틈 사이로 들어가야 산다
          const spread = ph >= 3 ? 0.30 : 0.36;
          const tilt = Math.atan2(clamp(player.y + player.h / 2, FLY_TOP + 20, FLY_BOTTOM - 20) - my,
                                  -(b.x - camX)) + rand(-0.06, 0.06);
          for (let i = 0; i < n; i++) {
            const ang = tilt + (i - (n - 1) / 2) * spread;
            beams.push({ x: mx, y: my, ang, h: 20, t: 130, fire: 65, dead: false });
          }
        } else {
          const base = clamp(player.y + player.h / 2, FLY_TOP + 30, FLY_BOTTOM - 30);
          for (let i = 0; i < n; i++) {
            const y = clamp(base + (i - (n - 1) / 2) * rand(40, 62) + rand(-10, 10), FLY_TOP + 8, FLY_BOTTOM - 8);
            beams.push({ x: mx, y, ang: Math.PI, h: 22, t: 130, fire: 65, dead: false });
          }
        }
        b.state = 'idle'; b.timer = 55;
      }
      break;
    }
    case 'volley': { // 조준 연발: 플레이어가 있던 자리로 정확히 쏟아붓는다
      if (--b.timer <= 0) {
        const mx = b.x - 10, my = b.y + b.h / 2;
        // 플레이어가 움직이는 방향을 살짝 예측해서 쏜다
        const lead = 10 + b.count * 2;
        const tx = player.x + player.w / 2 + player.vx * lead;
        const ty = player.y + player.h / 2 + player.vy * lead;
        const ang = Math.atan2(ty - my, tx - mx);
        const sp = ph >= 3 ? 5.8 : 5.0;
        // 한 번에 3발씩 살짝 벌려 쏴서 "대충 비켜서는" 회피를 막는다
        const w2 = ph >= 3 ? 0.10 : 0.13;
        for (let i = -1; i <= 1; i++)
          eShoot(mx, my, Math.cos(ang + i * w2) * sp, Math.sin(ang + i * w2) * sp, { r: 3, color: '#ff5a3c' });
        sparks(mx, my, '#ff9f1c');
        b.count++;
        // 3발 묶음마다 0.35초 쉰다 — 그 틈에 자리를 옮겨야 다음 묶음을 피할 수 있다
        const burst = 3, rest = 12;     // 0.35초는 너무 헐거워서 0.2초로 (겨우 비킬 만큼만)
        b.timer = b.count % burst === 0 ? rest : (ph >= 3 ? 3 : 5);
        if (b.count >= (ph >= 3 ? 12 : 9)) { b.state = 'idle'; b.timer = 34; }
      }
      break;
    }
    case 'spiral': { // 범위기: 회전하며 뿌리는 탄막
      if (--b.timer <= 0) {
        const mx = b.x + 8, my = b.y + b.h / 2;
        const arms = ph >= 3 ? 8 : ph >= 2 ? 6 : 5;   // 회전 탄막 줄 수 상향
        for (let i = 0; i < arms; i++) {
          const ang = b.count * 0.42 + (i * Math.PI * 2) / arms;
          eShoot(mx, my, Math.cos(ang) * 2.1, Math.sin(ang) * 2.1, { r: 3, color: '#ff8ad0' });
        }
        b.timer = 4;
        if (++b.count >= (ph >= 3 ? 52 : 34)) { b.state = 'idle'; b.timer = 35; }
      }
      break;
    }
    case 'summon': // 드론 소환
      if (--b.timer <= 0) {
        const n = ph >= 3 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const d = makeEnemy('drone', b.x - 12, clamp(b.y + i * 26 - 12, FLY_TOP, FLY_BOTTOM - 24));
          d.timer = 40;
          enemies.push(d);
          burst(d.x + 14, d.y + 11, 8, ['#8fd3ff', '#ffffff']);
        }
        playSound('rescue');
        b.state = 'idle'; b.timer = 60;
      }
      break;
    case 'cannon': // 조준 포격
      if (--b.timer <= 0) {
        const mx = b.x - 14, my = b.y + 14;
        const [vx, vy] = aimAt(mx, my, ph >= 3 ? 3.6 : phase2 ? 3.2 : 2.6);
        eShoot(mx, my, vx, vy, { r: 4, big: true, color: '#ff9f1c' });
        sparks(mx, my, '#ffd23f');
        b.timer = ph >= 3 ? 8 : phase2 ? 11 : 16;
        if (++b.count >= (ph >= 3 ? 9 : phase2 ? 7 : 5)) { b.state = 'idle'; b.timer = 45; }
      }
      break;
    case 'missile': // 경고 표시 후 위에서 미사일 낙하
      if (--b.timer <= 0) {
        // 한 번에 두 곳씩, 한쪽은 플레이어 머리 위를 노린다
        const tx = b.count % 2 === 0 ? player.x + player.w / 2 + rand(-12, 12) : rand(camX + 20, b.x - 10);
        warns.push({ x: tx, t: 40 });
        if (ph >= 2) warns.push({ x: rand(camX + 20, b.x - 10), t: 40 });
        b.timer = ph >= 3 ? 6 : phase2 ? 8 : 12;
        if (++b.count >= (ph >= 3 ? 16 : phase2 ? 12 : 8)) { b.state = 'idle'; b.timer = 60; }
      }
      break;
    case 'charge': // 돌진 (위아래로 피해야 함)
      if (b.count === 0) {
        if (--b.timer <= 0) { b.count = 1; b.lockY = player.y + player.h / 2 - b.h / 2; }
      } else if (b.count === 1) {
        b.x -= 4.5;
        b.baseY += clamp(b.lockY - b.baseY, -1.2, 1.2);   // 노린 높이로 맞춰 돌진
        if (b.x <= ARENA_X + 8) { b.count = 2; shake = Math.max(shake, 8); }
      } else {
        b.x += 1.5;
        if (b.x >= b.homeX) { b.x = b.homeX; b.state = 'idle'; b.timer = 60; }
      }
      break;
  }
  // 공중 보스: 평소에는 플레이어 높이를 천천히 따라간다
  if (b.state !== 'charge') {
    const want = clamp(player.y + player.h / 2 - b.h / 2, FLY_TOP + 10, FLY_BOTTOM - b.h - 10);
    b.baseY += clamp(want - b.baseY, -0.6, 0.6);
  }
  b.baseY = clamp(b.baseY, FLY_TOP + 6, FLY_BOTTOM - b.h - 6);
  // 게임 픽셀 단위로 딱 떨어지게 흔들어 떨림을 없앤다
  b.y = Math.round(b.baseY) + Math.round(Math.sin(frame * 0.03) * 4);
  if (!player.dead && overlap(bossBody(b), hitbox(player))) hurtPlayer();
}

// 보스의 몸통 판정. 그림 바깥의 빈 공간을 빼고, 돌진 중에는 더 좁혀
// "위아래로 피했는데 맞는" 일이 없게 한다
function bossBody(b) {
  const inset = b.state === 'charge' && b.count === 1 ? [16, 24] : [8, 12];
  return { x: b.x + inset[0], y: b.y + inset[1],
           w: b.w - inset[0] * 2, h: b.h - inset[1] * 2 };
}

function updateBullets() {
  for (const b of pBullets) {
    // 포병 패시브: 포탄이 가장 가까운 적 쪽으로 조금씩 휘어진다
    if (b.home) {
      const t = nearestTarget(b);
      if (t) {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const ang = Math.atan2(b.vy, b.vx);
        let d = Math.atan2(t.y - b.y, t.x - b.x) - ang;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const na = ang + clamp(d, -b.home, b.home);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
    }
    if (b.grav) b.vy += b.grav;          // 곡사포 포탄은 포물선을 그림
    b.x += b.vx; b.y += b.vy;
    if (b.life !== undefined && --b.life <= 0) { b.dead = true; continue; }
    const topEdge = b.fromSky ? -50 : -10;
    if (b.x < camX - 10 || b.x > camX + W + 10 || b.y < topEdge || b.y > H) { b.dead = true; continue; }
    let hit = b.y >= GROUND_Y + 4;   // 지면에 닿으면 터짐 (포탄·십자가)
    // 관통탄 명중 처리 (같은 대상은 한 번만)
    const pierceHit = target => {
      b.hits.add(target);
      sparks(b.x, b.y);
    };
    if (!hit) {
      for (const e of enemies) {
        if (e.dead || (b.pierce && b.hits.has(e))) continue;
        if (pointIn(b, e)) {
          if (!b.shell) damageEnemy(e, b.dmg);     // 포탄은 폭발로 피해를 줌
          if (b.pierce) { pierceHit(e); continue; }
          hit = true; break;
        }
      }
    }
    if (!hit && boss && !boss.dead && !(b.pierce && b.hits.has(boss)) && pointIn(b, boss)) {
      if (!b.shell) damageBoss(b.dmg);
      if (b.pierce && !b.shell) pierceHit(boss); else hit = true;
    }
    if (hit) {
      b.dead = true;
      if (b.shell) explosionAt(b.x, Math.min(b.y, GROUND_Y - 2), b.blast || 26, b.dmg, !!b.fromSky);
      else sparks(b.x, Math.min(b.y, GROUND_Y));
    }
  }
  pBullets = pBullets.filter(b => !b.dead);

  for (const b of eBullets) {
    b.vy += b.grav; b.x += b.vx; b.y += b.vy;
    // 분열탄: 심지가 다 타면 그 자리에서 갈라진다
    if (b.split && --b.fuse <= 0) { b.dead = true; splitBullet(b); continue; }
    if (b.x < camX - 20 || b.x > camX + W + 20 || b.y < -60 || b.y > H) { b.dead = true; continue; }
    if (b.y >= GROUND_Y + 8) {       // 지면 아래로 빠지면 사라짐
      b.dead = true;
      if (b.split) splitBullet(b);
      else if (b.big) { burst(b.x, GROUND_Y, 10); shake = Math.max(shake, 3); }
      else sparks(b.x, GROUND_Y, '#ff5a3c');
      continue;
    }
    // 검술병 칼에 쳐내짐 (동료 몸은 무적이라 탄이 통과, 칼 범위만 판정)
    if (shields.some(s => bladeHit(s, b.x, b.y))) {
      b.dead = true;
      sparks(b.x, b.y, '#dfe8f2');
      playSound('block');
      continue;
    }
    // 스치면 그레이즈 (점수 + 반짝임), 코어에 닿으면 피격
    if (!player.dead && !b.grazed) {
      const d = Math.hypot(b.x - coreX(player), b.y - coreY(player));
      if (d < 16 + b.r) {
        b.grazed = true;
        graze++; score += 20;
        sparks(b.x, b.y, '#9fd4ff');
      }
    }
    if (!player.dead && player.invuln <= 0 && pointIn(b, hitbox(player))) { b.dead = true; hurtPlayer(); }
  }
  eBullets = eBullets.filter(b => !b.dead);
}

function updateParticles() {
  for (const p of particles) { p.vy += p.grav; p.x += p.vx; p.y += p.vy; p.life--; }
  particles = particles.filter(p => p.life > 0);
}

function updateWarns() {
  for (const w of warns) {
    if (--w.t <= 0) {
      eShoot(w.x, -30, 0, 6, { r: 5, big: true, color: '#ff9f1c' });
      w.dead = true;
    }
  }
  warns = warns.filter(w => !w.dead);
}

// ===== 그리기 =====
const col = (e, c) => (e.flash > 0 ? '#ffffff' : c);

function text(s, x, y, size = 10, color = '#fff', align = 'left') {
  ctx.font = `bold ${size}px "Malgun Gothic", monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = '#000';
  ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function drawBackground() {
  // 배경 이미지가 하나라도 있으면 이미지 배경 사용 (sky → far → near 순서로 겹쳐 그림, 가로 반복)
  const layers = ['sky', 'far', 'near'].map(n => IMAGES['bg_' + n]).filter(Boolean);
  if (layers.length) {
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
    for (const { img, cfg } of layers) {
      const iw = img.naturalWidth;
      const off = -Math.round((bgX * (cfg.scroll || 0)) % iw);
      for (let x = off; x < W; x += iw) ctx.drawImage(img, x, 0);
    }
    return;
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,220,150,0.55)';
  ctx.beginPath(); ctx.arc(360, 120, 30, 0, Math.PI * 2); ctx.fill();

  // bgX 는 끝없이 늘어나므로 깔아 둔 길이로 나눠 되감는다 (배경이 무한히 반복된다)
  const farLoop = LEVEL_END * 0.55 + W, nearLoop = LEVEL_END * 0.9 + W;
  const farOff = (bgX * 0.55) % farLoop, nearOff = (bgX * 0.9) % nearLoop;
  ctx.fillStyle = '#6a4247';
  for (const b of bgFar) {
    let x = Math.round(b.x - farOff);
    if (x + b.w < 0) x += farLoop;                 // 왼쪽으로 빠진 건 오른쪽 끝에서 다시 들어온다
    if (x + b.w < 0 || x > W) continue;
    ctx.fillRect(x, GROUND_Y - b.h - 10, Math.round(b.w), b.h + 10);
  }
  for (const b of bgNear) {
    let x = Math.round(b.x - nearOff);
    if (x + b.w < 0) x += nearLoop;
    if (x + b.w < 0 || x > W) continue;
    const top = GROUND_Y - b.h;
    ctx.fillStyle = '#3a2830';
    ctx.beginPath();
    // 무너진 지붕 모양
    ctx.moveTo(x, top + b.cut); ctx.lineTo(x + b.w * 0.6, top); ctx.lineTo(x + b.w, top + b.cut * 0.5);
    ctx.lineTo(x + b.w, GROUND_Y); ctx.lineTo(x, GROUND_Y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5c3e3c';
    for (let wy = top + b.cut + 8; wy < GROUND_Y - 10; wy += 14)
      for (let wx = x + 5; wx < x + b.w - 8; wx += 12) ctx.fillRect(wx, wy, 5, 6);
  }
}

// 타일 그림을 가로로 반복해 채움 (마지막 칸은 잘라서 폭을 정확히 맞춤)
function tileRow(img, x, y, w) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  for (let dx = 0; dx < w; dx += iw) {
    const cut = Math.min(iw, w - dx);
    ctx.drawImage(img, 0, 0, cut, ih, Math.round(x + dx), Math.round(y), cut, ih);
  }
}

function drawLevel() {
  const x0 = camX - 10, x1 = camX + W + 10;
  // 바닥 (tile_ground 그림이 있으면 그것으로 깔고, 없으면 도형)
  const ground = IMAGES.tile_ground;
  if (ground) {
    const iw = ground.img.naturalWidth;
    const from = Math.floor(x0 / iw) * iw;
    tileRow(ground.img, from, GROUND_Y, x1 - from);
  } else {
    ctx.fillStyle = '#2b2224'; ctx.fillRect(x0, GROUND_Y, x1 - x0, H - GROUND_Y);
    ctx.fillStyle = '#4a3a36'; ctx.fillRect(x0, GROUND_Y, x1 - x0, 4);
    ctx.fillStyle = '#3a2e2e';
    for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) ctx.fillRect(x, GROUND_Y + 10, 20, 3);
  }
  // 발판 (tile_platform 그림이 있으면 발판 폭만큼 반복)
  const plat = IMAGES.tile_platform;
  for (const p of platforms) {
    if (p.solid || p.x > x1 || p.x + p.w < x0) continue;
    if (plat) { tileRow(plat.img, p.x, p.y, p.w); continue; }
    ctx.fillStyle = '#7a6a5c'; ctx.fillRect(p.x, p.y, p.w, 4);
    ctx.fillStyle = '#4b4038'; ctx.fillRect(p.x, p.y + 4, p.w, 4);
    ctx.fillStyle = '#3a312b';
    ctx.fillRect(p.x + 6, p.y + 8, 3, GROUND_Y - p.y - 8);
    ctx.fillRect(p.x + p.w - 9, p.y + 8, 3, GROUND_Y - p.y - 8);
  }
}

// 캐릭터 상태 → 애니메이션 이름 (assets.js 의 anims 이름과 맞춤)
// 비행 중에는 점프(공중) 포즈를 쓰고, 오르내릴 때만 달리기 칸으로 약동감을 준다
function animOf(b) {
  if (Math.abs(b.vy) > 0.3) return 'run';
  return 'jump';
}
// 스프라이트를 쓸 때 게임이 총을 따로 그릴지 (assets.js 에서 gun: false 면 숨김)
const spriteGun = key => IMAGES[key] && IMAGES[key].cfg.gun !== false;
// ===== 어두운 그림이 폐허 배경에 묻히지 않도록 밝은 1px 테두리를 둘러 그린다 =====
const BLADE_GLOW = '#9fd4ff';   // 칼 (수호칼·던진 칼)
const GUN_GLOW = '#ffd75e';     // 총 (돌격소총·저격총)
const CROSS_GLOW = '#ffffff';   // 십자가
const OUT4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const tintCache = new Map();
// 스프라이트의 실루엣을 한 가지 색으로 칠한 사본 (테두리·잔상용, 한 번 만들어 재사용)
function tinted(img, color) {
  const key = img.src + color;
  let c = tintCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    // 이미지와 똑같이 쓸 수 있게 크기 속성을 맞춰 둔다
    c.naturalWidth = c.width; c.naturalHeight = c.height;
    tintCache.set(key, c);
  }
  return c;
}
// (x, y) 에 그림을 그리되 color 가 있으면 상하좌우 1px 테두리를 먼저 깐다
function drawWithOutline(img, x, y, color) {
  if (color) {
    const t = tinted(img, color);
    for (const [dx, dy] of OUT4) ctx.drawImage(t, x + dx, y + dy);
  }
  ctx.drawImage(img, x, y);
}
// 원점 가운데에 그림 (칼처럼 가운데를 잡고 도는 것)
const drawCentered = (img, color) =>
  drawWithOutline(img, -Math.round(img.naturalWidth / 2), -Math.round(img.naturalHeight / 2), color);

// 무기 그리기: weapon_<kind> 그림이 있으면 손잡이를 손에 맞춰 회전시켜 그리고,
// 없으면 지금처럼 단순한 막대로 그린다
function drawGunAt(cx, cy, len, kind = 'pistol') {
  const w = IMAGES['weapon_' + kind];
  const ang = Math.atan2(player.aimY, player.aimX);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  // 왼쪽을 겨눌 때는 좌우로 뒤집어 그린다 (그냥 돌리면 총이 위아래로 뒤집힘)
  if (Math.abs(ang) > Math.PI / 2) { ctx.scale(-1, 1); ctx.rotate(Math.PI - ang); }
  else ctx.rotate(ang);
  if (w) {
    const img = w.img;
    // 왼쪽 끝 가운데 = 손잡이. 총도 어두워서 테두리를 두름
    drawWithOutline(img, 0, -Math.round(img.naturalHeight / 2), GUN_GLOW);
  } else {
    ctx.fillStyle = '#222';
    ctx.fillRect(1, -1.5, len, 3);
  }
  ctx.restore();
}

// 검술병 허리의 칼집: 뒤쪽 아래로 비스듬히 차고 있다
function drawSheath(a) {
  const img = IMAGES.weapon_sheath;
  ctx.save();
  ctx.translate(Math.round(a.x + a.w / 2), Math.round(a.y + (a.h < 34 ? 12 : 20)));
  ctx.scale(a.facing < 0 ? -1 : 1, 1);
  ctx.rotate(Math.PI - 0.35);           // 몸 뒤쪽으로 살짝 내려가게
  if (img) ctx.drawImage(img.img, 0, -Math.round(img.img.naturalHeight / 2));
  else { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, -1.5, 16, 3); }
  ctx.restore();
}

function drawPlayer() {
  const p = player;
  if (p.dead) return;
  const x = Math.round(p.x), y = Math.round(p.y);
  // 피격 신호: 무적 시간 동안 깜빡이고, 맞은 직후 잠깐은 붉게 물든다
  // (성역 스킬로 얻은 무적은 따로 연출이 있으므로 깜빡이지 않는다)
  const blinking = p.invuln > 0 && p.aegis <= 0;
  if (blinking && (frame >> 1) % 3 === 0) return;
  const hurt = p.hurtFlash > 0 && (frame >> 1) % 2 === 0 ? '#ff5a5a' : null;
  if (drawSprite('player', p, p.facing, animOf(p), hurt)) {
    if (spriteGun('player')) drawGunAt(x + p.w / 2, y + 14, 14);
    return;
  }
  // 몸통 (군복)
  ctx.fillStyle = '#5a7d4a'; ctx.fillRect(x, y + 6, p.w, p.h - 6);
  ctx.fillStyle = '#3f5a33'; ctx.fillRect(x, y + p.h - 4, p.w, 4);
  // 머리 + 백발 + 수염
  ctx.fillStyle = '#e0c09a'; ctx.fillRect(x + 3, y, 8, 7);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 3, y, 8, 2); ctx.fillRect(x + (p.facing > 0 ? 6 : 3), y + 5, 5, 2);
  // 총
  ctx.fillStyle = '#222';
  ctx.save();
  ctx.translate(x + p.w / 2, y + 10);
  ctx.rotate(Math.atan2(p.aimY, p.aimX));
  ctx.fillRect(1, -1.5, 11, 3);
  ctx.restore();
}

// 피격 판정 코어를 눈에 보이게 (슈팅 게임의 그 점)
function drawCore() {
  const p = player;
  if (p.dead) return;
  const x = Math.round(coreX(p)), y = Math.round(coreY(p));
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#9fd4ff';
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 1, y - 1, 2, 2);
  ctx.restore();
}

// 힐러 스킬 '성역': 십자가 3개가 플레이어 주위를 돈다
function drawAegis() {
  const p = player;
  if (!(p.aegis > 0) || p.dead) return;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const img = IMAGES.weapon_cross;
  ctx.save();
  ctx.globalAlpha = p.aegis < 40 ? 0.4 + ((frame >> 2) % 2) * 0.4 : 1;   // 끝날 때 깜빡임
  ctx.strokeStyle = 'rgba(255,230,120,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(Math.round(cx), Math.round(cy), 24, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const ang = frame * 0.05 + (i * Math.PI * 2) / 3;
    const x = Math.round(cx + Math.cos(ang) * 24), y = Math.round(cy + Math.sin(ang) * 24);
    if (img) drawWithOutline(img.img, x - Math.round(img.img.naturalWidth / 2),
                             y - Math.round(img.img.naturalHeight / 2), CROSS_GLOW);
    else { ctx.fillStyle = '#ffe066'; ctx.fillRect(x - 1, y - 5, 3, 11); ctx.fillRect(x - 4, y - 2, 9, 3); }
  }
  ctx.restore();
}

// 레벨 표시: 머리 위 노란 점 (Lv2 = 1개, Lv3 = 2개)
function drawAllies() {
  for (const a of allies) {
    if (drawSprite('ally_' + a.type, a, a.facing, a.anim)) {
      // 손에 든 무기 (힐러는 공격이 없어 그리지 않음)
      // 부유 그림에는 무기(총·칼집)가 이미 들어 있어 게임이 따로 그리지 않는다
      continue;
    }
    const x = Math.round(a.x), y = Math.round(a.y);
    // 몸통 (병과 색) + 머리
    ctx.fillStyle = SQUAD_TYPES[a.type].color; ctx.fillRect(x, y + 6, a.w, a.h - 6);
    ctx.fillStyle = '#e0c09a'; ctx.fillRect(x + 3, y, 8, 7);
    ctx.fillStyle = '#333'; ctx.fillRect(x + 3, y, 8, 2);
    // 검술병: 머리띠만 그리고 무기(칼)는 drawShields 에서 그림
    if (a.type === 'sword') { ctx.fillStyle = '#7a2b22'; ctx.fillRect(x + 2, y + 1, 10, 2); drawSheath(a); continue; }
    if (a.type === 'healer') { ctx.fillStyle = '#e03b3b'; ctx.fillRect(x + 6, y + 9, 2, 6); ctx.fillRect(x + 4, y + 11, 6, 2); }   // 십자 표시
    // 무기 (병과별 모양)
    ctx.save();
    ctx.translate(x + a.w / 2, y + (a.h < 24 ? 6 : 10));
    ctx.rotate(Math.atan2(player.aimY, player.aimX));
    ctx.fillStyle = '#222';
    if (a.type === 'sniper') ctx.fillRect(1, -1, 19, 2);
    else ctx.fillRect(1, -1.5, 7, 3);
    ctx.restore();
  }
}

// 검술병의 초승달 칼 (플레이어 위에 겹쳐 보이도록 플레이어 다음에 그림)
function drawShields() {
  if (player.dead) return;
  const blade = IMAGES.weapon_blade;
  ctx.save();
  ctx.lineCap = 'round';
  for (const s of shields) {
    // 지나온 자리에 잔상 2개 (반시계로 도니 각도가 큰 쪽이 뒤)
    if (blade) {
      for (const [back, alpha] of [[0.20, 0.18], [0.10, 0.34]]) {
        const a = s.ang + back;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(Math.round(s.cx + Math.cos(a) * s.r2), Math.round(s.cy + Math.sin(a) * s.r2));
        ctx.rotate(a - Math.PI / 2);
        drawCentered(tinted(blade.img, BLADE_GLOW), null);
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(Math.round(s.x), Math.round(s.y));
    ctx.rotate(s.ang - Math.PI / 2);        // 반시계로 도는 방향으로 칼끝이 향하게
    if (blade) {
      drawCentered(blade.img, BLADE_GLOW);
    } else {
      ctx.strokeStyle = BLADE_GLOW; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.strokeStyle = '#2a3440'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

// 보스 레이저: 경고선 → 굵은 빔
function drawBeams() {
  for (const b of beams) {
    const warn = b.t > b.fire;
    const len = beamLen(b);
    ctx.save();
    ctx.translate(b.x, Math.round(b.y));
    ctx.rotate(b.ang);                      // 이 뒤로는 "빔을 따라가는" 좌표계
    if (warn) {
      // 전조: 발사가 가까워질수록 위험 구역이 두꺼워지고 깜박임이 빨라진다
      const k = 1 - (b.t - b.fire) / (130 - b.fire);   // 0 → 1 (발사 직전)
      const band = b.h * (0.25 + k * 0.75);            // 실제로 맞는 높이를 미리 보여 준다
      // 위험 구역 (은은하게 항상 보임)
      ctx.fillStyle = `rgba(255,60,50,${0.10 + k * 0.16})`;
      ctx.fillRect(0, -band / 2, len, band);
      // 위아래 경계선
      ctx.fillStyle = `rgba(255,120,90,${0.35 + k * 0.4})`;
      ctx.fillRect(0, Math.round(-band / 2), len, 1);
      ctx.fillRect(0, Math.round(band / 2) - 1, len, 1);
      // 가운데 붉은 궤적선: 깜박임이 4프레임 → 1프레임으로 빨라진다
      const rate = Math.max(1, 4 - Math.floor(k * 3));
      if (Math.floor(b.t / rate) % 2) {
        ctx.fillStyle = 'rgba(255,60,50,0.95)';
        ctx.fillRect(0, -1, len, 2);
      } else {
        ctx.fillStyle = 'rgba(255,60,50,0.45)';
        ctx.fillRect(0, -0.5, len, 1);
      }
    } else {
      const h = b.h * Math.min(1, (b.fire - b.t) / 4 + 0.3);
      ctx.fillStyle = 'rgba(255,120,40,0.35)'; ctx.fillRect(0, -h / 2, len, h);
      ctx.fillStyle = 'rgba(255,210,80,0.9)';  ctx.fillRect(0, -h / 4, len, h / 2);
      ctx.fillStyle = '#ffffff';               ctx.fillRect(0, -1, len, 2);
    }
    ctx.restore();

    if (warn) {
      const k = 1 - (b.t - b.fire) / (130 - b.fire);
      // 포구의 충전 빛 (점점 커진다)
      const r = 3 + k * 9;
      ctx.save();
      ctx.globalAlpha = 0.45 + k * 0.5;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // 충전 불티가 포구로 빨려 들어간다
      if ((frame & 3) === 0) {
        const a2 = rand(0, Math.PI * 2), d = 14 + rand(0, 10);
        particles.push({ x: b.x + Math.cos(a2) * d, y: b.y + Math.sin(a2) * d,
                         vx: -Math.cos(a2) * 2.2, vy: -Math.sin(a2) * 2.2,
                         life: 8, size: 2, color: '#ffd23f', grav: 0 });
      }
    }
  }
}

// 홍련 궁극기: 거대 분신 (잔상을 끌며 돌진)
// 궁극기 분신 한 칸 그리기 (칸 번호를 직접 골라 쓴다)
const ULT_DRAW = 6;          // 발도 동작 한 칸당 프레임 수 (0~2번 칸)
const ULT_HOLD = 3;          // 칼을 끝까지 뻗은 마지막 자세 = 3번 칸
function drawUltFrame(box, idx, tint) {
  const s = IMAGES.ult_sword;
  if (!s) return false;
  const { img, cfg } = s;
  const sc = cfg.scale || 1;
  const fw = cfg.frameW, fh = cfg.frameH, w = fw / sc, h = fh / sc;
  const cells = Math.max(1, Math.floor(img.naturalWidth / fw));
  const i = Math.min(idx, cells - 1);
  const snap = v => Math.round(v * sc) / sc;
  ctx.save();
  ctx.translate(snap(box.x + box.w / 2), snap(box.y + box.h));
  ctx.drawImage(img, i * fw, 0, fw, fh, -Math.floor(w / 2), -h, w, h);
  if (tint) {
    ctx.globalAlpha *= 0.55;
    ctx.drawImage(tinted(img, tint), i * fw, 0, fw, fh, -Math.floor(w / 2), -h, w, h);
  }
  ctx.restore();
  return true;
}

function drawClones() {
  for (const c of clones) {
    const box = { x: c.x - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h };
    const fade = Math.min(1, c.life / 20);
    // 처음 20프레임만 칼을 뽑는 동작(0~3칸), 그 뒤 돌진은 다 뽑은 자세로 고정
    const idx = c.age < ULT_DRAW * ULT_HOLD ? Math.floor(c.age / ULT_DRAW) : ULT_HOLD;
    ctx.save();
    // 지나온 자리에 잔상 여섯 겹 (잔상도 같은 칸이라 자세가 흔들리지 않는다)
    for (const [back, al] of [[104, 0.05], [84, 0.08], [64, 0.12], [46, 0.17], [29, 0.24], [14, 0.33]]) {
      ctx.globalAlpha = al * fade;
      drawUltFrame({ ...box, x: box.x - back }, idx, BLADE_GLOW);
    }
    ctx.globalAlpha = fade;
    if (!drawUltFrame(box, idx, null)) {
      ctx.fillStyle = BLADE_GLOW;
      ctx.fillRect(Math.round(box.x), Math.round(box.y), box.w, box.h);
    }
    ctx.restore();
  }
}

// 포병 스킬: 하늘에서 내리꽂히는 포격 구역
function drawZones() {
  for (const z of zones) {
    const fade = Math.min(1, z.timer / 20);
    const a = (0.18 + ((frame >> 1) % 2) * 0.10) * fade;
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, `rgba(255,210,63,${a * 0.5})`);
    g.addColorStop(1, `rgba(255,120,28,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(z.x), 0, Math.round(z.w), GROUND_Y);
    // 가장자리 선과 바닥 불빛
    ctx.fillStyle = `rgba(255,230,120,${0.5 * fade})`;
    ctx.fillRect(Math.round(z.x), 0, 1, GROUND_Y);
    ctx.fillRect(Math.round(z.x + z.w) - 1, 0, 1, GROUND_Y);
    ctx.fillStyle = `rgba(255,170,60,${(0.5 + ((frame >> 2) % 2) * 0.3) * fade})`;
    ctx.fillRect(Math.round(z.x), GROUND_Y - 4, Math.round(z.w), 4);
  }
}

function drawEnemy(e) {
  const sc = e.scale || 1;
  if (sc !== 1) {                       // 장갑형처럼 같은 그림을 키워 쓰는 적
    const px = Math.round(e.x + e.w / 2), py = Math.round(e.y + e.h);
    ctx.save();
    ctx.translate(px, py); ctx.scale(sc, sc); ctx.translate(-px, -py);
  }
  // 아이템을 가진 기체는 붉게 물들이고 깜박인다
  const tint = e.carrier ? ((frame >> 3) % 2 ? '#ff3b3b' : '#ff8a5a') : null;
  const drawn = drawSprite(e.sprite || e.t, e, e.facing, 'run', tint);
  if (sc !== 1) ctx.restore();
  if (drawn) return;
  // 도형 그림은 원래 기준 크기(ew x eh)로 그린 뒤 지금 판정 크기에 맞춰 늘려 그림
  const [ew, eh] = { soldier: [14, 24], drone: [18, 12], mid: [26, 34] }[e.t] || [e.w, e.h];
  const x = 0, y = 0;
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.scale(e.w / ew, e.h / eh);
  switch (e.t) {
    case 'soldier': // 안드로이드 병사
      ctx.fillStyle = col(e, '#9aa3ad'); ctx.fillRect(x, y + 6, ew, eh - 6);
      ctx.fillStyle = col(e, '#c7ced6'); ctx.fillRect(x + 3, y, 8, 7);
      ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x + (e.facing > 0 ? 7 : 3), y + 3, 4, 2);
      ctx.fillStyle = '#333'; ctx.fillRect(e.facing > 0 ? x + ew - 3 : x - 5, y + 9, 8, 3);
      break;
    case 'drone':
      ctx.fillStyle = col(e, '#707a85'); ctx.fillRect(x, y + 3, ew, eh - 3);
      ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x + ew / 2 - 2, y + 7, 4, 3);
      ctx.fillStyle = '#ccc';
      if ((frame >> 1) % 2) ctx.fillRect(x - 3, y, ew + 6, 1); else ctx.fillRect(x + 3, y, ew - 6, 1);
      break;
    case 'mid':   // 중형보스 (그림이 없을 때만 쓰이는 도형)
      ctx.fillStyle = col(e, '#4b5560'); ctx.fillRect(x, y + 10, ew, eh - 10);
      ctx.fillStyle = col(e, '#6b7885'); ctx.fillRect(x + 4, y, ew - 8, 12);
      ctx.fillStyle = '#8fd3ff'; ctx.fillRect(x + 6, y + 16, ew - 12, 4);
      ctx.fillStyle = '#333'; ctx.fillRect(e.facing > 0 ? x + ew - 4 : x - 10, y + 6, 14, 5);
      break;
  }
  ctx.restore();
}

// 단단한 적(체력 5 이상)은 맞을 때부터 머리 위에 체력바를 보여 준다
function drawBoss() {
  const b = boss;
  if (!b) return;
  if (b.dead && b.deathTimer <= 0) return;
  // 그림 자체가 부유 애니메이션을 갖고 있어 확대·축소 연출은 쓰지 않는다
  // (2배 스프라이트를 비정수 배율로 늘리면 픽셀이 깨져 보인다)
  const moving = Math.abs(b.x - (b.lastX ?? b.x)) > 0.05;
  b.lastX = b.x;
  const drawn = drawSprite('boss', b, 1, moving ? 'run' : 'idle');
  if (drawn) return;
  const x = Math.round(b.x), y = Math.round(b.y);
  // 돌진 준비 중 붉게 깜빡임
  const charging = b.state === 'charge' && b.count === 0 && (frame >> 2) % 2;
  const body = b.flash > 0 ? '#fff' : charging ? '#b33' : '#4d5561';
  // 궤도
  ctx.fillStyle = '#222'; ctx.fillRect(x, y + b.h - 14, b.w, 14);
  ctx.fillStyle = '#555';
  for (let i = 0; i < 7; i++) ctx.fillRect(x + 4 + i * 12 - ((frame >> 1) % 4), y + b.h - 10, 6, 6);
  // 차체
  ctx.fillStyle = body; ctx.fillRect(x + 4, y + 18, b.w - 8, b.h - 32);
  // 포탑
  ctx.fillStyle = b.flash > 0 ? '#fff' : '#6b7480'; ctx.fillRect(x + 22, y, 44, 22);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 16, y + 11, 40, 6);
  // 코어
  ctx.fillStyle = (frame >> 3) % 2 ? '#ff3b3b' : '#ff8080'; ctx.fillRect(x + 40, y + 26, 10, 8);
}

// 저격 폭탄 한 발. 원본 그림이 위를 보고 있으므로 진행 방향 + 90도로 돌린다
function drawBomb(b) {
  const s = IMAGES.bomb;
  const rot = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  if (!s) {                                   // 그림이 없으면 예전처럼 동그란 탄
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const { img, cfg } = s;
  const sc = cfg.scale || 1;
  const big = b.size || 1;
  const fw = cfg.frameW, fh = cfg.frameH, w = fw / sc * big, h = fh / sc * big;
  const cells = Math.max(1, Math.floor(img.naturalWidth / fw));
  const idx = Math.floor(frame * 5 / 60 + (b.x | 0)) % cells;   // 탄마다 화염 위상이 다르게
  // 꼬리 불꽃 잔상
  for (const [back, alpha] of [[3, 0.2], [1.5, 0.38]]) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(b.x - b.vx * back), Math.round(b.y - b.vy * back));
    ctx.rotate(rot);
    ctx.drawImage(img, idx * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  ctx.rotate(rot);
  ctx.drawImage(img, idx * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawProjectiles() {
  // 아군 탄: 탄환 그림을 진행 방향으로 회전해서 그림 (그림이 없으면 늘어진 선)
  for (const b of pBullets) {
    // 힐러의 십자가
    if (b.cross) {
      const cx = Math.round(b.x), cy = Math.round(b.y);
      const ci = IMAGES.weapon_cross;
      if (ci) {
        const i2 = ci.img;
        ctx.save();
        ctx.globalAlpha = (frame >> 2) % 2 ? 1 : 0.82;
        drawWithOutline(i2, cx - Math.round(i2.naturalWidth / 2), cy - Math.round(i2.naturalHeight / 2), CROSS_GLOW);
        ctx.restore();
      } else {
        ctx.fillStyle = (frame >> 2) % 2 ? '#ffffff' : '#ffe066';
        ctx.fillRect(cx - 2, cy - 8, 4, 18);
        ctx.fillRect(cx - 7, cy - 3, 14, 4);
      }
      continue;
    }
    // 스노우화이트 폭탄 (지원 포탄 · 궁극기 폭탄 비)
    if (b.bomb) { drawBomb(b); continue; }
    // 던진 칼은 빙글빙글 돌고, 나머지는 진행 방향으로 눕는다
    const img = b.thrown ? IMAGES.weapon_blade : IMAGES['pbullet_' + (b.sniper ? 'l' : 's')];
    if (img) {
      const i = img.img;
      const big = b.ult || 1;                // 궁극기 칼은 조금 더 크게
      // 궁극기 칼은 돌지 않고 칼끝이 진행 방향을 향한다. 던진 칼은 빙글빙글 돈다
      const rot = b.straight ? Math.atan2(b.vy, b.vx) : (frame + (b.x | 0)) * (b.spin || 0.35);
      if (b.thrown) {
        // 날아간 자리에 잔상 2개 (칼이 어두워 배경에 묻히는 것을 막음)
        for (const [back, alpha] of [[2, 0.18], [1, 0.34]]) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(Math.round(b.x - b.vx * back), Math.round(b.y - b.vy * back));
          ctx.rotate(b.straight ? rot : rot - back * 0.7);
          ctx.scale(big, big);
          drawCentered(tinted(i, BLADE_GLOW), null);
          ctx.restore();
        }
      }
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));
      ctx.rotate(b.thrown ? rot : Math.atan2(b.vy, b.vx));
      ctx.scale(big, big);
      drawCentered(i, b.thrown ? BLADE_GLOW : null);
      ctx.restore();
      continue;
    }
    const sp = Math.hypot(b.vx, b.vy);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = b.r;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx / sp * 4, b.y - b.vy / sp * 4);
    ctx.lineTo(b.x + b.vx / sp * 4, b.y + b.vy / sp * 4);
    ctx.stroke();
  }
  // 적 탄: 크기에 맞는 탄환 그림을 쓰고, 없으면 네모로 그림
  for (const b of eBullets) {
    const img = IMAGES['bullet_' + (b.r >= 5 ? 'l' : b.r >= 3 ? 'm' : 's')];
    // 분열탄은 터지기 직전에 깜박여 경고한다
    if (b.split && b.fuse < 30 && (b.fuse >> 1) % 2) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (img) {
      const i = img.img;
      ctx.drawImage(i, Math.round(b.x - i.naturalWidth / 2), Math.round(b.y - i.naturalHeight / 2));
    } else {
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.round(b.x - b.r), Math.round(b.y - b.r), b.r * 2, b.r * 2);
    }
  }
  // 파워업 아이템 (붉은 기체가 떨군 것)
  for (const it of items) {
    const x = Math.round(it.x), y = Math.round(it.y);
    const blink = (frame >> 2) % 2;
    ctx.fillStyle = it.life < 180 && (frame >> 1) % 2 ? 'rgba(0,0,0,0)' : (blink ? '#ff5a5a' : '#ffd23f');
    ctx.fillRect(x, y, 14, 14);
    ctx.fillStyle = '#2a1416';
    ctx.fillRect(x + 1, y + 1, 12, 12);
    ctx.fillStyle = blink ? '#ffd23f' : '#ff9f1c';
    ctx.fillRect(x + 3, y + 3, 8, 8);
    text('P', x + 7, y + 11, 9, '#2a1416', 'center');
  }
  for (const w of warns) {
    if ((w.t >> 2) % 2) {
      ctx.fillStyle = 'rgba(255,60,60,0.35)'; ctx.fillRect(w.x - 6, 0, 12, GROUND_Y);
      ctx.fillStyle = '#ff3b3b'; ctx.fillRect(w.x - 6, GROUND_Y - 3, 12, 3);
    }
  }
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
}

function drawHUD() {
  const p = player;
  text(`LIFE x${Math.max(lives, 0)}`, 8, 14);
  // HP 칸 (총탄을 맞을 수 있는 횟수)
  for (let i = 0; i < p.maxHp; i++) {
    const x = 66 + i * 11;
    ctx.fillStyle = '#000'; ctx.fillRect(x, 6, 9, 9);
    ctx.fillStyle = i < p.hp ? '#ff5a6e' : '#4a2a30'; ctx.fillRect(x + 1, 7, 7, 7);
  }
  // 파워 단계 (붉은 기체를 잡아 아이템을 먹으면 오른다)
  text(`POWER ${plv}`, 8, 38, 10, '#7dff8a');
  for (let i = 0; i < MAX_POWER; i++) {
    ctx.fillStyle = i < plv ? '#7dff8a' : '#2c3a2c';
    ctx.fillRect(66 + i * 7, 32, 5, 6);
  }
  text(`SCORE ${score}`, W - 8, 14, 10, '#ffe066', 'right');
  text(`STAGE ${stage}`, W / 2, 14, 9, '#fff', 'center');
  // 클리어 시간 보너스가 걸려 있으므로 남은 여유 시간을 같이 보여 준다
  const left = PAR_TIME - playTime / 60;
  text(mmss(playTime / 60), W / 2, 26, 9, left > 30 ? '#7dff8a' : left > 0 ? '#ffe066' : '#888', 'center');
  if (muted) text('MUTE (M)', W - 8, 26, 8, '#888', 'right');
  else text(powerBonus() ? `탄 ${shotLines()}줄 · 스킬 +${Math.round((skillMul() - 1) * 100)}%` : `탄 ${shotLines()}줄`,
            W - 8, 26, 8, '#9fd4ff', 'right');
  if (graze > 0) text(`GRAZE ${graze}`, W - 8, 38, 8, '#7dff8a', 'right');

  if (boss && !boss.dead) {
    ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 101, H - 17, 202, 10);
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(W / 2 - 100, H - 16, 200 * boss.hp / boss.maxHp, 8);
    text('드로론', W / 2, H - 20, 9, '#fff', 'center');
  }
  if (isTouch) drawTouchPad(); else drawSkillBar();
  if (bossWarn > 0 && (frame >> 3) % 2) text('[ WARNING ]', W / 2, H / 2 + 7, 24, '#ff3b3b', 'center');
  if (msg) text(msg.text, W / 2, 70, 12, '#ffe066', 'center');
}

// 액티브 스킬 3칸: 초상화 + 쿨타임 (준비되면 밝게, 아니면 어둡게 깔리고 남은 초가 뜬다)
function drawSkillBar() {
  const cw = 30, ch = 34, by = H - ch - 6;              // 칸 크기
  SQUAD_ORDER.forEach((type, i) => {
    const T = SQUAD_TYPES[type], a = allies.find(o => o.type === type);
    const x = 8 + i * (cw + 6), ready = a && a.skillCool <= 0;
    const f = a ? 1 - a.skillCool / (T.skillCool * skillCut()) : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x, by, cw, ch);
    // 초상화
    const face = IMAGES['face_' + type];
    if (face) {
      const img = face.img, sc = 2;                     // 48px 그림 → 24px 로
      ctx.save();
      // 아직 합류 전이면 실루엣처럼 아주 어둡게, 쿨타임 중이면 조금 어둡게
      ctx.globalAlpha = !a ? 0.16 : ready ? 1 : 0.45;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
                    x + 3, by + 3, img.naturalWidth / sc, img.naturalHeight / sc);
      ctx.restore();
    } else {
      ctx.fillStyle = ready ? T.color : '#444';
      ctx.fillRect(x + 3, by + 3, 24, 24);
    }
    // 합류 전: 잠금 표시 (파워업 몇 단계에서 열리는지 알려 준다)
    if (!a) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 3, by + 3, 24, 24);
      text('?', x + 15, by + 20, 13, '#666', 'center');
      text(`P${i + 1}`, x + 15, by + 9, 7, '#555', 'center');
    }
    // 쿨타임: 아래에서 위로 차오르는 어두운 막
    if (!ready && a) {
      ctx.fillStyle = 'rgba(10,10,20,0.6)';
      const h = Math.round(24 * (1 - f));
      ctx.fillRect(x + 3, by + 3, 24, h);
      text(`${Math.ceil(a.skillCool / 60)}`, x + 15, by + 19, 11, '#fff', 'center');
    }
    // 테두리 + 키 표시
    ctx.strokeStyle = ready ? '#ffe066' : '#3a3a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, by + 0.5, cw - 1, ch - 1);
    ctx.fillStyle = ready ? T.color : '#333';
    ctx.fillRect(x + 1, by + ch - 10, cw - 2, 9);
    text(KEY_LABEL[type], x + cw / 2, by + ch - 2, 9, ready ? '#fff' : '#888', 'center');
  });
}

// 휴대폰용 스킬 버튼 세 개 (손가락으로 누를 수 있게 크게)
function drawTouchPad() {
  for (const b of touchButtons()) {
    const T = SQUAD_TYPES[b.type], a = allies.find(o => o.type === b.type);
    const ready = a && a.skillCool <= 0;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const face = IMAGES['face_' + b.type];
    if (face) {
      const img = face.img;
      ctx.save();
      ctx.globalAlpha = !a ? 0.16 : ready ? 1 : 0.4;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, b.x + 3, b.y + 3, b.w - 6, b.w - 6);
      ctx.restore();
    }
    if (!a) {                                  // 아직 합류 전
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.w - 6);
      text('?', b.x + b.w / 2, b.y + b.h / 2 + 5, 15, '#666', 'center');
    } else if (!ready) {                       // 쿨타임: 남은 초
      const f = 1 - a.skillCool / (T.skillCool * skillCut());
      ctx.fillStyle = 'rgba(10,10,20,0.6)';
      ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, Math.round((b.w - 6) * (1 - f)));
      text(`${Math.ceil(a.skillCool / 60)}`, b.x + b.w / 2, b.y + b.h / 2 + 5, 14, '#fff', 'center');
    }
    ctx.strokeStyle = ready ? '#ffe066' : '#3a3a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  }
  // 끌고 있는 방향 표시
  if (touch.on && state === 'play') {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#9fd4ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(touch.bx, touch.by, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#9fd4ff';
    ctx.beginPath();
    ctx.arc(touch.bx + touch.dx, touch.by + touch.dy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 일시정지 화면: 동료별 패시브와 액티브 스킬
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  text('PAUSE', W / 2, 20, 16, '#fff', 'center');
  text('P / Esc 로 계속', W / 2, 32, 8, '#bbb', 'center');
  // 소리 설정 (BGM = - / = , 효과음 = [ / ])
  const bar = (label, v, y, keys) => {
    const n = Math.round(v * 10);
    text(label, W - 168, y, 9, '#ffe066');
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i < n ? (muted ? '#666' : '#7dff8a') : '#333';
      ctx.fillRect(W - 126 + i * 9, y - 7, 7, 8);
    }
    text(`${n * 10}%  ${keys}`, W - 24, y, 8, '#bbb', 'right');
  };
  bar('BGM', bgmVolume, 18, '- / =');
  bar('효과음', sfxVolume, 32, '[ / ]');
  if (muted) text('음소거 (M)', W - 24, 44, 8, '#888', 'right');

  text('분대 — 레벨이 오르면 패시브와 스킬이 함께 강해집니다', 14, 52, 9, '#ffe066');
  let y = 70;
  for (const type of SQUAD_ORDER) {
    const T = SQUAD_TYPES[type], mine = allies.find(a => a.type === type);
    ctx.fillStyle = T.color; ctx.fillRect(14, y - 8, 10, 10);
    text(`${T.name}${mine ? ` Lv${mine.level}` : ''}`, 30, y, 10, mine ? '#fff' : '#888');
    text(`패시브  ${T.passive}`, 92, y, 8, '#9fd4ff');
    text(`${KEY_LABEL[type]}  ${T.skill}`, 92, y + 12, 8, '#7dff8a');
    y += 32;
  }
  text(`POWER ${plv} / ${MAX_POWER}  ·  3단계까지는 탄 수, 그 위는 스킬 피해 +${Math.round((skillMul() - 1) * 100)}% · 쿨 -${Math.round((1 - skillCut()) * 100)}%`,
       14, y + 6, 9, '#ffe066');
}

// 화면 가운데 알림 상자 (보스 처치 등)
function drawPopup() {
  const p = popup;
  const bw = 300, bh = 86, x = Math.round((W - bw) / 2), y = Math.round((H - bh) / 2) - 6;
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
  // 상자
  ctx.fillStyle = '#17121d'; ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
  ctx.strokeStyle = 'rgba(255,224,102,0.35)';
  ctx.strokeRect(x + 3.5, y + 3.5, bw - 7, bh - 7);
  // 반짝이는 파편 표시
  const cx = x + 26, cy = y + bh / 2;
  ctx.fillStyle = (frame >> 3) % 2 ? '#ffe066' : '#fff6c0';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 11); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 11); ctx.lineTo(cx - 8, cy);
  ctx.closePath(); ctx.fill();
  text(p.title, x + 46, y + 24, 11, '#ffe066');
  p.lines.forEach((line, i) => text(line, x + 46, y + 44 + i * 15, 10, '#fff'));
  if (p.t > 24 && (frame >> 4) % 2) text('Enter 로 계속', x + bw - 10, y + bh - 8, 8, '#bbb', 'right');
}

function overlay(title, sub, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  text(title, W / 2, 100, 26, color, 'center');
  if (sub) text(sub, W / 2, 125, 10, '#ddd', 'center');
}

function draw() {
  const ox = shake > 0.3 ? rand(-shake, shake) : 0;
  const oy = shake > 0.3 ? rand(-shake, shake) : 0;

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);   // 이 뒤로는 전부 게임 좌표(480x270)로 그린다
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));
  drawBackground();
  if (stageInfo && stageInfo.tint) {        // 스테이지 색감 (2탄은 밤)
    ctx.fillStyle = stageInfo.tint;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.translate(-Math.round(camX), 0);
  drawLevel();
  for (const it of enemies) drawEnemy(it);
  drawBoss();
  drawAllies();
  drawPlayer();
  drawCore();
  drawAegis();
  drawShields();
  drawProjectiles();
  drawClones();
  drawZones();
  drawBeams();
  ctx.restore();
  ctx.restore();

  if (state === 'title') {
    overlay('LAST VETERAN', '로봇휴먼 · 분대 횡스크롤 슈팅', '#ffe066');
    text('비행: ← ↑ → ↓ / W A S D (8방향 자유 이동)     사격: 자동', W / 2, 152, 10, '#fff', 'center');
    text('파워업 1~3단계는 탄 수 증가, 그 이후는 스킬 피해·쿨타임 강화', W / 2, 168, 10, '#fff', 'center');
    text('스킬: Z  홍련     X  라푼젤     C  스노우화이트     일시정지: P / Esc', W / 2, 184, 10, '#fff', 'center');
    text(`소리 끄기: M     BGM: - / = (${Math.round(bgmVolume * 100)}%)     효과음: [ / ] (${Math.round(sfxVolume * 100)}%)`,
         W / 2, 218, 9, '#9fd4ff', 'center');
    text('붉은 기체를 잡고 P 아이템을 먹으면 파워업 (탄 수 증가 · 동료 강화)', W / 2, 204, 10, '#9fd4ff', 'center');
    if ((frame >> 5) % 2) text('PRESS ENTER', W / 2, 235, 14, '#ffe066', 'center');
    return;
  }
  drawHUD();
  if (state === 'pause') drawPause();
  if (popup) drawPopup();
  if (state === 'over') overlay('GAME OVER', `SCORE ${score}  ·  Enter로 이름 등록`, '#ff3b3b');
  if (state === 'clear') drawResult();
  if (state === 'name') drawNameEntry();
  if (state === 'rank') drawRanking();
}

// 클리어 정산 화면: 기본 점수 → 시간 보너스 → 목숨 보너스 → 합계
function drawResult() {
  const r = result;
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
  text('MISSION COMPLETE', W / 2, 52, 22, '#ffe066', 'center');
  if (!r) { text(`SCORE ${score}  ·  Enter로 재시작`, W / 2, 80, 10, '#ddd', 'center'); return; }

  const row = (label, value, y, color = '#fff', note = '') => {
    text(label, W / 2 - 110, y, 10, color);
    text(value, W / 2 + 110, y, 10, color, 'right');
    if (note) text(note, W / 2 + 118, y, 8, '#888');
  };
  let y = 92;
  row('기본 점수', String(r.base), y, '#ddd'); y += 18;
  row(`클리어 시간  ${mmss(r.secs)}`, r.timeBonus ? `+${r.timeBonus}` : '+0', y,
      r.timeBonus ? '#7dff8a' : '#777',
      r.timeBonus ? `기준 ${mmss(PAR_TIME)}` : `기준 ${mmss(PAR_TIME)} 초과`);
  y += 18;
  row(`남은 목숨  x${Math.max(lives, 0)}`, r.lifeBonus ? `+${r.lifeBonus}` : '+0', y,
      r.lifeBonus ? '#7dff8a' : '#777', `1개당 ${LIFE_BONUS}`);
  y += 12;
  ctx.fillStyle = '#555'; ctx.fillRect(W / 2 - 112, y, 224, 1);
  y += 20;
  text('합계', W / 2 - 110, y, 13, '#ffe066');
  text(String(r.total), W / 2 + 110, y, 13, '#ffe066', 'right');
  if ((frame >> 5) % 2) text('PRESS ENTER  —  이름 등록', W / 2, H - 18, 11, '#ffe066', 'center');
}

// 이름 입력 화면 (알파벳만, 최대 20자)
function drawNameEntry() {
  ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, W, H);
  text('이름을 입력하세요', W / 2, 60, 16, '#ffe066', 'center');
  text(`SCORE ${score}`, W / 2, 80, 11, '#9fd4ff', 'center');

  // 입력 칸: 20칸을 밑줄로 그려 몇 자까지 되는지 보여 준다
  const cw = 20, n = RANK.NAME_MAX;
  const x0 = Math.round(W / 2 - (n * cw) / 2);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * cw;
    const on = i < entryName.length;
    ctx.fillStyle = on ? '#ffe066' : '#3a3a3a';
    ctx.fillRect(x + 2, 118, cw - 4, 2);
    if (on) text(entryName[i], x + cw / 2, 114, 15, '#fff', 'center');
    // 커서
    else if (i === entryName.length && (frame >> 4) % 2) {
      ctx.fillStyle = '#ffe066'; ctx.fillRect(x + 2, 116, cw - 4, 2);
    }
  }
  text(isTouch ? '이름을 치고 확인(엔터)을 누르세요' : 'A~Z 입력    Backspace 지우기    Enter 등록',
       W / 2, 146, 9, '#bbb', 'center');
  if (entryMsg) text(entryMsg, W / 2, 166, 9, entryBusy ? '#9fd4ff' : '#ff7a7a', 'center');
  else if (!RANK.online()) text('랭킹 서버가 설정되지 않아 이 브라우저에만 기록됩니다', W / 2, 166, 8, '#888', 'center');
}

// 순위표
function drawRanking() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  text('RANKING', W / 2, 34, 18, '#ffe066', 'center');
  if (rankOffline) text('이 브라우저 기록', W / 2, 48, 8, '#888', 'center');

  const rows = rankRows || [];
  if (!rows.length) text('아직 기록이 없습니다', W / 2, 120, 11, '#888', 'center');
  let y = 66;
  rows.forEach((r, i) => {
    const mine = rankMine && i + 1 === rankMine;
    const col = mine ? '#7dff8a' : i === 0 ? '#ffe066' : '#ddd';
    text(String(i + 1).padStart(2, ' '), W / 2 - 150, y, 10, col);
    text(r.name || '-', W / 2 - 118, y, 10, col);
    text(String(r.score), W / 2 + 90, y, 10, col, 'right');
    if (r.secs) text(mmss(r.secs), W / 2 + 150, y, 9, '#888', 'right');
    y += 16;
  });
  if (rankMine > rows.length) text(`내 순위 ${rankMine}위`, W / 2, y + 8, 10, '#7dff8a', 'center');
  if ((frame >> 5) % 2) text('PRESS ENTER', W / 2, H - 16, 11, '#ffe066', 'center');
}

// ===== 메인 루프 (60fps 고정 스텝) =====
const STEP = 1000 / 60;
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= STEP) {
    update();
    for (const k in pressed) delete pressed[k];
    acc -= STEP;
  }
  draw();
  requestAnimationFrame(loop);
}
resetGame();
requestAnimationFrame(loop);
