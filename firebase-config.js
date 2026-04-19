// Firebase 설정
// Firebase Console에서 아래 설정값들을 복사해 붙여넣으세요.

const firebaseConfig = {
    apiKey: "AIzaSyAsvf984OZ3q4VvRHWGCyxUw-8ow3dGQ5w",
    authDomain: "lotte01-131ea.firebaseapp.com",
    databaseURL: "https://lotte01-131ea-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lotte01-131ea",
    storageBucket: "lotte01-131ea.firebasestorage.app",
    messagingSenderId: "176783709606",
    appId: "1:176783709606:web:b5fd8ce5e3c1d78faeab67"
};

// Firebase 초기화
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// 비밀번호 설정 (원하는 비밀번호로 변경하세요)
const PASSWORD = "1234"; // 🔐 보안을 위해 변경하세요
