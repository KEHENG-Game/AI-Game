// 랭킹 서버 주소 (구글 Apps Script 웹앱)
//
// 만드는 법은 tools/랭킹_설정.md 를 보세요. 요약하면
//   1) 구글 스프레드시트 새로 만들기
//   2) 확장 프로그램 → Apps Script → tools/leaderboard.gs 내용 붙여넣기
//   3) 배포 → 새 배포 → 웹 앱 → 액세스 권한 "모든 사용자" → 배포
//   4) 나온 주소(.../exec)를 아래 따옴표 안에 붙여넣기
//
// 비워 두면 랭킹이 이 브라우저에만 저장됩니다 (혼자 테스트할 때 그대로 두세요).
window.RANK_URL = 'https://script.google.com/macros/s/AKfycbwUdMljtgvcwm63K2PUJBa1SLJWDu1GHYQNGfShijzULl1-0s6DfS0Lqp_QNxP1SjWIYQ/exec';
