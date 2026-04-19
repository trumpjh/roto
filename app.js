// 상태 관리
let isLoggedIn = false;
const MAX_LOTTO_COUNT = 20;

// 페이지 로드
window.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
});

// 로그인 함수
function login() {
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput.value.trim();
    const errorMsg = document.getElementById('loginError');

    if (!password) {
        errorMsg.textContent = '비밀번호를 입력하세요';
        return;
    }

    if (password === PASSWORD) {
        isLoggedIn = true;
        localStorage.setItem('lottoLogin', 'true');
        localStorage.setItem('lottoLoginTime', new Date().getTime());
        showMainPage();
        passwordInput.value = '';
    } else {
        errorMsg.textContent = '비밀번호가 틀렸습니다';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// 로그아웃 함수
function logout() {
    isLoggedIn = false;
    localStorage.removeItem('lottoLogin');
    localStorage.removeItem('lottoLoginTime');
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('mainSection').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').textContent = '';
}

// 로그인 상태 확인
function checkLoginStatus() {
    const loginStatus = localStorage.getItem('lottoLogin');
    if (loginStatus === 'true') {
        isLoggedIn = true;
        showMainPage();
    } else {
        showLoginPage();
    }
}

// 로그인 페이지 표시
function showLoginPage() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('mainSection').style.display = 'none';
    document.getElementById('passwordInput').focus();
}

// 메인 페이지 표시
function showMainPage() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'block';
    loadLottoNumbers();
}

// 로또번호 추가
async function addLottoNumber() {
    const lotto1 = document.querySelectorAll('.lotto-input')[0].value;
    const lotto2 = document.querySelectorAll('.lotto-input')[1].value;
    const lotto3 = document.querySelectorAll('.lotto-input')[2].value;
    const lotto4 = document.querySelectorAll('.lotto-input')[3].value;
    const lotto5 = document.querySelectorAll('.lotto-input')[4].value;
    const lotto6 = document.querySelectorAll('.lotto-input')[5].value;
    const bonus = document.getElementById('bonusInput').value;

    const messageDiv = document.getElementById('addMessage');

    // 입력값 검증
    if (!lotto1 || !lotto2 || !lotto3 || !lotto4 || !lotto5 || !lotto6 || !bonus) {
        showMessage(messageDiv, '모든 번호를 입력하세요', 'error');
        return;
    }

    const numbers = [
        parseInt(lotto1),
        parseInt(lotto2),
        parseInt(lotto3),
        parseInt(lotto4),
        parseInt(lotto5),
        parseInt(lotto6)
    ];
    const bonusNum = parseInt(bonus);

    // 범위 검증 (1-45)
    for (let num of numbers) {
        if (num < 1 || num > 45) {
            showMessage(messageDiv, '로또번호는 1-45 사이의 숫자여야 합니다', 'error');
            return;
        }
    }

    if (bonusNum < 1 || bonusNum > 45) {
        showMessage(messageDiv, '보너스번호는 1-45 사이의 숫자여야 합니다', 'error');
        return;
    }

    // 중복 검증
    if (numbers.includes(bonusNum)) {
        showMessage(messageDiv, '당첨번호와 보너스번호가 중복됩니다', 'error');
        return;
    }

    try {
        // Firebase에서 현재 로또번호 목록 조회
        const snapshot = await database.ref('lottoNumbers').once('value');
        let lottoList = snapshot.val() ? Object.values(snapshot.val()) : [];

        // 새 로또번호 객체 생성
        const newLotto = {
            numbers: numbers,
            bonus: bonusNum,
            timestamp: new Date().getTime(),
            date: new Date().toLocaleString('ko-KR')
        };

        // 목록에 추가 (최신순으로 맨 앞에 추가)
        lottoList.unshift(newLotto);

        // 20개를 초과하면 가장 오래된 것부터 삭제
        if (lottoList.length > MAX_LOTTO_COUNT) {
            lottoList = lottoList.slice(0, MAX_LOTTO_COUNT);
        }

        // Firebase에 저장
        await database.ref('lottoNumbers').set(lottoList);

        showMessage(messageDiv, '로또번호가 저장되었습니다! ✅', 'success');

        // 입력값 초기화
        clearInputs();

        // 목록 새로고침
        loadLottoNumbers();

    } catch (error) {
        console.error('Error:', error);
        showMessage(messageDiv, 'Firebase 저장 중 오류가 발생했습니다', 'error');
    }
}

// 로또번호 불러오기
async function loadLottoNumbers() {
    const listDiv = document.getElementById('lottoList');

    try {
        const snapshot = await database.ref('lottoNumbers').once('value');
        const lottoList = snapshot.val();

        if (!lottoList || lottoList.length === 0) {
            listDiv.innerHTML = '<p class="empty-message">저장된 로또번호가 없습니다</p>';
            return;
        }

        listDiv.innerHTML = '';

        lottoList.forEach((lotto, index) => {
            const lottoItem = document.createElement('div');
            lottoItem.className = 'lotto-item' + (index === 0 ? ' new' : '');

            const itemNumbers = document.createElement('div');
            itemNumbers.className = 'item-numbers';

            // 주차 계산
            const week = index + 1;
            const weekText = document.createElement('div');
            weekText.className = 'item-week';
            weekText.textContent = `${week}주차`;

            // 번호 표시
            const numbersDisplay = document.createElement('div');
            numbersDisplay.className = 'numbers-display';

            lotto.numbers.forEach(num => {
                const badge = document.createElement('span');
                badge.className = 'number-badge';
                badge.textContent = num.toString().padStart(2, '0');
                numbersDisplay.appendChild(badge);
            });

            // 구분선
            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.textContent = '+';
            numbersDisplay.appendChild(separator);

            // 보너스 번호
            const bonusBadge = document.createElement('span');
            bonusBadge.className = 'number-badge bonus';
            bonusBadge.textContent = '보너스: ' + lotto.bonus.toString().padStart(2, '0');
            numbersDisplay.appendChild(bonusBadge);

            // 날짜
            const dateDiv = document.createElement('div');
            dateDiv.className = 'item-date';
            dateDiv.textContent = lotto.date;

            itemNumbers.appendChild(weekText);
            itemNumbers.appendChild(numbersDisplay);
            itemNumbers.appendChild(dateDiv);

            // 삭제 버튼
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.textContent = '삭제';
            deleteBtn.onclick = () => deleteLottoNumber(index);

            lottoItem.appendChild(itemNumbers);
            lottoItem.appendChild(deleteBtn);

            listDiv.appendChild(lottoItem);
        });

    } catch (error) {
        console.error('Error loading lotto numbers:', error);
        listDiv.innerHTML = '<p class="error-message">로또번호를 불러오는 중 오류가 발생했습니다</p>';
    }
}

// 로또번호 삭제
async function deleteLottoNumber(index) {
    if (!confirm('정말로 삭제하시겠습니까?')) {
        return;
    }

    try {
        const snapshot = await database.ref('lottoNumbers').once('value');
        let lottoList = snapshot.val();

        if (lottoList) {
            lottoList.splice(index, 1);
            await database.ref('lottoNumbers').set(lottoList);
            loadLottoNumbers();

            const messageDiv = document.getElementById('addMessage');
            showMessage(messageDiv, '로또번호가 삭제되었습니다', 'success');
        }
    } catch (error) {
        console.error('Error deleting lotto number:', error);
        const messageDiv = document.getElementById('addMessage');
        showMessage(messageDiv, '삭제 중 오류가 발생했습니다', 'error');
    }
}

// 입력값 초기화
function clearInputs() {
    document.querySelectorAll('.lotto-input').forEach(input => {
        input.value = '';
    });
    document.querySelectorAll('.lotto-input')[0].focus();
}

// 메시지 표시
function showMessage(messageDiv, text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;

    if (type === 'success') {
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 3000);
    }
}

// Enter 키로 로그인
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isLoggedIn) {
            const passwordInput = document.getElementById('passwordInput');
            if (document.activeElement === passwordInput) {
                login();
            }
        }
    });
});
