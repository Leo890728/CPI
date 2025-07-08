const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./electricity_data.db');
        this.initializeDatabase();
    }

    initializeDatabase() {
        // 建立電力資料表
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS electricity_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    year INTEGER UNIQUE,
                    light_sales REAL,
                    power_sales REAL,
                    total_sales REAL,
                    light_users INTEGER,
                    power_users INTEGER,
                    total_users INTEGER,
                    light_residential_sales REAL,
                    light_commercial_sales REAL,
                    light_residential_users INTEGER,
                    light_commercial_users INTEGER,
                    light_avg_price REAL,
                    power_avg_price REAL,
                    total_avg_price REAL
                )
            `);

            // 檢查是否需要匯入資料
            this.db.get("SELECT COUNT(*) as count FROM electricity_data", (err, row) => {
                if (err) {
                    console.error('資料庫查詢錯誤:', err);
                    return;
                }

                if (row.count === 0) {
                    this.importData();
                }
            });
        });
    }

    importData() {
        const dataPath = path.join(__dirname, '台灣電力公司公用售電業售電統計資料.json');

        try {
            const rawData = fs.readFileSync(dataPath, 'utf8');
            const data = JSON.parse(rawData);

            console.log('開始匯入電力資料...');

            const stmt = this.db.prepare(`
                INSERT INTO electricity_data (
                    year, light_sales, power_sales, total_sales,
                    light_users, power_users, total_users,
                    light_residential_sales, light_commercial_sales,
                    light_residential_users, light_commercial_users,
                    light_avg_price, power_avg_price, total_avg_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            data.forEach(record => {
                stmt.run([
                    parseInt(record.年度),
                    parseFloat(record['電燈售電量(度)']),
                    parseFloat(record['電力售電量(度)']),
                    parseFloat(record['售電量合計(度)']),
                    parseInt(record['電燈用戶數(戶)']),
                    parseInt(record['電力用戶數(戶)']),
                    parseInt(record['用戶數合計(戶)']),
                    parseFloat(record['電燈(非營業用)售電量(度)']),
                    parseFloat(record['電燈(營業用)售電量(度)']),
                    parseInt(record['電燈(非營業用)用戶數(戶)']),
                    parseInt(record['電燈(營業用)用戶數(戶)']),
                    parseFloat(record['電燈平均單價(元)']),
                    parseFloat(record['電力平均單價(元)']),
                    parseFloat(record['平均單價合計(元)'])
                ]);
            });

            stmt.finalize((err) => {
                if (err) {
                    console.error('資料匯入錯誤:', err);
                } else {
                    console.log(`成功匯入 ${data.length} 筆電力資料`);
                }
            });

        } catch (error) {
            console.error('讀取資料檔案錯誤:', error);
        }
    }

    // 取得 CPI 資料
    getCPIData(baseYear, startYear, endYear, callback) {
        const query = `
            SELECT year, total_avg_price
            FROM electricity_data
            WHERE year >= ? AND year <= ?
            ORDER BY year
        `;

        this.db.all(query, [startYear, endYear], (err, rows) => {
            if (err) {
                callback(err, null);
                return;
            }

            // 找到基期年的價格
            const baseRecord = rows.find(row => row.year === baseYear);
            if (!baseRecord) {
                callback(new Error('找不到基期年資料'), null);
                return;
            }

            const basePrice = baseRecord.total_avg_price;

            // 計算 CPI
            const cpiData = rows.map(row => ({
                year: row.year,
                price: row.total_avg_price,
                cpi: Math.round((row.total_avg_price / basePrice) * 100 * 100) / 100
            }));

            callback(null, cpiData);
        });
    }

    // 取得統計摘要
    getStatistics(baseYear, startYear, endYear, callback) {
        this.getCPIData(baseYear, startYear, endYear, (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }

            if (data.length === 0) {
                callback(new Error('沒有找到資料'), null);
                return;
            }

            const latestData = data[data.length - 1];
            const previousData = data[data.length - 2];

            // 計算平均年增率（所選範圍內的平均值）
            let avgYearOverYearRate = 0;
            if (data.length > 1) {
                let totalYoyRate = 0;
                let validYoyCount = 0;

                for (let i = 1; i < data.length; i++) {
                    const currentCpi = data[i].cpi;
                    const previousCpi = data[i - 1].cpi;
                    const yoyRate = ((currentCpi - previousCpi) / previousCpi) * 100;
                    totalYoyRate += yoyRate;
                    validYoyCount++;
                }

                if (validYoyCount > 0) {
                    avgYearOverYearRate = totalYoyRate / validYoyCount;
                }
            }

            // 計算期間統計
            const cpiValues = data.map(d => d.cpi);
            const avgCPI = cpiValues.reduce((sum, val) => sum + val, 0) / cpiValues.length;
            const maxCPI = Math.max(...cpiValues);
            const minCPI = Math.min(...cpiValues);
            const totalChange = ((latestData.cpi - data[0].cpi) / data[0].cpi) * 100;

            const statistics = {
                latestCPI: latestData.cpi,
                yearOverYearRate: Math.round(avgYearOverYearRate * 100) / 100, // 改為平均年增率
                baseYear: baseYear,
                period: {
                    startYear: startYear,
                    endYear: endYear,
                    avgCPI: Math.round(avgCPI * 100) / 100,
                    maxCPI: maxCPI,
                    minCPI: minCPI,
                    totalChange: Math.round(totalChange * 100) / 100
                },
                latestPrice: latestData.price,
                latestYear: latestData.year
            };

            callback(null, statistics);
        });
    }

    // 取得售電資料
    getSalesData(callback) {
        const query = `
            SELECT year, total_sales, total_users
            FROM electricity_data
            ORDER BY year
        `;

        this.db.all(query, [], callback);
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
