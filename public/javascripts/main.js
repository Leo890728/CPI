// 全域變數
let chart = null;
let allData = null; // 保存完整資料用於視角切換

// 時間範圍配置
const timeRanges = {
    full: { startYear: 1951, endYear: 2024, baseYear: 1951 },
    '20years': { startYear: 2005, endYear: 2024, baseYear: 2005 },
    '10years': { startYear: 2015, endYear: 2024, baseYear: 2015 },
    '5years': { startYear: 2020, endYear: 2024, baseYear: 2020 },
    custom: { startYear: 1951, endYear: 2024, baseYear: 1951 }
};

// 年份驗證常數
const YEAR_CONSTRAINTS = {
    MIN_YEAR: 1951,
    MAX_YEAR: 2024,
    MIN_RANGE: 2
};

// DOM 元素
const timeRangeSelect = document.getElementById('timeRange');
const customRangeDiv = document.getElementById('customRange');
const startYearInput = document.getElementById('startYear');
const endYearInput = document.getElementById('endYear');
const chartTypeSelect = document.getElementById('chartType');
const updateButton = document.getElementById('updateChart');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadInitialData();
});

// 事件監聽器
function initializeEventListeners() {
    timeRangeSelect.addEventListener('change', handleTimeRangeChange);
    chartTypeSelect.addEventListener('change', updateChartType);
    updateButton.addEventListener('click', validateAndUpdateCustomRange); // 使用新的驗證函數

    // 自訂範圍輸入變化時自動更新基期年（但不自動更新圖表）
    startYearInput.addEventListener('change', updateCustomBaseYear);
    endYearInput.addEventListener('change', updateCustomBaseYear);

    // 新增即時驗證
    startYearInput.addEventListener('blur', validateYearInput);
    endYearInput.addEventListener('blur', validateYearInput);

    // 新增功能按鈕事件監聽器
    document.getElementById('exportChart').addEventListener('click', exportChart);
    document.getElementById('fullscreenChart').addEventListener('click', toggleFullscreen);

    // 鍵盤快捷鍵支援
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// 處理時間範圍變化
function handleTimeRangeChange() {
    const selectedRange = timeRangeSelect.value;

    if (selectedRange === 'custom') {
        customRangeDiv.style.display = 'flex';
        updateCustomBaseYear();
    } else {
        customRangeDiv.style.display = 'none';
        updateChart();
    }
}

// 統一的年份驗證函數
function validateYearRange(startYear, endYear) {
    const errors = [];

    // 檢查年份是否為有效數字
    if (!startYear || !endYear) {
        errors.push('請輸入有效的年份！');
        return { isValid: false, errors };
    }

    // 檢查年份範圍
    if (startYear < YEAR_CONSTRAINTS.MIN_YEAR || endYear > YEAR_CONSTRAINTS.MAX_YEAR) {
        errors.push(`年份必須在${YEAR_CONSTRAINTS.MIN_YEAR}-${YEAR_CONSTRAINTS.MAX_YEAR}年範圍內！`);
    }

    // 檢查起始年份是否大於結束年份
    if (startYear > endYear) {
        errors.push('起始年份不能大於結束年份！');
    }

    // 檢查年份範圍是否合理
    if (startYear === endYear) {
        errors.push(`年份範圍至少需要${YEAR_CONSTRAINTS.MIN_RANGE}年才能進行分析！`);
    }

    return { isValid: errors.length === 0, errors };
}

// 更新自訂範圍的基期年
function updateCustomBaseYear() {
    const startYear = parseInt(startYearInput.value);
    const endYear = parseInt(endYearInput.value);

    const validation = validateYearRange(startYear, endYear);

    if (!validation.isValid) {
        validation.errors.forEach(error => showError(error));

        // 自動修正：將起始年份設為結束年份
        if (startYear > endYear) {
            startYearInput.value = endYear;
        }
        return;
    }

    // 設定配置
    timeRanges.custom.startYear = startYear;
    timeRanges.custom.endYear = endYear;
    timeRanges.custom.baseYear = startYear;
}

// 驗證自訂範圍並更新圖表
function validateAndUpdateCustomRange() {
    const startYear = parseInt(startYearInput.value);
    const endYear = parseInt(endYearInput.value);

    const validation = validateYearRange(startYear, endYear);

    if (!validation.isValid) {
        validation.errors.forEach(error => showError(error));
        return;
    }

    // 驗證通過，更新配置並更新圖表
    updateCustomBaseYear();
    updateChart();
}

// 載入初始資料
function loadInitialData() {
    // 首次載入時獲取完整資料
    loadFullData();
}

// 載入完整資料
function loadFullData() {
    showLoading();

    Promise.all([
        fetchCPIData(1951, 1951, 2024), // 獲取完整資料
        fetchStatistics(1951, 1951, 2024)
    ])
    .then(([cpiData, statistics]) => {
        allData = cpiData; // 保存完整資料

        // 建立圖表
        createInitialChart();

        // 更新統計顯示
        updateStatisticsDisplay(statistics);
        hideLoading();
    })
    .catch(error => {
        console.error('資料載入錯誤:', error);
        showError('載入資料時發生錯誤，請稍後再試。');
        hideLoading();
    });
}

// 创建初始图表
function createInitialChart() {
    const ctx = document.getElementById('cpiChart').getContext('2d');

    // 销毁现有图表
    if (chart) {
        chart.destroy();
    }

    // 准备完整数据
    const labels = allData.map(item => item.year);
    const cpiValues = allData.map(item => item.cpi);
    const priceValues = allData.map(item => item.price);

    // 图表配置
    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'CPI指數 (基期年: 1951)',
                data: cpiValues,
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#FFD700',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#FFFFFF',
                pointHoverBorderColor: '#FFD700'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '台灣電力價格CPI指數 (1951-2024)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    color: '#FFFFFF'
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#FFFFFF',
                        font: {
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `${context[0].label}年`;
                        },
                        label: function(context) {
                            const index = context.dataIndex;
                            const cpi = cpiValues[index];
                            const price = priceValues[index];
                            const prevCpi = index > 0 ? cpiValues[index - 1] : null;
                            const yoyRate = prevCpi ? ((cpi - prevCpi) / prevCpi * 100).toFixed(2) : 'N/A';

                            return [
                                `CPI指數: ${cpi}`,
                                `實際電價: ${price.toFixed(4)} 元/度`,
                                `年增率: ${yoyRate}%`
                            ];
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#FFD700',
                    bodyColor: '#FFFFFF',
                    borderColor: '#FFD700',
                    borderWidth: 2
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '年份',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.2)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'CPI指數',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#FFFFFF'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.2)'
                    },
                    beginAtZero: false
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    };

    // 创建图表
    chart = new Chart(ctx, chartConfig);
}

// 更新圖表 - 改为视角切换
function updateChart() {
    const selectedRange = timeRangeSelect.value;
    const config = timeRanges[selectedRange];

    if (!allData || !chart) {
        // 如果没有完整数据，重新加载
        loadFullData();
        return;
    }

    // 平移到指定范围
    panToRange(config.startYear, config.endYear);

    // 更新统计数据
    updateStatisticsForRange(config);
}

// 平移圖表到指定範圍
function panToRange(startYear, endYear) {
    if (!chart || !allData) return;

    // 獲取當前選定範圍的配置，以取得正確的基期年
    const selectedRange = timeRangeSelect.value;
    const config = timeRanges[selectedRange];

    // 找到年份对应的索引
    const startIndex = allData.findIndex(item => item.year >= startYear);
    const endIndex = allData.findIndex(item => item.year > endYear);

    const finalEndIndex = endIndex === -1 ? allData.length - 1 : endIndex - 1;

    // 计算显示的年份范围
    const yearRange = endYear - startYear + 1;

    // 根據年份範圍動態調整資料點大小
    let pointRadius, pointHoverRadius, pointBorderWidth;

    if (yearRange <= 5) {
        // 5年以內：大點
        pointRadius = 5;
        pointHoverRadius = 8;
        pointBorderWidth = 3;
    } else if (yearRange <= 10) {
        // 6-10年：中等點
        pointRadius = 4;
        pointHoverRadius = 7;
        pointBorderWidth = 2.5;
    } else if (yearRange <= 20) {
        // 11-20年：標準點
        pointRadius = 3;
        pointHoverRadius = 6;
        pointBorderWidth = 2;
    } else if (yearRange <= 50) {
        // 21-50年：小點
        pointRadius = 1.5;
        pointHoverRadius = 4;
        pointBorderWidth = 1;
    } else {
        // 50年以上（完整期間）：極小點
        pointRadius = 1;
        pointHoverRadius = 3;
        pointBorderWidth = 0.8;
    }

    // 更新資料點樣式
    chart.data.datasets[0].pointRadius = pointRadius;
    chart.data.datasets[0].pointHoverRadius = pointHoverRadius;
    chart.data.datasets[0].pointBorderWidth = pointBorderWidth;

    // 設定X軸範圍
    chart.options.scales.x.min = allData[startIndex].year;
    chart.options.scales.x.max = allData[finalEndIndex].year;

    // 根據時間範圍調整X軸刻度密度
    if (yearRange <= 5) {
        chart.options.scales.x.ticks.maxTicksLimit = yearRange; // 顯示所有年份
    } else if (yearRange <= 10) {
        chart.options.scales.x.ticks.maxTicksLimit = Math.min(10, yearRange);
    } else if (yearRange <= 20) {
        chart.options.scales.x.ticks.maxTicksLimit = 10;
    } else {
        chart.options.scales.x.ticks.maxTicksLimit = 15;
    }

    // 更新图表标题（包含基期年）
    chart.options.plugins.title.text = `台灣電力價格CPI指數 (${startYear}-${endYear})`;

    // 更新資料集標籤（包含基期年）
    chart.data.datasets[0].label = `CPI指數 (基期年: ${config.baseYear})`;

    // 平滑更新图表
    chart.update('active');
}

// 为指定范围更新统计数据
function updateStatisticsForRange(config) {
    showLoading();

    fetchStatistics(config.baseYear, config.startYear, config.endYear)
    .then(statistics => {
        updateStatisticsDisplay(statistics);
        hideLoading();
    })
    .catch(error => {
        console.error('統計資料載入錯誤:', error);
        showError('載入統計資料時發生錯誤，請稍後再試。');
        hideLoading();
    });
}

// 更新圖表類型
function updateChartType() {
    if (!chart || !allData) return;

    const chartType = chartTypeSelect.value;
    const selectedRange = timeRangeSelect.value;
    const config = timeRanges[selectedRange];

    // 更新图表类型
    chart.config.type = chartType === 'area' ? 'line' : chartType;

    // 更新填充设置
    chart.data.datasets[0].fill = chartType === 'area';
    chart.data.datasets[0].backgroundColor = chartType === 'area' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.1)';

    // 更新图表
    chart.update('active');
}

// 獲取CPI資料
async function fetchCPIData(baseYear, startYear, endYear) {
    const response = await fetch(`/api/cpi?baseYear=${baseYear}&startYear=${startYear}&endYear=${endYear}`);
    if (!response.ok) {
        throw new Error('無法獲取CPI資料');
    }
    return await response.json();
}

// 獲取統計資料
async function fetchStatistics(baseYear, startYear, endYear) {
    const response = await fetch(`/api/cpi/latest?baseYear=${baseYear}&startYear=${startYear}&endYear=${endYear}`);
    if (!response.ok) {
        throw new Error('無法獲取統計資料');
    }
    return await response.json();
}

// 更新統計顯示（加入動畫效果）
function updateStatisticsDisplay(statistics) {
    // 獲取所有需要更新的元素
    const statElements = [
        document.getElementById('latestCPI'),
        document.getElementById('yearOverYearRate'),
        document.getElementById('avgCPI'),
        document.getElementById('totalChange'),
        document.getElementById('latestPrice'),
        document.getElementById('maxCPI'),
        document.getElementById('minCPI')
    ];

    const labelElements = [
        document.getElementById('baseYear'),
        document.getElementById('latestYear')
    ];

    // 添加更新中的視覺效果
    addUpdatingEffect(statElements);

    // 延遲執行動畫，營造載入效果
    setTimeout(() => {
        // 移除更新效果
        removeUpdatingEffect(statElements);

        // 執行數字動畫
        animateNumber(document.getElementById('latestCPI'), statistics.latestCPI);
        animateNumber(document.getElementById('yearOverYearRate'), statistics.yearOverYearRate);
        animateNumber(document.getElementById('avgCPI'), statistics.period.avgCPI);
        animateNumber(document.getElementById('totalChange'), statistics.period.totalChange);
        animateNumber(document.getElementById('latestPrice'), statistics.latestPrice);
        animateNumber(document.getElementById('maxCPI'), statistics.period.maxCPI);
        animateNumber(document.getElementById('minCPI'), statistics.period.minCPI);

        // 更新非數字標籤（無動畫）
        document.getElementById('baseYear').textContent = statistics.baseYear;
        document.getElementById('latestYear').textContent = statistics.latestYear;

        // 設定年增率和總變化率的顏色
        const yoyElement = document.getElementById('yearOverYearRate');
        const totalChangeElement = document.getElementById('totalChange');

        setTimeout(() => {
            yoyElement.className = 'stat-value ' + (statistics.yearOverYearRate > 0 ? 'positive' : 'negative');
            totalChangeElement.className = 'stat-value ' + (statistics.period.totalChange > 0 ? 'positive' : 'negative');
        }, 400);

    }, 200);
}

// 數字動畫函數
function animateNumber(element, newValue, duration = 800) {
    const startValue = parseFloat(element.textContent) || 0;
    const endValue = parseFloat(newValue);
    const startTime = performance.now();

    // 添加動畫類別
    element.classList.add('counting');

    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用 easeOutQuart 緩動函數
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (endValue - startValue) * easeProgress;

        // 根據數值類型格式化顯示
        if (element.id === 'yearOverYearRate' || element.id === 'totalChange') {
            element.textContent = `${currentValue >= 0 ? '+' : ''}${currentValue.toFixed(2)}%`;
        } else if (element.id === 'latestPrice') {
            element.textContent = currentValue.toFixed(4);
        } else if (element.id === 'avgCPI' || element.id === 'latestCPI') {
            element.textContent = currentValue.toFixed(2);
        } else {
            element.textContent = Math.round(currentValue);
        }

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            // 動畫完成，移除動畫類別並添加滾動效果
            element.classList.remove('counting');
            element.classList.add('rolling');
            setTimeout(() => {
                element.classList.remove('rolling');
            }, 600);
        }
    }

    requestAnimationFrame(updateNumber);
}

// 添加更新前的動畫效果
function addUpdatingEffect(elements) {
    elements.forEach(element => {
        if (element) {
            element.classList.add('updating');
        }
    });
}

// 移除更新動畫效果
function removeUpdatingEffect(elements) {
    elements.forEach(element => {
        if (element) {
            element.classList.remove('updating');
        }
    });
}

// 顯示載入狀態（改進版）
function showLoading() {
    const loadingElements = document.querySelectorAll('.stat-value, .info-content span');
    loadingElements.forEach(element => {
        element.classList.add('updating');
        element.innerHTML = '<div class="loading"></div>';
    });
}

// 隱藏載入狀態
function hideLoading() {
    const loadingElements = document.querySelectorAll('.stat-value, .info-content span');
    loadingElements.forEach(element => {
        element.classList.remove('updating');
    });
}

// 顯示錯誤訊息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: fadeIn 0.5s ease-in;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    // 3秒後自動移除
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// 顯示成功訊息
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: fadeIn 0.5s ease-in;
    `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    // 3秒後自動移除
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// 格式化數字
function formatNumber(num, decimals = 2) {
    return num.toLocaleString('zh-TW', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// 計算複合年增率 (CAGR)
function calculateCAGR(beginValue, endValue, years) {
    return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

// 導出功能（增強版）
function exportChart() {
    if (!chart) {
        showError('目前沒有圖表可以導出！');
        return;
    }

    // 顯示導出選項
    showExportOptions();
}

// 顯示匯出選項對話框
function showExportOptions() {
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
        <div class="export-dialog">
            <h3>📊 匯出圖表</h3>
            <div class="export-options">
                <div class="export-option">
                    <label>
                        <input type="radio" name="exportFormat" value="png" checked>
                        PNG 圖片 (.png)
                    </label>
                </div>
                <div class="export-option">
                    <label>
                        <input type="radio" name="exportFormat" value="jpg">
                        JPEG 圖片 (.jpg)
                    </label>
                </div>
            </div>
            <div class="export-quality">
                <label for="exportQuality">圖片品質：</label>
                <select id="exportQuality">
                    <option value="1">標準 (1x)</option>
                    <option value="2" selected>高品質 (2x)</option>
                    <option value="3">超高品質 (3x)</option>
                </select>
            </div>
            <div class="export-buttons">
                <button class="btn-primary" onclick="executeExport()">📥 下載</button>
                <button class="btn-secondary" onclick="closeExportModal()">❌ 取消</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// 執行匯出
function executeExport() {
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    const quality = parseInt(document.getElementById('exportQuality').value);

    const selectedRange = timeRangeSelect.value;
    const config = timeRanges[selectedRange];
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `台灣電力CPI_${config.startYear}-${config.endYear}_${timestamp}`;

    try {
        const url = chart.toBase64Image(format === 'jpg' ? 'image/jpeg' : 'image/png', quality);
        downloadFile(url, `${filename}.${format}`);

        closeExportModal();
        showSuccess('圖表匯出成功！');
    } catch (error) {
        console.error('匯出錯誤:', error);
        showError('匯出圖表時發生錯誤，請稍後再試。');
    }
}

// 下載文件
function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 關閉匯出對話框
function closeExportModal() {
    const modal = document.querySelector('.export-modal');
    if (modal) {
        modal.remove();
    }
}

// 全螢幕圖表功能（增強版）
function toggleFullscreen() {
    const chartContainer = document.querySelector('.chart-container');

    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
        // 進入全螢幕
        enterFullscreen(chartContainer);
    } else {
        // 退出全螢幕
        exitFullscreen();
    }
}

// 進入全螢幕模式
function enterFullscreen(element) {
    // 添加全螢幕樣式
    element.classList.add('fullscreen-chart');

    // 創建退出按鈕
    const exitButton = document.createElement('button');
    exitButton.className = 'fullscreen-exit';
    exitButton.innerHTML = '✕';
    exitButton.title = '退出全螢幕 (Esc)';
    exitButton.onclick = toggleFullscreen;
    element.appendChild(exitButton);

    // 嘗試使用瀏覽器全螢幕 API
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }

    // 調整圖表大小並保持當前配置
    setTimeout(() => {
        if (chart) {
            // 保存當前的圖表配置
            const currentConfig = {
                pointRadius: chart.data.datasets[0].pointRadius,
                pointHoverRadius: chart.data.datasets[0].pointHoverRadius,
                pointBorderWidth: chart.data.datasets[0].pointBorderWidth,
                xMin: chart.options.scales.x.min,
                xMax: chart.options.scales.x.max,
                maxTicksLimit: chart.options.scales.x.ticks.maxTicksLimit
            };

            // 調整圖表大小
            chart.resize();

            // 重新應用配置以確保資料點顯示
            chart.data.datasets[0].pointRadius = currentConfig.pointRadius;
            chart.data.datasets[0].pointHoverRadius = currentConfig.pointHoverRadius;
            chart.data.datasets[0].pointBorderWidth = currentConfig.pointBorderWidth;
            chart.options.scales.x.min = currentConfig.xMin;
            chart.options.scales.x.max = currentConfig.xMax;
            chart.options.scales.x.ticks.maxTicksLimit = currentConfig.maxTicksLimit;

            // 更新圖表
            chart.update('none'); // 使用 'none' 避免動畫延遲
        }
    }, 100);

    showSuccess('已進入全螢幕模式，按 Esc 鍵退出');
}

// 退出全螢幕模式
function exitFullscreen() {
    const chartContainer = document.querySelector('.chart-container');
    const exitButton = document.querySelector('.fullscreen-exit');

    // 移除全螢幕樣式
    chartContainer.classList.remove('fullscreen-chart');

    // 移除退出按鈕
    if (exitButton) {
        exitButton.remove();
    }

    // 退出瀏覽器全螢幕
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }

    // 調整圖表大小
    setTimeout(() => {
        if (chart) {
            chart.resize();
        }
    }, 100);
}

// 鍵盤快捷鍵支援
function handleKeyboardShortcuts(event) {
    // Ctrl + S: 匯出圖表
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        exportChart();
    }

    // Ctrl + F: 全螢幕
    if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        toggleFullscreen();
    }

    // Esc: 退出全螢幕
    if (event.key === 'Escape') {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
}

// 即時驗證年份輸入
function validateYearInput(event) {
    const input = event.target;
    const year = parseInt(input.value);

    if (!year || year < 1951 || year > 2024) {
        input.style.borderColor = '#e74c3c'; // 紅色邊框表示錯誤
        input.title = '請輸入1951-2024年範圍內的年份';
    } else {
        input.style.borderColor = 'var(--primary-yellow)'; // 恢復正常邊框
        input.title = '';

        // 檢查年份邏輯
        const startYear = parseInt(startYearInput.value);
        const endYear = parseInt(endYearInput.value);

        if (startYear && endYear && startYear > endYear) {
            if (input === startYearInput) {
                input.style.borderColor = '#e74c3c';
                input.title = '起始年份不能大於結束年份';
            } else {
                input.style.borderColor = '#e74c3c';
                input.title = '結束年份不能小於起始年份';
            }
        }
    }

    // 更新範圍顯示
    updateRangeDisplay();
}

// 更新範圍顯示
function updateRangeDisplay() {
    const startYear = parseInt(startYearInput.value);
    const endYear = parseInt(endYearInput.value);
    const rangeDisplay = document.getElementById('rangeDisplay');

    if (startYear && endYear && startYear <= endYear) {
        const yearCount = endYear - startYear + 1;
        rangeDisplay.textContent = `期間：${startYear} - ${endYear} (共 ${yearCount} 年)`;
    } else {
        rangeDisplay.textContent = '期間：請輸入有效的年份範圍';
    }
}
