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
    
    // 회차번호 변경 시 자동 날짜 계산
    const drawNumberInput = document.getElementById('drawNumberInput');
    drawNumberInput.addEventListener('change', calculateDateFromDrawNumber);
    
    loadLottoNumbers();
}

// 회차번호로부터 날짜 자동 계산
function calculateDateFromDrawNumber() {
    const drawNumberInput = document.getElementById('drawNumberInput');
    const drawDateInput = document.getElementById('drawDateInput');
    const drawNumber = parseInt(drawNumberInput.value);
    
    if (!drawNumber || drawNumber < 1) {
        drawDateInput.value = '';
        return;
    }
    
    // 회차 차이 계산 (1220회차 기준)
    const drawDifference = drawNumber - LOTTO_BASE_DRAW;
    
    // 날짜 계산 (7일 단위)
    const calculatedDate = new Date(LOTTO_BASE_DATE);
    calculatedDate.setDate(calculatedDate.getDate() + (drawDifference * 7));
    
    // YYYY-MM-DD 형식으로 변환
    const year = calculatedDate.getFullYear();
    const month = String(calculatedDate.getMonth() + 1).padStart(2, '0');
    const day = String(calculatedDate.getDate()).padStart(2, '0');
    
    drawDateInput.value = `${year}-${month}-${day}`;
}

// 로또번호 추가
async function addLottoNumber() {
    const drawNumber = document.getElementById('drawNumberInput').value;
    const drawDate = document.getElementById('drawDateInput').value;
    
    // 로또번호 입력값 (id 기반으로 정확하게 선택)
    const lottoInputs = Array.from(document.querySelectorAll('.lotto-numbers input'));
    const lotto1 = lottoInputs[0].value;
    const lotto2 = lottoInputs[1].value;
    const lotto3 = lottoInputs[2].value;
    const lotto4 = lottoInputs[3].value;
    const lotto5 = lottoInputs[4].value;
    const lotto6 = lottoInputs[5].value;
    const bonus = document.getElementById('bonusInput').value;

    const messageDiv = document.getElementById('addMessage');

    // 입력값 검증
    if (!drawNumber) {
        showMessage(messageDiv, '회차 번호를 입력하세요', 'error');
        return;
    }

    if (!drawDate) {
        showMessage(messageDiv, '회차 번호로부터 날짜가 자동 계산됩니다', 'error');
        return;
    }

    if (!lotto1 || !lotto2 || !lotto3 || !lotto4 || !lotto5 || !lotto6 || !bonus) {
        showMessage(messageDiv, '모든 로또번호를 입력하세요', 'error');
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

        // 새 로또번호 객체 생성 (회차 번호와 로또번호만 저장)
        const newLotto = {
            drawNumber: parseInt(drawNumber),
            numbers: numbers,
            bonus: bonusNum
        };

        // 목록에 추가
        lottoList.push(newLotto);

        // 회차번호 기준으로 내림차순 정렬 (최신 회차가 위에)
        lottoList.sort((a, b) => b.drawNumber - a.drawNumber);

        // 20개를 초과하면 가장 낮은 회차번호부터 삭제
        if (lottoList.length > MAX_LOTTO_COUNT) {
            lottoList = lottoList.slice(0, MAX_LOTTO_COUNT);
        }

        // Firebase에 저장
        await database.ref('lottoNumbers').set(lottoList);

        showMessage(messageDiv, `${drawNumber}회차 로또번호가 저장되었습니다! ✅`, 'success');

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
        let lottoList = snapshot.val();

        if (!lottoList || lottoList.length === 0) {
            listDiv.innerHTML = '<p class="empty-message">저장된 로또번호가 없습니다</p>';
            return;
        }

        // 회차번호 기준으로 내림차순 정렬 (최신 회차가 위에 오도록)
        lottoList.sort((a, b) => b.drawNumber - a.drawNumber);

        listDiv.innerHTML = '';

        lottoList.forEach((lotto, index) => {
            const lottoItem = document.createElement('div');
            lottoItem.className = 'lotto-item' + (index === 0 ? ' new' : '');

            const itemNumbers = document.createElement('div');
            itemNumbers.className = 'item-numbers';

            // 회차 정보 표시
            const drawInfo = document.createElement('div');
            drawInfo.className = 'item-draw-info';
            
            // 회차번호에서 날짜 계산
            const drawDifference = lotto.drawNumber - LOTTO_BASE_DRAW;
            const calculatedDate = new Date(LOTTO_BASE_DATE);
            calculatedDate.setDate(calculatedDate.getDate() + (drawDifference * 7));
            
            const year = calculatedDate.getFullYear();
            const month = String(calculatedDate.getMonth() + 1).padStart(2, '0');
            const day = String(calculatedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}.${month}.${day}`;
            
            drawInfo.innerHTML = `<strong>제${lotto.drawNumber}회차</strong> (${formattedDate})`;

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

            itemNumbers.appendChild(drawInfo);
            itemNumbers.appendChild(numbersDisplay);

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
    document.getElementById('drawNumberInput').value = '';
    document.getElementById('drawDateInput').value = '';
    document.querySelectorAll('.lotto-input').forEach(input => {
        input.value = '';
    });
    document.getElementById('drawNumberInput').focus();
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

// 로또 번호 분석 함수
async function analyzeLottoNumbers() {
    const resultDiv = document.getElementById('analysisResult');
    
    try {
        const snapshot = await database.ref('lottoNumbers').once('value');
        let lottoList = snapshot.val();

        if (!lottoList || lottoList.length === 0) {
            resultDiv.innerHTML = '<p class="error-message">분석할 로또번호가 없습니다</p>';
            return;
        }

        // 1-45 번호별 등장 횟수 초기화
        const numberCount = {};
        for (let i = 1; i <= 45; i++) {
            numberCount[i] = 0;
        }

        // 열별 번호 범위 정의
        const columns = {
            1: { range: [1, 7], name: '1열', count: 0 },
            2: { range: [8, 14], name: '2열', count: 0 },
            3: { range: [15, 21], name: '3열', count: 0 },
            4: { range: [22, 28], name: '4열', count: 0 },
            5: { range: [29, 35], name: '5열', count: 0 },
            6: { range: [36, 42], name: '6열', count: 0 },
            7: { range: [43, 45], name: '7열', count: 0 }
        };

        // 모든 로또 번호 집계
        lottoList.forEach(lotto => {
            lotto.numbers.forEach(num => {
                numberCount[num]++;
                
                // 열별 카운트
                for (let col in columns) {
                    const [min, max] = columns[col].range;
                    if (num >= min && num <= max) {
                        columns[col].count++;
                    }
                }
            });
            // 보너스 번호도 따로 표시하기 위해 포함
            if (lotto.bonus) {
                numberCount[lotto.bonus]++;
                for (let col in columns) {
                    const [min, max] = columns[col].range;
                    if (lotto.bonus >= min && lotto.bonus <= max) {
                        columns[col].count++;
                    }
                }
            }
        });

        // 통계 계산
        const totalDraws = lottoList.length;
        const appearedNumbers = Object.entries(numberCount).filter(([num, count]) => count > 0);
        const notAppearedNumbers = Object.entries(numberCount).filter(([num, count]) => count === 0);

        // 빈도로 정렬 (내림차순)
        appearedNumbers.sort((a, b) => b[1] - a[1]);

        // HTML 생성
        let html = `<div class="analysis-stats">`;
        html += `<div class="stat-item">
                    <span class="stat-label">총 회차:</span>
                    <span class="stat-value">${totalDraws}회</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">출현한 번호:</span>
                    <span class="stat-value">${appearedNumbers.length}개</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">미출현 번호:</span>
                    <span class="stat-value">${notAppearedNumbers.length}개</span>
                </div>
        </div>`;

        // 열별 분석
        html += `<div class="analysis-detail">`;
        html += `<h3>📍 열(Column)별 분석</h3>`;
        html += `<div class="column-analysis">`;

        for (let col in columns) {
            const colData = columns[col];
            const percentage = ((colData.count / (totalDraws * 6)) * 100).toFixed(1);
            const barWidth = (colData.count / (totalDraws * 6)) * 100;
            
            html += `<div class="column-item">
                        <div class="column-header">
                            <span class="column-name">${colData.name}</span>
                            <span class="column-range">${colData.range[0]}-${colData.range[1]}</span>
                        </div>
                        <div class="column-bar">
                            <div class="column-fill" style="width: ${barWidth}%"></div>
                        </div>
                        <span class="column-text">${colData.count}회 (${percentage}%)</span>
                    </div>`;
        }

        html += `</div></div>`;

        // 출현 번호 분석
        html += `<div class="analysis-detail">`;
        html += `<h3>📊 번호별 출현 분석</h3>`;
        html += `<div class="number-frequency">`;

        appearedNumbers.forEach(([num, count]) => {
            const percentage = ((count / (totalDraws * 6)) * 100).toFixed(1);
            html += `<div class="frequency-item">
                        <span class="number-circle">${num}</span>
                        <div class="frequency-bar">
                            <div class="frequency-fill" style="width: ${(count / (totalDraws * 6)) * 100}%"></div>
                        </div>
                        <span class="frequency-text">${count}회 (${percentage}%)</span>
                    </div>`;
        });

        html += `</div></div>`;

        // 미출현 번호 표시
        html += `<div class="analysis-detail">`;
        html += `<h3>❌ 미출현 번호 (${notAppearedNumbers.length}개)</h3>`;
        html += `<div class="not-appeared-numbers">`;

        notAppearedNumbers.forEach(([num, count]) => {
            html += `<span class="not-appeared-badge">${num}</span>`;
        });

        html += `</div></div>`;

        resultDiv.innerHTML = html;

    } catch (error) {
        console.error('Error analyzing lotto numbers:', error);
        resultDiv.innerHTML = '<p class="error-message">분석 중 오류가 발생했습니다</p>';
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
