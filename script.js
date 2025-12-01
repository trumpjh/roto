class LottoAnalyzer {
    constructor() {
        // CORS 프록시 설정
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://thingproxy.freeboard.io/fetch/',
            'https://cors-proxy.htmldriven.com/?url='
        ];
        this.currentProxyIndex = 0;
        
        this.originalUrl = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
        this.updateProxy();
        
        // 데이터 저장
        this.lottoData = [];
        this.analysis = {};
        this.isAnalyzing = false;
        
        // 로또 용지 열 정의
        this.columns = [
            [1,2,3,4,5,6,7],           // 1열: 1~7
            [8,9,10,11,12,13,14],      // 2열: 8~14
            [15,16,17,18,19,20,21],    // 3열: 15~21
            [22,23,24,25,26,27,28],    // 4열: 22~28
            [29,30,31,32,33,34,35],    // 5열: 29~35
            [36,37,38,39,40,41,42],    // 6열: 36~42
            [43,44,45]                 // 7열: 43~45
        ];
        
        this.initializeEventListeners();
    }
    
    updateProxy() {
        this.corsProxy = this.corsProxies[this.currentProxyIndex];
        console.log(`현재 프록시: ${this.corsProxy}`);
    }
    
    initializeEventListeners() {
        document.getElementById('analyzeBtn').addEventListener('click', () => this.startAnalysis());
        document.getElementById('generateBtn').addEventListener('click', () => this.generateRecommendations());
        
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
    
    async startAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.showLoading(true);
        let analysisAttempt = 0;
        const maxAnalysisAttempts = 3;
        
        while (analysisAttempt < maxAnalysisAttempts) {
            try {
                analysisAttempt++;
                console.log(`\n분석 시도 ${analysisAttempt}/${maxAnalysisAttempts}`);
                
                // 1. 연결 테스트
                this.updateStatus('연결 상태 확인 중...');
                const connectionOk = await this.testConnection();
                if (!connectionOk) {
                    throw new Error('연결 테스트 실패');
                }
                
                // 2. 최신 회차 확인
                this.updateStatus('최신 회차 확인 중...');
                const latestRound = await this.getLatestRound();
                
                // 3. 최신 20개 회차 데이터 수집
                const startRound = Math.max(1, latestRound - 19); // 20개 회차
                const endRound = latestRound;
                
                this.updateStatus(`📊 최신 20개 회차 (${startRound}회 ~ ${endRound}회) 데이터 수집 중...`);
                
                // 4. 데이터 수집 (재시도 로직 포함)
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
                
                console.log('✅ 분석 성공!');
                break; // 성공하면 루프 종료
                
            } catch (error) {
                console.error(`분석 시도 ${analysisAttempt} 오류:`, error);
                
                if (analysisAttempt < maxAnalysisAttempts) {
                    // 다음 시도 전 대기
                    const waitTime = 3000 * analysisAttempt; // 3초, 6초, 9초
                    this.updateStatus(`❌ ${error.message}\n${waitTime / 1000}초 후 재시도합니다... (${analysisAttempt}/${maxAnalysisAttempts})`);
                    console.log(`${waitTime / 1000}초 후 재시도...`);
                    await this.delay(waitTime);
                } else {
                    // 모든 시도 실패
                    this.updateStatus(`❌ 분석 실패: ${error.message} (${maxAnalysisAttempts}회 재시도 후)\n잠시 후 다시 시도해주세요.`);
                    console.error('❌ 모든 분석 시도 실패');
                }
            }
        }
        
        this.showLoading(false);
        this.isAnalyzing = false;
    }
    
    async testConnection() {
        try {
            const testRound = 1000;
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(this.originalUrl + testRound)}`);
            const result = await response.json();
            const data = JSON.parse(result.contents);
            
            return data.returnValue === 'success';
        } catch (error) {
            console.error('연결 테스트 실패:', error);
            return false;
        }
    }
    
    async getLatestRound() {
        const currentDate = new Date();
        const startDate = new Date('2002-12-07');
        const diffWeeks = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 7));
        const estimatedRound = diffWeeks + 1;
        
        console.log(`추정 최신 회차: ${estimatedRound}`);
        
        // 추정 회차부터 역순으로 30개 회차 확인
        for (let round = estimatedRound; round > estimatedRound - 30; round--) {
            try {
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(this.originalUrl + round)}`);
                const result = await response.json();
                const data = JSON.parse(result.contents);
                
                if (data.returnValue === 'success' && data.drwtNo1) {
                    console.log(`✅ 최신 회차 발견: ${round}회`);
                    return round;
                }
                
                await this.delay(300);
            } catch (error) {
                continue;
            }
        }
        
        return estimatedRound - 5;
    }
    
    async fetchLottoData(startRound, endRound, retryCount = 0) {
        const data = [];
        const failedRounds = [];
        const totalRounds = endRound - startRound + 1;
        const maxRetries = 3;
        
        // 첫 번째 시도
        for (let round = startRound; round <= endRound; round++) {
            const roundData = await this.fetchSingleRound(round);
            
            if (roundData) {
                data.push(roundData);
                console.log(`✅ 회차 ${round} 수집 완료: ${roundData.numbers}`);
            } else {
                failedRounds.push(round);
                console.warn(`⚠️ 회차 ${round} 수집 실패`);
            }
            
            const progress = Math.round(((round - startRound + 1) / totalRounds) * 100);
            this.updateStatus(`데이터 수집 중... ${progress}% (${round}회)`);
            
            await this.delay(400);
        }
        
        // 실패한 회차 재시도
        if (failedRounds.length > 0 && retryCount < maxRetries) {
            console.log(`\n재시도 ${retryCount + 1}/${maxRetries}: 실패한 ${failedRounds.length}개 회차 재수집 중...`);
            this.updateStatus(`⚠️ ${failedRounds.length}개 회차 재수집 중... (시도 ${retryCount + 1}/${maxRetries})`);
            
            // 재시도 전에 더 긴 딜레이
            await this.delay(2000);
            
            for (let round of failedRounds) {
                const roundData = await this.fetchSingleRound(round);
                
                if (roundData) {
                    data.push(roundData);
                    console.log(`✅ 재시도 - 회차 ${round} 수집 완료`);
                    failedRounds.splice(failedRounds.indexOf(round), 1);
                } else {
                    console.warn(`⚠️ 재시도 - 회차 ${round} 수집 실패`);
                }
                
                await this.delay(500);
            }
            
            // 여전히 실패한 회차가 있으면 재귀적으로 재시도
            if (failedRounds.length > 0) {
                return this.fetchLottoData(startRound, endRound, retryCount + 1);
            }
        }
        
        // 최소 15개 이상의 데이터 필요
        if (data.length < 15) {
            throw new Error(`필요한 데이터 수집 실패: ${data.length}개/20개 (최소 15개 필요)`);
        }
        
        // 부분 수집 시 경고
        if (data.length < totalRounds) {
            console.warn(`⚠️ 부분 수집 완료: ${data.length}개/${totalRounds}개`);
            this.updateStatus(`⚠️ 부분 수집 완료: ${data.length}개 회차 분석 시작...`);
            await this.delay(1000);
        }
        
        return data.sort((a, b) => a.round - b.round);
    }
    
    async fetchSingleRound(round) {
        // 최대 3개 프록시 시도
        const proxies = [
            { name: 'allorigins', url: `https://api.allorigins.win/get?url=${encodeURIComponent(this.originalUrl + round)}` },
            { name: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${this.originalUrl}${round}` },
            { name: 'cors-proxy', url: `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(this.originalUrl + round)}` }
        ];
        
        for (let proxyAttempt = 0; proxyAttempt < proxies.length; proxyAttempt++) {
            try {
                const proxy = proxies[proxyAttempt];
                console.log(`회차 ${round}: ${proxy.name} 프록시 시도 중...`);
                
                const response = await fetch(proxy.url, { 
                    headers: { 'Accept': 'application/json' },
                    timeout: 10000 
                });
                
                if (!response.ok) {
                    console.warn(`회차 ${round}: ${proxy.name} HTTP ${response.status}`);
                    continue;
                }
                
                const result = await response.json();
                
                // allorigins 응답 처리
                if (proxy.name === 'allorigins' && result.contents) {
                    const data = JSON.parse(result.contents);
                    if (this.validateRoundData(data)) {
                        return this.extractRoundData(data, round);
                    }
                } else {
                    // 직접 응답 처리
                    if (this.validateRoundData(result)) {
                        return this.extractRoundData(result, round);
                    }
                }
            } catch (error) {
                console.warn(`회차 ${round} ${proxies[proxyAttempt].name} 오류:`, error.message);
                continue;
            }
        }
        
        return null;
    }
    
    validateRoundData(data) {
        return data && data.returnValue === 'success' && data.drwtNo1;
    }
    
    extractRoundData(data, round) {
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
        
        return null;
    }
    
    analyzeData(data) {
        const analysis = {
            frequency: {},
            columnFrequency: {},
            columnByRound: [],
            hotNumbers: [],
            coldNumbers: [],
            totalRounds: data.length
        };
        
        // 번호별 빈도 초기화
        for (let i = 1; i <= 45; i++) {
            analysis.frequency[i] = 0;
        }
        
        // 열별 빈도 초기화
        for (let i = 0; i < 7; i++) {
            analysis.columnFrequency[i] = 0;
        }
        
        // 각 회차별 분석
        data.forEach((round, roundIndex) => {
            const numbers = round.numbers.sort((a, b) => a - b);
            const roundColumns = [0, 0, 0, 0, 0, 0, 0];
            
            // 번호별 빈도 계산
            numbers.forEach(num => {
                analysis.frequency[num]++;
                
                // 해당 번호가 속한 열 찾기
                const columnIndex = this.columns.findIndex(col => col.includes(num));
                if (columnIndex !== -1) {
                    analysis.columnFrequency[columnIndex]++;
                    roundColumns[columnIndex]++;
                }
            });
            
            // 회차별 열 분포 저장
            analysis.columnByRound.push({
                round: round.round,
                date: round.date,
                numbers: numbers,
                columnDistribution: roundColumns
            });
        });
        
        // 자주 나온 번호와 자주 나오지 않은 번호 분류
        const sortedByFrequency = Object.entries(analysis.frequency)
            .sort(([,a], [,b]) => b - a);
        
        analysis.hotNumbers = sortedByFrequency
            .filter(([,freq]) => freq >= 3)
            .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));
        
        analysis.coldNumbers = sortedByFrequency
            .filter(([,freq]) => freq <= 1)
            .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }));
        
        return analysis;
    }
    
    displayAnalysisResults() {
        this.displayLottoHeatmap();
        this.displayHotNumbers();
        this.displayColdNumbers();
        this.displayColumnAnalysis();
        this.displayStatsSummary();
    }
    
    displayLottoHeatmap() {
        const totalRounds = this.analysis.totalRounds;
        
        let html = `
            <div class="heatmap-header">
                <h4>최근 ${totalRounds}회차 번호별 출현 빈도</h4>
                <p>색상이 진할수록 자주 나온 번호입니다</p>
            </div>
            <div class="heatmap-grid">
        `;
        
        // 로또 용지 배치대로 히트맵 생성
        this.columns.forEach((column, columnIndex) => {
            html += `<div class="heatmap-row">`;
            
            column.forEach(num => {
                const count = this.analysis.frequency[num] || 0;
                const percentage = ((count / totalRounds) * 100).toFixed(1);
                const heatLevel = Math.min(Math.floor(count * 1.2), 10);
                
                html += `
                    <div class="heatmap-cell heat-${heatLevel}" title="번호 ${num}: ${count}회 출현 (${percentage}%)">
                        <div class="cell-number">${num}</div>
                        <div class="cell-count">${count}회</div>
                        <div class="cell-percentage">${percentage}%</div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        html += `</div>`;
        
        document.getElementById('lottoHeatmap').innerHTML = html;
    }
    
    displayHotNumbers() {
        const html = this.analysis.hotNumbers.map(item => {
            const percentage = ((item.frequency / this.analysis.totalRounds) * 100).toFixed(1);
            return `
                <div class="number-item">
                    <div class="number-ball hot">${item.number}</div>
                    <div class="number-info">
                        <div class="number-count">${item.frequency}회</div>
                        <div class="number-percentage">${percentage}%</div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('hotNumbersAnalysis').innerHTML = html || '<p>자주 나온 번호가 없습니다.</p>';
    }
    
    displayColdNumbers() {
        const html = this.analysis.coldNumbers.map(item => {
            const percentage = ((item.frequency / this.analysis.totalRounds) * 100).toFixed(1);
            return `
                <div class="number-item">
                    <div class="number-ball cold">${item.number}</div>
                    <div class="number-info">
                        <div class="number-count">${item.frequency}회</div>
                        <div class="number-percentage">${percentage}%</div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('coldNumbersAnalysis').innerHTML = html || '<p>자주 나오지 않은 번호가 없습니다.</p>';
    }
    
    displayColumnAnalysis() {
        let html = '';
        
        // 각 열별 통계
        this.columns.forEach((column, index) => {
            const columnTotal = this.analysis.columnFrequency[index] || 0;
            const avgPerRound = (columnTotal / this.analysis.totalRounds).toFixed(1);
            const avgPerNumber = (columnTotal / column.length).toFixed(1);
            
            html += `
                <div class="column-item">
                    <div class="column-header">${index + 1}열 (${column[0]}~${column[column.length-1]})</div>
                    <div class="column-stats">
                        <div class="column-stat">
                            <span class="stat-label">총 출현:</span>
                            <span class="stat-value">${columnTotal}회</span>
                        </div>
                        <div class="column-stat">
                            <span class="stat-label">회차당 평균:</span>
                            <span class="stat-value">${avgPerRound}개</span>
                        </div>
                        <div class="column-stat">
                            <span class="stat-label">번호당 평균:</span>
                            <span class="stat-value">${avgPerNumber}회</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('columnAnalysis').innerHTML = html;
    }
    
    displayStatsSummary() {
        const totalNumbers = Object.values(this.analysis.frequency).reduce((a, b) => a + b, 0);
        const avgFreq = (totalNumbers / 45).toFixed(1);
        
        const mostFrequent = Object.entries(this.analysis.frequency)
            .reduce(([maxNum, maxFreq], [num, freq]) => 
                freq > maxFreq ? [num, freq] : [maxNum, maxFreq], ['1', 0]);
        
        const leastFrequent = Object.entries(this.analysis.frequency)
            .reduce(([minNum, minFreq], [num, freq]) => 
                freq < minFreq ? [num, freq] : [minNum, minFreq], ['1', 999]);
        
        const html = `
            <div class="stat-item">
                <div class="stat-value">${this.analysis.totalRounds}</div>
                <div class="stat-label">분석 회차</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalNumbers}</div>
                <div class="stat-label">총 번호 개수</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${mostFrequent[0]}</div>
                <div class="stat-label">최다 출현 번호<br>(${mostFrequent[1]}회)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${leastFrequent[0]}</div>
                <div class="stat-label">최소 출현 번호<br>(${leastFrequent[1]}회)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${avgFreq}</div>
                <div class="stat-label">평균 출현 횟수</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${this.analysis.hotNumbers.length}</div>
                <div class="stat-label">자주 나온 번호</div>
            </div>
        `;
        
        document.getElementById('statsSummary').innerHTML = html;
    }
    
    generateRecommendations() {
        if (!this.analysis.frequency) {
            alert('먼저 데이터 분석을 실행해주세요.');
            return;
        }
        
        const recommendations = this.generate10DifferentSets();
        this.displayRecommendations(recommendations);
        this.displayRecommendationBasis();
    }
    
    generate10DifferentSets() {
        const sets = [];
        const usedCombinations = new Set();
        
        // 전략별 번호 생성
        const strategies = [
            { name: '자주나온번호위주', method: 'hot-focused' },
            { name: '안나온번호위주', method: 'cold-focused' },
            { name: '열별균형', method: 'column-balanced' },
            { name: '혼합전략1', method: 'mixed-1' },
            { name: '혼합전략2', method: 'mixed-2' },
            { name: '중간빈도위주', method: 'medium-focused' },
            { name: '구간균형', method: 'range-balanced' },
            { name: '홀짝균형', method: 'odd-even-balanced' },
            { name: '랜덤조합1', method: 'random-1' },
            { name: '랜덤조합2', method: 'random-2' }
        ];
        
        strategies.forEach((strategy, index) => {
            let attempts = 0;
            let numbers;
            
            do {
                numbers = this.generateNumbersByStrategy(strategy.method);
                attempts++;
            } while (usedCombinations.has(numbers.join(',')) && attempts < 10);
            
            if (numbers && numbers.length === 6) {
                usedCombinations.add(numbers.join(','));
                sets.push({
                    id: index + 1,
                    strategy: strategy.name,
                    numbers: numbers.sort((a, b) => a - b),
                    analysis: this.analyzeSet(numbers)
                });
            }
        });
        
        return sets;
    }
    
    generateNumbersByStrategy(method) {
        const hotNumbers = this.analysis.hotNumbers.map(item => item.number);
        const coldNumbers = this.analysis.coldNumbers.map(item => item.number);
        const allNumbers = Array.from({length: 45}, (_, i) => i + 1);
        const mediumNumbers = allNumbers.filter(n => 
            !hotNumbers.includes(n) && !coldNumbers.includes(n)
        );
        
        let numbers = [];
        
        switch(method) {
            case 'hot-focused':
                // 자주 나온 번호 4개 + 중간 번호 2개
                numbers.push(...this.getRandomSample(hotNumbers, 4));
                numbers.push(...this.getRandomSample(mediumNumbers.filter(n => !numbers.includes(n)), 2));
                break;
                
            case 'cold-focused':
                // 안 나온 번호 4개 + 자주 나온 번호 2개
                numbers.push(...this.getRandomSample(coldNumbers, 4));
                numbers.push(...this.getRandomSample(hotNumbers.filter(n => !numbers.includes(n)), 2));
                break;
                
            case 'column-balanced':
                // 각 열에서 1개씩 (7열 제외하고 6개)
                for (let i = 0; i < 6; i++) {
                    const columnNumbers = this.columns[i].filter(n => !numbers.includes(n));
                    if (columnNumbers.length > 0) {
                        numbers.push(this.getRandomSample(columnNumbers, 1)[0]);
                    }
                }
                break;
                
            case 'mixed-1':
                // 자주 나온 번호 2개 + 안 나온 번호 2개 + 중간 번호 2개
                numbers.push(...this.getRandomSample(hotNumbers, 2));
                numbers.push(...this.getRandomSample(coldNumbers.filter(n => !numbers.includes(n)), 2));
                numbers.push(...this.getRandomSample(mediumNumbers.filter(n => !numbers.includes(n)), 2));
                break;
                
            case 'mixed-2':
                // 자주 나온 번호 3개 + 안 나온 번호 1개 + 중간 번호 2개
                numbers.push(...this.getRandomSample(hotNumbers, 3));
                numbers.push(...this.getRandomSample(coldNumbers.filter(n => !numbers.includes(n)), 1));
                numbers.push(...this.getRandomSample(mediumNumbers.filter(n => !numbers.includes(n)), 2));
                break;
                
            case 'medium-focused':
                // 중간 빈도 번호 위주
                numbers.push(...this.getRandomSample(mediumNumbers, 6));
                break;
                
            case 'range-balanced':
                // 구간별 균형 (1-15: 2개, 16-30: 2개, 31-45: 2개)
                const range1 = allNumbers.filter(n => n <= 15);
                const range2 = allNumbers.filter(n => n > 15 && n <= 30);
                const range3 = allNumbers.filter(n => n > 30);
                
                numbers.push(...this.getRandomSample(range1, 2));
                numbers.push(...this.getRandomSample(range2, 2));
                numbers.push(...this.getRandomSample(range3, 2));
                break;
                
            case 'odd-even-balanced':
                // 홀수 3개, 짝수 3개
                const oddNumbers = allNumbers.filter(n => n % 2 === 1);
                const evenNumbers = allNumbers.filter(n => n % 2 === 0);
                
                numbers.push(...this.getRandomSample(oddNumbers, 3));
                numbers.push(...this.getRandomSample(evenNumbers, 3));
                break;
                
            case 'random-1':
            case 'random-2':
                // 완전 랜덤
                numbers = this.getRandomSample(allNumbers, 6);
                break;
        }
        
        // 부족한 경우 보충
        while (numbers.length < 6) {
            const available = allNumbers.filter(n => !numbers.includes(n));
            if (available.length > 0) {
                numbers.push(this.getRandomSample(available, 1)[0]);
            } else {
                break;
            }
        }
        
        return numbers.slice(0, 6);
    }
    
    analyzeSet(numbers) {
        const oddCount = numbers.filter(n => n % 2 === 1).length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        
        // 구간 분포
        const ranges = {
            low: numbers.filter(n => n <= 15).length,
            mid: numbers.filter(n => n > 15 && n <= 30).length,
            high: numbers.filter(n => n > 30).length
        };
        
        // 열별 분포
        const columnDist = [0, 0, 0, 0, 0, 0, 0];
        numbers.forEach(num => {
            const columnIndex = this.columns.findIndex(col => col.includes(num));
            if (columnIndex !== -1) {
                columnDist[columnIndex]++;
            }
        });
        
        // 빈도 분석
        const hotCount = numbers.filter(n => 
            this.analysis.hotNumbers.some(hot => hot.number === n)
        ).length;
        
        const coldCount = numbers.filter(n => 
            this.analysis.coldNumbers.some(cold => cold.number === n)
        ).length;
        
        return {
            oddEven: `홀${oddCount}짝${6-oddCount}`,
            sum: sum,
            ranges: `${ranges.low}-${ranges.mid}-${ranges.high}`,
            columns: columnDist.map((count, index) => count > 0 ? `${index+1}열:${count}` : '').filter(s => s).join(' '),
            frequency: `자주:${hotCount} 안나온:${coldCount} 중간:${6-hotCount-coldCount}`
        };
    }
    
    displayRecommendations(recommendations) {
        const html = recommendations.map(rec => `
            <div class="recommendation-set">
                <div class="set-header">
                    <div class="set-title">추천 ${rec.id}번</div>
                    <div class="set-strategy">${rec.strategy}</div>
                </div>
                <div class="set-numbers">
                    ${rec.numbers.map(num => `<div class="recommendation-ball">${num}</div>`).join('')}
                </div>
                <div class="set-analysis">
                    <strong>분석:</strong> ${rec.analysis.oddEven} | ${rec.analysis.ranges} | 합계:${rec.analysis.sum}<br>
                    <strong>열분포:</strong> ${rec.analysis.columns}<br>
                    <strong>빈도:</strong> ${rec.analysis.frequency}
                </div>
            </div>
        `).join('');
        
        document.getElementById('recommendedNumbers').innerHTML = html;
    }
    
    displayRecommendationBasis() {
        const html = `
            <div class="basis-item">
                <div class="basis-title">🔥 자주 나온 번호 활용</div>
                <div class="basis-content">
                    최근 20회차에서 3회 이상 출현한 번호들을 우선적으로 고려합니다. 
                    이들 번호는 통계적으로 높은 출현 빈도를 보이고 있습니다.
                </div>
            </div>
            <div class="basis-item">
                <div class="basis-title">❄️ 안 나온 번호 고려</div>
                <div class="basis-content">
                    최근 20회차에서 1회 이하로 출현한 번호들도 균형있게 포함시킵니다. 
                    확률적으로 출현 가능성이 있는 번호들입니다.
                </div>
            </div>
            <div class="basis-item">
                <div class="basis-title">📊 열별 균형 분석</div>
                <div class="basis-content">
                    로또 용지의 7개 열별 출현 패턴을 분석하여 균형있는 번호 선택을 합니다. 
                    특정 열에 편중되지 않도록 조절합니다.
                </div>
            </div>
            <div class="basis-item">
                <div class="basis-title">🎯 다양한 전략 적용</div>
                <div class="basis-content">
                    10가지 서로 다른 전략을 적용하여 다양한 관점에서 번호를 추천합니다. 
                    각 전략은 서로 다른 분석 기준을 가지고 있습니다.
                </div>
            </div>
        `;
        
        document.getElementById('recommendationBasis').innerHTML = html;
    }
    
    getRandomSample(array, count) {
        if (array.length === 0) return [];
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, array.length));
    }
    
    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
        document.getElementById('analyzeBtn').disabled = show;
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        // 줄바꿈(\n)을 <br>로 변환
        const formattedMessage = message.replace(/\n/g, '<br>');
        statusElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; white-space: pre-wrap; word-wrap: break-word;">
                <div>${formattedMessage}</div>
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
