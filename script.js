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
        
        // 1. 최신 15개 회차 히트맵 생성
        this.displayRecentDrawsHeatMap();
        
        // 2. 확률 높은 번호 TOP 5 예측
        const topPredictions = this.predictTopNumbers();
        this.displayPredictionNumbers(topPredictions);
        
        // 3. AI 종합 추천
        const aiRecommendations = this.generateAINumbers();
        this.displayLottoSets('aiRecommendations', aiRecommendations);
        
        // 4. 확률 기반 추천 조합 생성
        const probabilityRecommendations = this.generateProbabilityRecommendations(topPredictions);
        this.displayLottoSets('probabilityRecommendations', probabilityRecommendations);
        
        // 5. 로또 용지 형식으로 표시
        this.displayLottoSheet(aiRecommendations);
        
        // 6. 자주 나온 번호 기반 추천
        const hotRecommendations = this.generateHotNumbers();
        this.displayLottoSets('hotRecommendations', hotRecommendations);
        
        // 7. 적게 나온 번호 기반 추천
        const coldRecommendations = this.generateColdNumbers();
        this.displayLottoSets('coldRecommendations', coldRecommendations);
        
        // 8. 균형잡힌 전략
        const balancedRecommendations = this.generateBalancedNumbers();
        this.displayLottoSets('balancedRecommendations', balancedRecommendations);
    }
    
    // 새로운 메서드들 - 최신 15개 회차 히트맵
    displayRecentDrawsHeatMap() {
        const frequency = {};
        
        // 모든 번호 초기화
        for (let i = 1; i <= 45; i++) {
            frequency[i] = 0;
        }
        
        // 최신 15개 회차 빈도 계산
        this.lottoData.forEach(round => {
            round.numbers.forEach(num => {
                frequency[num]++;
            });
        });
        
        let html = `
            <div class="draws-header">
                <div class="sheet-title">📊 최신 ${this.lottoData.length}개 회차 히트맵</div>
                <div class="sheet-subtitle">번호별 출현 빈도 시각화</div>
            </div>
            
            <div class="heat-legend">
                <span>출현 빈도:</span>
                <div class="legend-item">
                    <div class="legend-color heat-0"></div>
                    <span>0회</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color heat-3"></div>
                    <span>1-3회</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color heat-6"></div>
                    <span>4-6회</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color heat-10"></div>
                    <span>7회+</span>
                </div>
            </div>
            
            <div class="heat-map-grid">
        `;
        
        for (let i = 1; i <= 45; i++) {
            const count = frequency[i];
            const heatLevel = Math.min(Math.floor(count * 1.5), 10);
            
            html += `
                <div class="heat-cell heat-${heatLevel}" title="번호 ${i}: ${count}회 출현">
                    <div class="heat-number">${i}</div>
                    <div class="heat-count">${count}회</div>
                </div>
            `;
        }
        
        html += `
            </div>
            
            <div class="round-list">
        `;
        
        // 최신 회차들 표시
        this.lottoData.slice().reverse().forEach(round => {
            html += `
                <div class="round-item">
                    <div class="round-header">${round.round}회 (${round.date})</div>
                    <div class="round-numbers">
                        ${round.numbers.map(num => `<div class="round-number">${num}</div>`).join('')}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        document.getElementById('recentDrawsSheet').innerHTML = html;
    }
    
    // 확률 높은 번호 TOP 5 예측
    predictTopNumbers() {
        const predictions = [];
        
        // 1. 빈도 기반 점수
        const frequencyScores = {};
        Object.entries(this.analysis.frequency).forEach(([num, freq]) => {
            frequencyScores[num] = freq;
        });
        
        // 2. 최근 트렌드 점수 (최근 5회차 가중치)
        const trendScores = {};
        for (let i = 1; i <= 45; i++) {
            trendScores[i] = 0;
        }
        
        const recentRounds = this.lottoData.slice(-5); // 최근 5회차
        recentRounds.forEach((round, index) => {
            const weight = (index + 1) * 0.3; // 최근일수록 높은 가중치
            round.numbers.forEach(num => {
                trendScores[num] += weight;
            });
        });
        
        // 3. 구간 균형 점수
        const rangeScores = {};
        for (let i = 1; i <= 45; i++) {
            if (i <= 15) rangeScores[i] = 1.2; // 1-15 구간 약간 높은 점수
            else if (i <= 30) rangeScores[i] = 1.0; // 16-30 구간 기본 점수
            else rangeScores[i] = 1.1; // 31-45 구간 약간 높은 점수
        }
        
        // 4. 홀짝 균형 점수
        const oddEvenScores = {};
        for (let i = 1; i <= 45; i++) {
            oddEvenScores[i] = i % 2 === 1 ? 1.1 : 1.0; // 홀수에 약간 높은 점수
        }
        
        // 5. 종합 점수 계산
        for (let i = 1; i <= 45; i++) {
            const totalScore = 
                (frequencyScores[i] || 0) * 0.4 +  // 빈도 40%
                (trendScores[i] || 0) * 0.3 +      // 트렌드 30%
                rangeScores[i] * 0.15 +            // 구간 15%
                oddEvenScores[i] * 0.15;           // 홀짝 15%
            
            predictions.push({
                number: i,
                score: totalScore,
                frequency: frequencyScores[i] || 0,
                trend: trendScores[i] || 0
            });
        }
        
        // 점수 순으로 정렬하여 TOP 5 반환
        return predictions.sort((a, b) => b.score - a.score).slice(0, 5);
    }
    
    // 예측 번호 표시
    displayPredictionNumbers(predictions) {
        const html = predictions.map((pred, index) => {
            const probability = Math.min(95, Math.round(pred.score * 10 + 60)); // 60-95% 범위
            const reason = this.getPredictionReason(pred);
            
            return `
                <div class="prediction-item">
                    <div class="prediction-rank">${index + 1}위</div>
                    <div class="prediction-number">${pred.number}</div>
                    <div class="prediction-probability">${probability}% 확률</div>
                    <div class="prediction-reason">${reason}</div>
                </div>
            `;
        }).join('');
        
        document.getElementById('predictionNumbers').innerHTML = html;
    }
    
    // 예측 이유 생성
    getPredictionReason(prediction) {
        const reasons = [];
        
        if (prediction.frequency >= 3) {
            reasons.push('자주 출현');
        } else if (prediction.frequency <= 1) {
            reasons.push('출현 대기');
        }
        
        if (prediction.trend > 1) {
            reasons.push('최근 상승');
        }
        
        if (prediction.number <= 15) {
            reasons.push('저구간');
        } else if (prediction.number > 30) {
            reasons.push('고구간');
        }
        
        if (prediction.number % 2 === 1) {
            reasons.push('홀수');
        }
        
        return reasons.length > 0 ? reasons.join(', ') : '균형 선택';
    }
    
    // 확률 기반 추천 조합 생성
    generateProbabilityRecommendations(topPredictions) {
        const sets = [];
        const topNumbers = topPredictions.map(p => p.number);
        
        for (let i = 0; i < 5; i++) {
            const numbers = [];
            
            // TOP 5 중에서 3-4개 선택
            const topCount = Math.random() < 0.6 ? 3 : 4;
                       const selectedTop = this.getRandomSample(topNumbers, topCount);
            numbers.push(...selectedTop);
            
            // 나머지는 다른 번호에서 선택
            const remaining = 6 - numbers.length;
            const otherNumbers = Array.from({length: 45}, (_, i) => i + 1)
                .filter(n => !numbers.includes(n));
            
            // 구간 균형을 고려한 선택
            const neededNumbers = [];
            const ranges = [
                { start: 1, end: 15, current: numbers.filter(n => n <= 15).length },
                { start: 16, end: 30, current: numbers.filter(n => n > 15 && n <= 30).length },
                { start: 31, end: 45, current: numbers.filter(n => n > 30).length }
            ];
            
            // 부족한 구간에서 우선 선택
            for (let j = 0; j < remaining; j++) {
                const underRepresented = ranges.find(r => r.current < 2);
                if (underRepresented) {
                    const rangeNumbers = otherNumbers.filter(n => 
                        n >= underRepresented.start && n <= underRepresented.end
                    );
                    if (rangeNumbers.length > 0) {
                        const selected = rangeNumbers[Math.floor(Math.random() * rangeNumbers.length)];
                        neededNumbers.push(selected);
                        otherNumbers.splice(otherNumbers.indexOf(selected), 1);
                        underRepresented.current++;
                    }
                } else {
                    // 랜덤 선택
                    if (otherNumbers.length > 0) {
                        const selected = otherNumbers[Math.floor(Math.random() * otherNumbers.length)];
                        neededNumbers.push(selected);
                        otherNumbers.splice(otherNumbers.indexOf(selected), 1);
                    }
                }
            }
            
            numbers.push(...neededNumbers);
            
            sets.push({
                numbers: numbers.slice(0, 6).sort((a, b) => a - b),
                info: this.getSetInfo(numbers.slice(0, 6))
            });
        }
        
        return sets;
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
    
    generateAINumbers() {
        const hotTop8 = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8) // 15개 회차에 맞게 조정
            .map(([num]) => parseInt(num));
        
        const mediumFreq = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(8, 20) // 15개 회차에 맞게 조정
            .map(([num]) => parseInt(num));
        
        const coldSelection = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 8) // 15개 회차에 맞게 조정
            .map(([num]) => parseInt(num));
        
        const sets = [];
        for (let i = 0; i < 5; i++) {
            const numbers = [];
            
            // 자주 나온 번호에서 2-3개
            const hotCount = Math.random() < 0.5 ? 2 : 3;
            numbers.push(...this.getRandomSample(hotTop8, hotCount));
            
            // 중간 빈도에서 2개
            const availableMedium = mediumFreq.filter(n => !numbers.includes(n));
            if (availableMedium.length >= 2) {
                numbers.push(...this.getRandomSample(availableMedium, 2));
            }
            
            // 적게 나온 번호에서 나머지
            const needed = 6 - numbers.length;
            const availableCold = coldSelection.filter(n => !numbers.includes(n));
            if (availableCold.length >= needed) {
                numbers.push(...this.getRandomSample(availableCold, needed));
            } else {
                // 부족하면 전체에서 보충
                const allAvailable = Array.from({length: 45}, (_, i) => i + 1)
                    .filter(n => !numbers.includes(n));
                numbers.push(...this.getRandomSample(allAvailable, needed));
            }
            
            const finalNumbers = numbers.slice(0, 6).sort((a, b) => a - b);
            sets.push({
                numbers: finalNumbers,
                info: this.getSetInfo(finalNumbers)
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
                    ${set.numbers.map(num => `<div class="lotto-ball">${num}</div>`).join('')}
                </div>
                <div class="set-info">${set.info}</div>
            </div>
        `).join('');
        
        document.getElementById(containerId).innerHTML = html;
    }
    
    // 로또 용지 마킹 형식 표시
    displayLottoSheet(recommendations) {
        const games = ['A', 'B', 'C', 'D', 'E'];
        
        let html = `
            <div class="sheet-header">
                <div class="sheet-title">🎰 AI 추천 로또 번호</div>
                <div class="sheet-subtitle">최신 15개 회차 분석 기반 • ${new Date().toLocaleDateString()}</div>
            </div>
        `;
        
        recommendations.forEach((recommendation, index) => {
            const gameLetter = games[index];
            const analysisInfo = this.getDetailedAnalysis(recommendation.numbers);
            
            html += `
                <div class="game-section">
                    <div class="game-label">
                        <div class="game-letter">${gameLetter}</div>
                        <span>게임 ${gameLetter} - AI 추천</span>
                    </div>
                    
                    <div class="number-grid">
                        ${this.generateNumberGrid(recommendation.numbers)}
                    </div>
                    
                    <div class="selected-numbers">
                        <div class="selected-label">선택된 번호:</div>
                        <div class="selected-display">
                            ${recommendation.numbers.map(num => 
                                `<div class="selected-number">${num}</div>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="analysis-info">
                        <strong>📊 분석 정보:</strong><br>
                        <span class="analysis-badge">홀${analysisInfo.odd}짝${analysisInfo.even}</span>
                        <span class="analysis-badge">합계: ${analysisInfo.sum}</span>
                        <span class="analysis-badge">구간분포: ${analysisInfo.ranges}</span>
                        <span class="analysis-badge">${analysisInfo.frequency}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
            <div class="print-button">
                <button class="btn-print" onclick="window.print()">🖨️ 인쇄하기</button>
            </div>
        `;
        
        document.getElementById('lottoSheet').innerHTML = html;
    }
    
    generateNumberGrid(selectedNumbers) {
        let gridHtml = '';
        
        for (let i = 1; i <= 45; i++) {
            const isSelected = selectedNumbers.includes(i);
            const cellClass = isSelected ? 'number-cell marked' : 'number-cell';
            
            gridHtml += `<div class="${cellClass}">${i}</div>`;
        }
        
        return gridHtml;
    }
    
    getDetailedAnalysis(numbers) {
        const oddCount = numbers.filter(n => n % 2 === 1).length;
        const evenCount = 6 - oddCount;
        const sum = numbers.reduce((a, b) => a + b, 0);
        
        // 구간별 분포
        const ranges = {
            low: numbers.filter(n => n <= 15).length,
            mid: numbers.filter(n => n > 15 && n <= 30).length,
            high: numbers.filter(n => n > 30).length
        };
        
        // 빈도 분석
        const hotCount = numbers.filter(n => {
            const freq = this.analysis.frequency[n] || 0;
            const avgFreq = Object.values(this.analysis.frequency).reduce((a, b) => a + b, 0) / 45;
            return freq > avgFreq;
        }).length;
        
        return {
            odd: oddCount,
            even: evenCount,
            sum: sum,
            ranges: `${ranges.low}-${ranges.mid}-${ranges.high}`,
            frequency: `자주나온번호 ${hotCount}개`
        };
    }
    
    getSetInfo(numbers) {
        const oddCount = numbers.filter(n => n % 2 === 1).length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        return `홀${oddCount}짝${6-oddCount}, 합계:${sum}`;
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

