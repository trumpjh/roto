class LottoAnalyzer {
    constructor() {
        this.baseUrl = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
        this.lottoData = [];
        this.analysis = {};
        this.isAnalyzing = false;
        
        this.initializeEventListeners();
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
    
    async startAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.showLoading(true);
        this.updateStatus('최신 회차 확인 중...');
        
        try {
            // 1. 최신 회차 확인
            const latestRound = await this.getLatestRound();
            
            // 2. 1년간 데이터 수집 (52주)
            const startRound = Math.max(1, latestRound - 51);
            const endRound = latestRound;
            
            this.updateStatus(`${startRound}회 ~ ${endRound}회 데이터 수집 중...`);
            
            // 3. 데이터 수집
            this.lottoData = await this.fetchLottoData(startRound, endRound);
            
            // 4. 데이터 분석
            this.updateStatus('데이터 분석 중...');
            this.analysis = this.analyzeData(this.lottoData);
            
            // 5. 결과 표시
            this.displayAnalysisResults();
            this.updateStatus(`분석 완료! ${this.lottoData.length}개 회차 데이터 분석됨`);
            
            // 번호 생성 버튼 활성화
            document.getElementById('generateBtn').disabled = false;
            
        } catch (error) {
            console.error('분석 중 오류:', error);
            this.updateStatus('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            this.showLoading(false);
            this.isAnalyzing = false;
        }
    }
    
    async getLatestRound() {
        // 대략적인 최신 회차부터 확인
        const estimatedRound = 1150;
        
        for (let round = estimatedRound; round > estimatedRound - 50; round--) {
            try {
                const response = await fetch(`${this.baseUrl}${round}`);
                const data = await response.json();
                
                if (data.returnValue === 'success') {
                    return round;
                }
            } catch (error) {
                continue;
            }
        }
        
        return 1100; // 기본값
    }
    
    async fetchLottoData(startRound, endRound) {
        const data = [];
        const batchSize = 5; // 동시 요청 수 제한
        
        for (let i = startRound; i <= endRound; i += batchSize) {
            const promises = [];
            
            for (let j = i; j < Math.min(i + batchSize, endRound + 1); j++) {
                promises.push(this.fetchSingleRound(j));
            }
            
            const results = await Promise.allSettled(promises);
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    data.push(result.value);
                }
            });
            
            // 진행률 업데이트
            const progress = Math.round(((i - startRound + batchSize) / (endRound - startRound + 1)) * 100);
            this.updateStatus(`데이터 수집 중... ${Math.min(progress, 100)}%`);
            
            // API 호출 제한을 위한 딜레이
            await this.delay(200);
        }
        
        return data.sort((a, b) => a.round - b.round);
    }
    
    async fetchSingleRound(round) {
        try {
            const response = await fetch(`${this.baseUrl}${round}`);
            const data = await response.json();
            
            if (data.returnValue === 'success') {
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
            console.error(`Round ${round} fetch error:`, error);
        }
        
        return null;
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
            <h3>📊 분석 요약</h3>
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
                    <div class="stat-label">평균
                    <div class="stat-value">${avgFreq.toFixed(1)}</div>
                    <div class="stat-label">평균 출현 횟수</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.analysis.consecutive}</div>
                    <div class="stat-label">연속번호 포함 회차</div>
                </div>
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
        
        // 자주 나온 번호 기반 추천
        const hotRecommendations = this.generateHotNumbers();
        this.displayLottoSets('hotRecommendations', hotRecommendations);
        
        // 적게 나온 번호 기반 추천
        const coldRecommendations = this.generateColdNumbers();
        this.displayLottoSets('coldRecommendations', coldRecommendations);
        
        // AI 종합 추천
        const aiRecommendations = this.generateAINumbers();
        this.displayLottoSets('aiRecommendations', aiRecommendations);
        
        // 균형잡힌 전략
        const balancedRecommendations = this.generateBalancedNumbers();
        this.displayLottoSets('balancedRecommendations', balancedRecommendations);
    }
    
    generateHotNumbers() {
        const hotNumbers = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 25)
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
            .slice(0, 25)
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
        const hotTop10 = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([num]) => parseInt(num));
        
        const mediumFreq = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(10, 30)
            .map(([num]) => parseInt(num));
        
        const coldSelection = Object.entries(this.analysis.frequency)
            .sort(([,a], [,b]) => a - b)
            .slice(0, 10)
            .map(([num]) => parseInt(num));
        
        const sets = [];
        for (let i = 0; i < 5; i++) {
            const numbers = [];
            
            // 자주 나온 번호에서 2-3개
            const hotCount = Math.random() < 0.5 ? 2 : 3;
            numbers.push(...this.getRandomSample(hotTop10, hotCount));
            
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
        document.getElementById('status').textContent = message;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new LottoAnalyzer();
});
