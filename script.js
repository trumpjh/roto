class LottoAnalyzer {
    constructor() {
        // 여러 CORS 프록시 서비스 준비
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://thingproxy.freeboard.io/fetch/',
            'https://cors-proxy.htmldriven.com/?url='
        ];
        this.currentProxyIndex = 0;
        
        this.originalUrl = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
        this.updateProxy();
        
        this.lottoData = [];
        this.analysis = {};
        this.isAnalyzing = false;
        
        this.initializeEventListeners();
    }
    
    updateProxy() {
        this.corsProxy = this.corsProxies[this.currentProxyIndex];
        this.baseUrl = this.corsProxy + encodeURIComponent(this.originalUrl);
        console.log(`현재 프록시: ${this.corsProxy}`);
    }
    
    initializeEventListeners() {
        document.getElementById('analyzeBtn').addEventListener('click', () => this.startAnalysis());
        document.getElementById('generateBtn').addEventListener('click', () => this.generateAllNumbers());
        
        // 탭 전환 이벤트
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
    }
    
    switchTab(tabName) {
        // 모든 탭 버튼과 패널 비활성화
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        // 선택된 탭 활성화
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
    }
    
    async testConnection() {
        console.log('🔍 연결 테스트 시작...');
        this.updateStatus('연결 상태 확인 중...');
        
        try {
            // 확실히 존재하는 회차로 테스트 (1000회차)
            const testRound = 1000;
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(this.originalUrl + testRound)}`);
            const result = await response.json();
            const data = JSON.parse(result.contents);
            
            if (data.returnValue === 'success') {
                console.log('✅ 연결 성공!');
                this.updateStatus('연결 성공! 데이터 분석을 시작할 수 있습니다.');
                return true;
            } else {
                console.log('❌ API 응답 오류:', data);
                this.updateStatus('API 응답에 문제가 있습니다.');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 연결 실패:', error);
            this.updateStatus('연결에 실패했습니다. 네트워크를 확인해주세요.');
            return false;
        }
    }
    
    async startAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.showLoading(true);
        
        try {
            // 1. 연결 테스트
            const connectionOk = await this.testConnection();
            if (!connectionOk) {
                throw new Error('연결 테스트 실패');
            }
            
            // 2. 최신 회차 확인
            this.updateStatus('최신 회차 확인 중...');
            const latestRound = await this.getLatestRound();
            
            // 3. 최신 15개 회차 데이터 수집
            const startRound = Math.max(1, latestRound - 14); // 15개 회차
            const endRound = latestRound;
            
            this.updateStatus(`📊 최신 15개 회차 (${startRound}회 ~ ${endRound}회) 데이터 수집 중...`);
            
            // 4. 데이터 수집
            this.lottoData = await this.fetchLottoData(startRound, endRound);
            
            if (this.lottoData.length === 0) {
                throw new Error('데이터를 가져올 수 없습니다.');
            }
            
            // 5. 데이터 분석
            this.updateStatus('🔍 데이터 분석 중...');
            this.analysis = this.analyzeData(this.lottoData);
            
            // 6. 결과 표시
            this.displayAnalysisResults();
            this.updateStatus(`✅ 분석 완료! 최신 ${this.lottoData.length}개 회차 데이터 분석됨`);
            
            // 번호 생성 버튼 활성화
            document.getElementById('generateBtn').disabled = false;
            
        } catch (error) {
            console.error('분석 중 오류:', error);
            this.updateStatus(`❌ ${error.message} 다시 시도해주세요.`);
        } finally {
            this.showLoading(false);
            this.isAnalyzing = false;
        }
    }
    
    async getLatestRound() {
        // 현재 날짜 기준으로 더 정확한 추정
        const currentDate = new Date();
        const startDate = new Date('2002-12-07'); // 로또 1회차 날짜
        const diffWeeks = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 7));
        const estimatedRound = diffWeeks + 1;
        
        console.log(`추정 최신 회차: ${estimatedRound}`);
        
        // 추정 회차부터 역순으로 30개 회차 확인 (범위 확대)
        for (let round = estimatedRound; round > estimatedRound - 30; round--) {
            try {
                console.log(`회차 ${round} 확인 중...`);
                
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(this.originalUrl + round)}`);
                const result = await response.json();
                const data = JSON.parse(result.contents);
                
                console.log(`회차 ${round} 응답:`, data);
                
                if (data.returnValue === 'success' && data.drwtNo1) {
                    console.log(`✅ 최신 회차 발견: ${round}회`);
                    return round;
                }
                
                // API 호출 제한을 위한 딜레이
                await this.delay(300);
                
            } catch (error) {
                console.error(`❌ 회차 ${round} 오류:`, error);
                continue;
            }
        }
        
        // 기본값으로 추정 회차에서 5를 뺀 값 사용
        const fallbackRound = estimatedRound - 5;
        console.log(`⚠️ 최신 회차를 찾을 수 없어 기본값 사용: ${fallbackRound}회`);
        return fallbackRound;
    }
    
    async fetchLottoData(startRound, endRound) {
        const data = [];
        const totalRounds = endRound - startRound + 1;
        
        console.log(`${startRound}회부터 ${endRound}회까지 ${totalRounds}개 회차 수집 시작`);
        
        // 순차적으로 데이터 수집 (안정성 향상)
        for (let round = startRound; round <= endRound; round++) {
            const roundData = await this.fetchSingleRound(round);
            
            if (roundData) {
                data.push(roundData);
                console.log(`✅ 회차 ${round} 수집 완료: ${roundData.numbers}`);
            } else {
                console.log(`❌ 회차 ${round} 수집 실패`);
            }
            
            // 진행률 업데이트
            const progress = Math.round(((round - startRound + 1) / totalRounds) * 100);
            this.updateStatus(`데이터 수집 중... ${progress}% (${round}회)`);
            
            // API 호출 제한을 위한 딜레이
            await this.delay(400);
        }
        
        console.log(`총 ${data.length}개 회차 데이터 수집 완료`);
        return data.sort((a, b) => a.round - b.round);
    }
    
    async fetchSingleRound(round) {
        try {
            // 여러 방법으로 시도
            const methods = [
                // 방법 1: allorigins 사용
                async () => {
                    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(this.originalUrl + round)}`);
                    const result = await response.json();
                    return JSON.parse(result.contents);
                },
                
                // 방법 2: thingproxy 사용
                async () => {
                    const response = await fetch(`https://thingproxy.freeboard.io/fetch/${this.originalUrl}${round}`);
                    return await response.json();
                }
            ];
            
            // 각 방법을 순서대로 시도
            for (let i = 0; i < methods.length; i++) {
                try {
                    console.log(`회차 ${round}: 방법 ${i + 1} 시도`);
                    const data = await methods[i]();
                    
                    if (data && data.returnValue === 'success' && data.drwtNo1) {
                        const numbers = [
                            data.drwtNo1, data.drwtNo2, data.drwtNo3,
                            data.drwtNo4, data.drwtNo5, data.drwtNo6
                        ];
                        
                        if (numbers.every(n => n && n >= 1 && n <= 45)) {
                            return {
                                round: round,
                                date: data.drwNoDate,
                                numbers: numbers,
                                bonus: data.bnusNo
                            };
                        }
                    }
                } catch (error) {
                    console.log(`회차 ${round} 방법 ${i + 1} 실패:`, error.message);
                    continue;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error(`Round ${round} 전체 오류:`, error);
            return null;
        }
    }
    
    analyzeData(data) {
        const analysis = {
            frequency: {},
            sumRanges: { low: 0, medium: 0, high: 0 },
            oddEven: {},
            numberRanges: { '1-15': 0, '16-30': 0, '31-45': 0 },
            consecutive: 0
        };
        
        // 모든 번호 초기화
        for (let i = 1; i <= 45; i++) {
            analysis.frequency[i] = 0;
        }
        
        data.forEach(round => {
            const numbers = round.numbers.sort((a, b) => a - b);
            
            // 빈도 분석
            numbers.forEach(num => {
                analysis.frequency[num]++;
            });
            
            // 합계 범위 분석
            const sum = numbers.reduce((a, b) => a + b, 0);
            if (sum <= 120) analysis.sumRanges.low++;
            else if (sum <= 150) analysis.sumRanges.medium++;
            else analysis.sumRanges.high++;
            
            // 홀짝 분석
            const oddCount = numbers.filter(n => n % 2 === 1).length;
            const key = `${oddCount}odd_${6-oddCount}even`;
            analysis.oddEven[key] = (analysis.oddEven[key] || 0) + 1;
            
            // 구간별 분석
            numbers.forEach(num => {
                if (num <= 15) analysis.numberRanges['1-15']++;
                else if (num <= 30) analysis.numberRanges['16-30']++;
                else analysis.numberRanges['31-45']++;
            });
            
            // 연속번호 확인
            for (let i = 0; i < numbers.length - 1; i++) {
                if (numbers[i + 1] - numbers[i] === 1) {
                    analysis.consecutive++;
                    break;
                }
            }
        });
        
        return analysis;
    }
    
    displayAnalysisResults() {
        this.displayFrequencyChart();
        this.displayOddEvenChart();
        this.displayRangeChart();
        this.displaySumChart();
        this.displayStatsSummary();
        this.displayHotNumbers();
        this.displayColdNumbers();
    }
    
    displayFrequencyChart() {
        const ctx = document.getElementById('frequencyChart').getContext('2d');
        const sortedFreq = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedFreq.map(([num]) => num),
                datasets: [{
                    label: '출현 횟수',
                    data: sortedFreq.map(([,freq]) => freq),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    displayOddEvenChart() {
        const ctx = document.getElementById('oddEvenChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(this.analysis.oddEven),
                datasets: [{
                    data: Object.values(this.analysis.oddEven),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
        displayRangeChart() {
        const ctx = document.getElementById('rangeChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(this.analysis.numberRanges),
                datasets: [{
                    label: '출현 횟수',
                    data: Object.values(this.analysis.numberRanges),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    displaySumChart() {
        const ctx = document.getElementById('sumChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['낮음 (≤120)', '중간 (121-150)', '높음 (>150)'],
                datasets: [{
                    data: Object.values(this.analysis.sumRanges),
                    backgroundColor: ['#4BC0C0', '#FFCE56', '#FF6384']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    displayStatsSummary() {
        const totalRounds = this.lottoData.length;
        const totalNumbers = Object.values(this.analysis.frequency).reduce((a, b) => a + b, 0);
        const avgFreq = totalNumbers / 45;
        
        const mostFrequent = Object.entries(this.analysis.frequency)
            .reduce(([maxNum, maxFreq], [num, freq]) => 
                freq > maxFreq ? [num, freq] : [maxNum, maxFreq], ['1', 0]);
        
        const leastFrequent = Object.entries(this.analysis.frequency)
            .reduce(([minNum, minFreq], [num, freq]) => 
                freq < minFreq ? [num, freq] : [minNum, minFreq], ['1', 999]);
        
        const html = `
            <h3>📊 최신 15개 회차 분석 요약</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalRounds}</div>
                    <div class="stat-label">분석 회차</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalNumbers}</div>
                    <div class="stat-label">총 번호 개수</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${mostFrequent[0]}</div>
                    <div class="stat-label">최다 출현 번호 (${mostFrequent[1]}회)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${leastFrequent[0]}</div>
                    <div class="stat-label">최소 출현 번호 (${leastFrequent[1]}회)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${avgFreq.toFixed(1)}</div>
                    <div class="stat-label">평균 출현 횟수</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.analysis.consecutive}</div>
                    <div class="stat-label">연속번호 포함 회차</div>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 8px; text-align: center;">
                <strong>📅 분석 기간: 최신 15개 회차</strong><br>
                <small>더 많은 데이터가 필요하면 회차 수를 늘려보세요!</small>
            </div>
        `;
        
        document.getElementById('statsSummary').innerHTML = html;
    }
    
    displayHotNumbers() {
        const hotNumbers = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15);
        
        const html = hotNumbers.map(([num, freq]) => `
            <div class="number-item">
                <div class="number-ball hot">${num}</div>
                <div class="number-count">${freq}회</div>
            </div>
        `).join('');
        
        document.getElementById('hotNumbersList').innerHTML = html;
    }
    
    displayColdNumbers() {
        const coldNumbers = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 15);
        
        const html = coldNumbers.map(([num, freq]) => `
            <div class="number-item">
                <div class="number-ball cold">${num}</div>
                <div class="number-count">${freq}회</div>
            </div>
        `).join('');
        
        document.getElementById('coldNumbersList').innerHTML = html;
    }
    
    generateAllNumbers() {
        if (!this.analysis.frequency) {
            alert('먼저 데이터 분석을 실행해주세요.');
            return;
        }
        
        // 1. 마킹 위치 분석 표시
        this.displayMarkingPositionAnalysis();
        
        // 2. AI 종합 추천 (마킹 위치 기반)
        const aiRecommendations = this.generatePositionBasedAI();
        this.displayLottoSets('aiRecommendations', aiRecommendations);
        
        // 3. 자주 나온 번호 기반 추천
        const hotRecommendations = this.generateHotNumbers();
        this.displayLottoSets('hotRecommendations', hotRecommendations);
        
        // 4. 적게 나온 번호 기반 추천
        const coldRecommendations = this.generateColdNumbers();
        this.displayLottoSets('coldRecommendations', coldRecommendations);
        
        // 5. 균형잡힌 전략
        const balancedRecommendations = this.generateBalancedNumbers();
        this.displayLottoSets('balancedRecommendations', balancedRecommendations);
    }
    
    // 마킹 위치 분석 표시
    displayMarkingPositionAnalysis() {
        // 로또 용지 위치별 출현 빈도 계산
        const positionFrequency = {};
        
        // 모든 위치 초기화 (1-45)
        for (let i = 1; i <= 45; i++) {
            positionFrequency[i] = 0;
        }
        
        // 최신 15개 회차 데이터로 위치별 빈도 계산
        this.lottoData.forEach(round => {
            round.numbers.forEach(num => {
                positionFrequency[num]++;
            });
        });
        
        // 총 회차 수
        const totalRounds = this.lottoData.length;
        
        // 위치별 분석
        const hotPositions = [];
        const coldPositions = [];
        const patternPositions = [];
        
        Object.entries(positionFrequency).forEach(([position, count]) => {
            const percentage = ((count / totalRounds) * 100).toFixed(1);
            const positionData = {
                position: parseInt(position),
                count: count,
                percentage: parseFloat(percentage)
            };
            
            if (count >= 3) {
                hotPositions.push(positionData);
            } else if (count === 0) {
                coldPositions.push(positionData);
            } else {
                patternPositions.push(positionData);
            }
        });
        
        // HTML 생성
        let html = `
            <div class="marking-header">
                <div class="marking-title">📍 최신 ${totalRounds}회차 마킹 위치 분석</div>
                <div class="marking-subtitle">로또 용지 위치별 출현 빈도 및 패턴 분석</div>
            </div>
            
            <div class="position-grid">
        `;
        
        // 1-45 위치별 셀 생성
        for (let i = 1; i <= 45; i++) {
            const count = positionFrequency[i];
            const percentage = ((count / totalRounds) * 100).toFixed(1);
            
            let cellClass = 'position-cell';
            if (count === 0) cellClass += ' position-0';
            else if (count === 1) cellClass += ' position-1';
            else if (count === 2) cellClass += ' position-2';
            else if (count === 3) cellClass += ' position-3';
            else if (count === 4) cellClass += ' position-4';
            else if (count === 5) cellClass += ' position-5';
            else cellClass += ' position-high';
            
            html += `
                <div class="${cellClass}" title="위치 ${i}: ${count}회 출현 (${percentage}%)">
                    <div class="position-number">${i}</div>
                    <div class="position-count">${count}회</div>
                    <div class="position-percentage">${percentage}%</div>
                </div>
            `;
        }
        
        html += `
            </div>
            
            <div class="analysis-summary">
                <div class="summary-item hot-positions">
                    <div class="summary-title">🔥 자주 나온 위치</div>
                    <div class="summary-value">${hotPositions.length}개</div>
                    <div class="summary-description">3회 이상 출현한 위치</div>
                </div>
                <div class="summary-item cold-positions">
                    <div class="summary-title">❄️ 안 나온 위치</div>
                    <div class="summary-value">${coldPositions.length}개</div>
                    <div class="summary-description">한 번도 출현하지 않은 위치</div>
                </div>
                <div class="summary-item pattern-positions">
                    <div class="summary-title">📊 중간 위치</div>
                    <div class="summary-value">${patternPositions.length}개</div>
                    <div class="summary-description">1-2회 출현한 위치</div>
                </div>
            </div>
            
            <div class="recommendation-reason">
                <div class="reason-title">🤖 AI 분석 기준</div>
                <ul class="reason-list">
                    <li class="reason-item">
                        <span class="reason-text">자주 나온 위치 (3회+)</span>
                        <span class="reason-score">40%</span>
                    </li>
                    <li class="reason-item">
                        <span class="reason-text">중간 빈도 위치 (1-2회)</span>
                        <span class="reason-score">35%</span>
                    </li>
                    <li class="reason-item">
                        <span class="reason-text">안 나온 위치 (0회)</span>
                        <span class="reason-score">15%</span>
                    </li>
                    <li class="reason-item">
                        <span class="reason-text">구간 균형 (1-15, 16-30, 31-45)</span>
                        <span class="reason-score">10%</span>
                    </li>
                </ul>
            </div>
        `;
        
        document.getElementById('markingAnalysis').innerHTML = html;
    }
    
    // 마킹 위치 기반 AI 추천
    generatePositionBasedAI() {
        const positionFrequency = {};
        
        // 위치별 빈도 계산
        for (let i = 1; i <= 45; i++) {
            positionFrequency[i] = 0;
        }
        
        this.lottoData.forEach(round => {
            round.numbers.forEach(num => {
                positionFrequency[num]++;
            });
        });
        
        // 위치별 점수 계산
        const positionScores = {};
        Object.entries(positionFrequency).forEach(([position, count]) => {
            let score = 0;
            
            // 자주 나온 위치 (40%)
            if (count >= 3) {
                score += count * 0.4;
            }
            // 중간 빈도 위치 (35%)
            else if (count >= 1) {
                score += count * 0.35;
            }
            // 안 나온 위치 (15%)
            else {
                score += 0.15;
            }
            
            // 구간 균형 보너스 (10%)
            const pos = parseInt(position);
            if (pos <= 15) score += 0.1; // 1-15 구간
            else if (pos <= 30) score += 0.08; // 16-30 구간
            else score += 0.12; // 31-45 구간 (약간 높은 점수)
            
            positionScores[position] = score;
        });
        
        // 점수 순으로 정렬
        const sortedPositions = Object.entries(positionScores)
            .sort(([,a], [,b]) => b - a)
            .map(([pos, score]) => ({
                position: parseInt(pos),
                score: score,
                frequency: positionFrequency[pos]
            }));
        
        const sets = [];
        for (let i = 0; i < 5; i++) {
            const numbers = [];
            
            // 상위 20개 위치에서 선택
            const topPositions = sortedPositions.slice(0, 20);
            
            // 구간별 균형을 고려한 선택
            const ranges = [
                { start: 1, end: 15, selected: 0, target: 2 },
                { start: 16, end: 30, selected: 0, target: 2 },
                { start: 31, end: 45, selected: 0, target: 2 }
            ];
            
            // 각 구간에서 목표 개수만큼 선택
            topPositions.forEach(posData => {
                if (numbers.length >= 6) return;
                
                const pos = posData.position;
                const range = ranges.find(r => pos >= r.start && pos <= r.end);
                
                if (range && range.selected < range.target) {
                    numbers.push(pos);
                    range.selected++;
                }
            });
            
            // 부족한 경우 상위 위치에서 추가 선택
            while (numbers.length < 6) {
                const available = topPositions
                                        .filter(p => !numbers.includes(p.position))
                    .slice(0, 10);
                
                if (available.length > 0) {
                    const randomIndex = Math.floor(Math.random() * available.length);
                    numbers.push(available[randomIndex].position);
                } else {
                    break;
                }
            }
            
            // 정렬 및 분석 정보 생성
            const finalNumbers = numbers.slice(0, 6).sort((a, b) => a - b);
            const analysisInfo = this.getPositionBasedAnalysis(finalNumbers, positionFrequency);
            
            sets.push({
                numbers: finalNumbers,
                info: analysisInfo
            });
        }
        
        return sets;
    }
    
    // 위치 기반 분석 정보 생성
    getPositionBasedAnalysis(numbers, positionFrequency) {
        const totalRounds = this.lottoData.length;
        
        // 각 번호의 출현 빈도 분석
        const frequencyAnalysis = numbers.map(num => {
            const count = positionFrequency[num];
            if (count >= 3) return '자주';
            else if (count >= 1) return '중간';
            else return '대기';
        });
        
        const hotCount = frequencyAnalysis.filter(f => f === '자주').length;
        const mediumCount = frequencyAnalysis.filter(f => f === '중간').length;
        const coldCount = frequencyAnalysis.filter(f => f === '대기').length;
        
        // 구간 분포
        const ranges = {
            low: numbers.filter(n => n <= 15).length,
            mid: numbers.filter(n => n > 15 && n <= 30).length,
            high: numbers.filter(n => n > 30).length
        };
        
        // 홀짝 분포
        const oddCount = numbers.filter(n => n % 2 === 1).length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        
        return `위치분석: 자주${hotCount} 중간${mediumCount} 대기${coldCount} | 홀${oddCount}짝${6-oddCount} | 합계:${sum}`;
    }
    
    generateHotNumbers() {
        const hotNumbers = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20) // 15개 회차이므로 풀을 20개로 줄임
            .map(([num]) => parseInt(num));
        
        const sets = [];
        for (let i = 0; i < 5; i++) {
            const selected = this.getRandomSample(hotNumbers, 6);
            sets.push({
                numbers: selected.sort((a, b) => a - b),
                info: this.getSetInfo(selected)
            });
        }
        
        return sets;
    }
    
    generateColdNumbers() {
        const coldNumbers = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 20) // 15개 회차이므로 풀을 20개로 줄임
            .map(([num]) => parseInt(num));
        
        const sets = [];
        for (let i = 0; i < 5; i++) {
            const selected = this.getRandomSample(coldNumbers, 6);
            sets.push({
                numbers: selected.sort((a, b) => a - b),
                info: this.getSetInfo(selected)
            });
        }
        
        return sets;
    }
    
    generateBalancedNumbers() {
        const ranges = [
            { start: 1, end: 15, count: 2 },
            { start: 16, end: 30, count: 2 },
            { start: 31, end: 45, count: 2 }
        ];
        
        const sets = [];
        for (let i = 0; i < 5; i++) {
            const numbers = [];
            
            ranges.forEach(range => {
                const rangeNumbers = Array.from(
                    {length: range.end - range.start + 1}, 
                    (_, i) => range.start + i
                );
                numbers.push(...this.getRandomSample(rangeNumbers, range.count));
            });
            
            sets.push({
                numbers: numbers.sort((a, b) => a - b),
                info: this.getSetInfo(numbers)
            });
        }
        
        return sets;
    }
    
    displayLottoSets(containerId, sets) {
        const html = sets.map((set, index) => `
            <div class="lotto-set fade-in">
                <div class="set-number">${index + 1}.</div>
                <div class="lotto-balls">
                    ${set.numbers.map((num, i) => `<div class="lotto-ball" style="background: ${this.getBallColor(i)}">${num}</div>`).join('')}
                </div>
                <div class="set-info">${set.info}</div>
            </div>
        `).join('');
        
        document.getElementById(containerId).innerHTML = html;
    }
    
    // 볼 색상 생성 (더 다양한 색상)
    getBallColor(index) {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
            '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
            '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
        ];
        return colors[index % colors.length];
    }
    
    getSetInfo(numbers) {
        const oddCount = numbers.filter(n => n % 2 === 1).length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        
        // 구간 분포 추가
        const ranges = {
            low: numbers.filter(n => n <= 15).length,
            mid: numbers.filter(n => n > 15 && n <= 30).length,
            high: numbers.filter(n => n > 30).length
        };
        
        return `홀${oddCount}짝${6-oddCount} | 구간:${ranges.low}-${ranges.mid}-${ranges.high} | 합계:${sum}`;
    }
    
    getRandomSample(array, count) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
        document.getElementById('analyzeBtn').disabled = show;
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        statusElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span>${message}</span>
                ${message.includes('중...') ? '<div class="spinner"></div>' : ''}
            </div>
        `;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new LottoAnalyzer();
});


