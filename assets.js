// =====================================================
// 아트 / 사운드 등록표
// - 파일을 assets 폴더에 넣고, 아래 경로와 칸 크기만 맞추면 게임에 반영됩니다.
// - 파일이 없으면 도형 그래픽 / 무음으로 자동 대체됩니다. 하나씩 천천히 넣어도 됩니다.
// - 자세한 방법은 에셋_가이드.md 를 보세요.
// =====================================================
const ASSETS = {

  // ----- 캐릭터 스프라이트 시트 -----
  // 프레임을 "가로 한 줄"로 이어 붙인 투명 배경 PNG
  // 캐릭터는 오른쪽을 보게 그립니다 (왼쪽을 볼 때는 게임이 자동으로 뒤집음)
  // frameW / frameH : 한 칸의 가로 / 세로 크기(px)
  // anims : { 동작이름: [시작 칸 번호(0부터), 칸 수, 초당 프레임 수] }
  // gun   : false 로 적으면 게임이 그려주는 총을 숨깁니다 (그림에 총까지 그렸을 때)
  sprites: {
    // 11칸 구성: 0 서기 / 1~8 달리기 / 9 점프 / 10 앉기
    // 플레이어: 공중전용 부유 6칸 (2배 해상도). 그림에 총이 들어 있어 gun: false
    player:       { file: 'assets/sprites/player.png',       frameW: 96, frameH: 96, scale: 2, gun: false, anims: { idle: [0, 6, 8] } },

    // 동료 3종 (검술병은 칼을 게임이 그리므로 그림에는 무기 없이)
    // 동료는 겹치는 달리기 칸을 빼서 칸 수가 서로 다름 (변환 도구가 알려주는 값을 그대로 적음)
    // 검술병: 공중전용 부유 6칸 (2배 해상도). 그림에 칼집이 들어 있어 게임이 따로 그리지 않음
    ally_sword:   { file: 'assets/sprites/ally_sword.png',   frameW: 96, frameH: 96, scale: 2, anims: { idle: [0, 6, 8] } },
    // 힐러는 떠 있기만 하므로 부유 4칸 반복만 사용 (달리기·점프·앉기 없음)
    // 힐러만 2배 해상도로 시험 중 (scale: 2 = 그림이 게임 좌표의 2배로 그려져 있음)
    ally_healer:  { file: 'assets/sprites/ally_healer.png',  frameW: 96, frameH: 96, scale: 2, anims: { idle: [0, 4, 6] } },
    // 포병: 공중전용 부유 6칸 (2배 해상도). 그림에 총이 들어 있음
    ally_sniper:  { file: 'assets/sprites/ally_sniper.png',  frameW: 96, frameH: 96, scale: 2, gun: false, anims: { idle: [0, 6, 8] } },

    // M1 (4족 보행 메카) = 기본 적. 5칸: 0 서기 / 1~4 걷기
    soldier:      { file: 'assets/sprites/soldier.png',      frameW: 96, frameH: 96, scale: 2, anims: { idle: [0, 1, 1], run: [1, 4, 8] } },
    // M3 (중형보스). 5칸: 0 서기 / 1~4 걷기
    mid:          { file: 'assets/sprites/mid.png',          frameW: 128, frameH: 128, scale: 2, anims: { idle: [0, 1, 1], run: [1, 4, 8] } },
    // M2 (비행 적). 5칸: 0 정지 / 1~4 이동 (2배 해상도)
    drone:        { file: 'assets/sprites/drone.png',        frameW: 96, frameH: 96, scale: 2, anims: { idle: [0, 1, 1], run: [1, 4, 8] } },
    // M4 소형 비행 / M5 대형 비행 — 부유 6칸 (2배 해상도)
    flyer_s:      { file: 'assets/sprites/flyer_s.png',      frameW: 128, frameH: 128, scale: 2, anims: { idle: [0, 6, 10] } },
    flyer_l:      { file: 'assets/sprites/flyer_l.png',      frameW: 256, frameH: 256, scale: 2, anims: { idle: [0, 6, 8] } },
    // M6 중간보스 — 부유 6칸 (2배 해상도)
    mini:         { file: 'assets/sprites/mini.png',         frameW: 224, frameH: 224, scale: 2, anims: { idle: [0, 6, 7] } },
    // 홍련 궁극기: 거대 분신 (검술_FinalAttack 앞 4칸)
    // 칼이 옆으로 길어 가로로 넓은 칸(384x224). 게임이 칸을 직접 골라 쓴다
    ult_sword:    { file: 'assets/sprites/ult_sword.png',    frameW: 384, frameH: 224, scale: 2, anims: { idle: [0, 6, 9] } },
    // 스노우화이트 지원 포탄 / 궁극기 폭탄 (저격_FinalAttack 6칸)
    bomb:         { file: 'assets/sprites/bomb.png',         frameW: 48, frameH: 48, scale: 2, anims: { idle: [0, 6, 5] } },
    // 보스 모찌 전차 (B_S1). 9칸: 0 정지 / 1~8 이동
    // 보스 (B_S2) — 부유 6칸 (2배 해상도)
    // 세로로 긴 칸(128x200). 원본을 정확히 1/2 로 줄여 도트가 뭉개지지 않게 뽑았다
    boss:         { file: 'assets/sprites/boss.png',         frameW: 128, frameH: 200, scale: 2, anims: { idle: [0, 6, 6], run: [0, 6, 10] } },
  },

  // ----- UI 초상화 (스킬 칸에 표시. tools/make_portrait.py 로 캐릭터 시트에서 잘라냄) -----
  faces: {
    sword:  { file: 'assets/sprites/face_sword.png' },
    healer: { file: 'assets/sprites/face_healer.png' },
    sniper: { file: 'assets/sprites/face_sniper.png' },
  },

  // ----- 아군 탄환 그림 (진행 방향으로 회전해서 그림) -----
  pbullets: {
    s: { file: 'assets/sprites/pbullet_s.png' },   // 플레이어 권총, 힐러
    m: { file: 'assets/sprites/pbullet_m.png' },   // 예비
    l: { file: 'assets/sprites/pbullet_l.png' },   // 저격수 관통탄
  },

  // ----- 적 탄환 그림 (탄 크기에 따라 자동으로 골라 씀) -----
  bullets: {
    s: { file: 'assets/sprites/bullet_s.png' },   // 일반 적
    m: { file: 'assets/sprites/bullet_m.png' },   // 중형
    l: { file: 'assets/sprites/bullet_l.png' },   // 보스 포격·미사일
  },

  // ----- 무기 그림 (캐릭터 그림에는 무기를 그리지 않고, 여기 그림을 손에 붙여 회전시킴) -----
  // 오른쪽을 향하게 그린 작은 PNG. 왼쪽 끝 가운데가 손잡이(쥐는 지점)가 된다.
  // 없으면 지금처럼 단순한 도형으로 그린다.
  //   pistol / rifle : 길이 방향이 총구 방향
  //   blade          : 칼. 왼쪽이 손잡이, 오른쪽이 칼끝
  //   sheath         : 칼집. 왼쪽이 입구(허리에 닿는 쪽), 오른쪽이 끝
  weapons: {
    pistol: { file: 'assets/sprites/weapon_pistol.png' },   // 플레이어
    rifle:  { file: 'assets/sprites/weapon_rifle.png' },    // 저격수
    blade:  { file: 'assets/sprites/weapon_blade.png' },    // 검술병이 소환·투척하는 칼
    sheath: { file: 'assets/sprites/weapon_sheath.png' },   // 검술병이 허리에 차는 흰 칼집
    cross:  { file: 'assets/sprites/weapon_cross.png' },    // 힐러 심판형이 떨어뜨리는 십자가
  },

  // ----- 땅 / 발판 타일 (가로로 반복해서 깔림) -----
  // ground   : 바닥. 가로 16~48px, 세로 40px (화면 아래 GROUND_Y=230 부터 바닥이 그려짐)
  // platform : 공중 발판. 가로 16~32px, 세로 8~16px. 왼쪽 끝과 오른쪽 끝이 이어지게 그리면 매끄럽다
  // 파일이 없으면 지금처럼 도형으로 그린다
  tiles: {
    ground:   { file: 'assets/backgrounds/ground.png' },
    platform: { file: 'assets/backgrounds/platform.png' },
  },

  // ----- 배경 (480 x 270 크기, 가로로 반복되어 이어짐) -----
  // scroll : 0 = 고정, 0.5 = 천천히, 0.9 = 빠르게 (멀리 있을수록 작은 값)
  // 속도감을 위해 전반적으로 올려 잡았다 (하늘도 아주 조금은 흐르게)
  // 화면 아래 40px(세로 230 아래)은 게임이 땅을 그리므로 비워 두거나 땅 없이 그리세요
  backgrounds: {
    sky:  { file: 'assets/backgrounds/sky.png',  scroll: 0.12 },
    far:  { file: 'assets/backgrounds/far.png',  scroll: 0.55 },
    near: { file: 'assets/backgrounds/near.png', scroll: 0.9 },
  },

  // ----- 효과음 (wav / mp3 / ogg — 확장자가 달라도 게임이 알아서 찾음) -----
  // volume : 0 ~ 1
  // gap    : 같은 소리를 다시 낼 수 있는 최소 간격(초). 연사 소리가 지나치게 겹치지 않게 함
  // len    : 이 초만큼만 재생하고 페이드아웃 (원본이 길 때. 없으면 끝까지 재생)
  // file   : 배열로 여러 개를 적으면 재생할 때마다 무작위로 골라 낸다 (같은 소리 반복 방지)
  sounds: {
    shoot:       { file: 'assets/sounds/shoot.wav',       volume: 0.2, gap: 0.09 },   // 자동 사격이라 낮게·덜 겹치게
    sniper:      { file: 'assets/sounds/sniper.wav',      volume: 0.45, gap: 0.1 },   // 포병 곡사포
    explosion:   { file: 'assets/sounds/explosion.wav',   volume: 0.5, gap: 0.08 },
    enemy_shoot: { file: 'assets/sounds/enemy_shoot.wav', volume: 0.22, gap: 0.08 },
    hit:         { file: 'assets/sounds/hit.wav',         volume: 0.3, gap: 0.05 },  // 적이 맞음
    enemy_die:   { file: 'assets/sounds/enemy_die.wav',   volume: 0.3, gap: 0.05 },
    player_hit:  { file: 'assets/sounds/player_hit.wav',  volume: 0.65 },            // 플레이어 피격 (적 피격음과 구분)
    player_die:  { file: 'assets/sounds/player_die.wav',  volume: 0.6 },
    jump:        { file: 'assets/sounds/jump.wav',        volume: 0.3 },
    throw:       { file: 'assets/sounds/throw.wav',       volume: 0.4 },             // 검술병이 칼을 던짐
    item:        { file: 'assets/sounds/item.wav',        volume: 0.5 },             // 보급 상자 · HP 회복
    rescue:      { file: 'assets/sounds/rescue.wav',      volume: 0.5 },             // 레벨업 (동료 소환)
    block:       { file: 'assets/sounds/block.wav',       volume: 0.35, gap: 0.05 }, // 도는 칼이 탄을 막음
    choose:      { file: 'assets/sounds/choose.wav',      volume: 0.5 },             // 선택 화면 열림
    select:      { file: 'assets/sounds/select.wav',      volume: 0.4 },             // 선택 커서 이동
    confirm:     { file: 'assets/sounds/confirm.wav',     volume: 0.5 },
    warning:     { file: 'assets/sounds/warning.wav',     volume: 0.6 },             // 보스 등장
    clear:       { file: 'assets/sounds/clear.wav',       volume: 0.6 },
    gameover:    { file: 'assets/sounds/gameover.wav',    volume: 0.6 },
  },

  // ----- 배경음악 (반복 재생) -----
  // volume 은 처음 켰을 때의 기본값 (게임에서 - / = 로 바꾸면 그 값이 기억된다)
  bgm: { file: 'assets/sounds/Main_bgm.mp3', volume: 0.4 },
};
