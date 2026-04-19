# 🎰 로또번호 관리 사이트

로또번호를 Firebase에 저장하고 관리하는 웹사이트입니다. 비밀번호로 보호되어 있으며, 최신 20개의 로또번호를 관리할 수 있습니다.

## 📋 기능

✅ **비밀번호 인증** - 비밀번호로 접근 제한
✅ **로또번호 저장** - 당첨번호 6개 + 보너스번호 1개
✅ **최대 20개 저장** - 초과 시 가장 오래된 번호 자동 삭제
✅ **로또번호 삭제** - 개별 번호 삭제 가능
✅ **주차별 표시** - 가장 최신 번호부터 표시 (역순)
✅ **Firebase 연동** - 클라우드에 안전하게 저장

## 🚀 시작하기

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 새 프로젝트 생성
3. **Realtime Database** 생성 (위치: 서울)
4. 프로젝트 설정에서 웹 앱 추가
5. Firebase 설정 코드 복사

### 2. 설정 파일 수정

**firebase-config.js** 파일을 열어서 아래 부분을 수정하세요:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",           // 여기에 복사한 값 붙여넣기
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const PASSWORD = "1234"; // 원하는 비밀번호로 변경
```

### 3. Firebase Database 규칙 설정

Firebase Console → Realtime Database → Rules 탭에서 아래 코드를 적용하세요:

```json
{
  "rules": {
    "lottoNumbers": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 4. 웹사이트 실행

- `index.html` 파일을 웹 브라우저에서 열기
- 또는 간단한 HTTP 서버 실행:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (http-server 설치 필요)
npx http-server
```

그 후 `http://localhost:8000` 접속

## 📖 사용 방법

### 1. 로그인
- 설정한 비밀번호 입력
- 엔터 키 또는 로그인 버튼 클릭

### 2. 로또번호 등록
1. 당첨번호 6개 입력 (1~45 사이의 숫자)
2. 보너스번호 1개 입력
3. "등록" 버튼 클릭

### 3. 로또번호 관리
- 최신순으로 표시됨 (위에서부터 1주차, 2주차...)
- 각 번호의 우측 "삭제" 버튼으로 개별 삭제 가능
- 20개 초과 시 자동으로 가장 오래된 번호 삭제

### 4. 로그아웃
- 우측 상단 "로그아웃" 버튼 클릭

## 🔐 보안 주의사항

⚠️ **중요**: 프로덕션 환경에서는 다음을 권장합니다:

1. **비밀번호 강화** - 더 강력한 비밀번호 설정
2. **Firebase 인증** - 다단계 인증(2FA) 설정
3. **Database 규칙** - 더 제한적인 규칙 적용
4. **API 키 보호** - 환경변수로 관리
5. **HTTPS** - 반드시 HTTPS를 통해 접속

## 📱 브라우저 호환성

- Chrome ✅
- Firefox ✅
- Safari ✅
- Edge ✅
- 모바일 브라우저 ✅

## 📂 파일 구조

```
roto/
├── index.html           # 메인 HTML 파일
├── style.css            # 스타일시트
├── app.js               # 메인 JavaScript
├── firebase-config.js   # Firebase 설정
└── README.md            # 이 파일
```

## 🐛 트러블슈팅

### "Firebase 저장 중 오류"
- Firebase 설정이 제대로 되었는지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- Firebase API Key 유효성 확인

### "로그인이 안 됨"
- 콘솔에서 localStorage 확인: `localStorage.getItem('lottoLogin')`
- 브라우저 쿠키/저장소 초기화 후 다시 시도

### "데이터가 저장 안 됨"
- Firebase Database 규칙이 ".write": true인지 확인
- 인터넷 연결 상태 확인
- Firebase 콘솔에서 데이터 직접 확인

## 📝 업데이트 계획

- [ ] 당첨번호와 실제 당첨 결과 비교 기능
- [ ] 통계 및 분석 페이지
- [ ] 숫자 자동 생성 기능
- [ ] 모바일 앱 버전
- [ ] 사용자 계정 시스템

## 🤝 문의 및 피드백

질문이나 버그 보고는 언제든지 가능합니다.

---

**행운을 빕니다! 🍀**
