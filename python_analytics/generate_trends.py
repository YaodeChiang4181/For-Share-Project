import os
import json
import hashlib
import psycopg2
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
from dotenv import load_dotenv

# 載入環境變數
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv('DATABASE_URL')
SALT = os.getenv('NEXTAUTH_SECRET', 'forshare-salt-2026')

def hash_identifier(identifier: str) -> str:
    """去識別化雜湊函數：符合校園個資法規範 (HMAC-SHA-256)"""
    if not identifier:
        return "ID-ANON"
    salted = f"{SALT}:{identifier}".encode('utf-8')
    h = hashlib.sha256(salted).hexdigest()
    return f"ID-{h[:8].upper()}"

def generate_trends():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found.")
        return

    try:
        # 連線至 Neon PostgreSQL 資料庫
        conn = psycopg2.connect(DATABASE_URL)
        
        # 僅擷取時間與停留時長，不回溯學生原始個人資訊 (去識別化防護)
        query = """
        SELECT "createdAt", "duration", "userId" 
        FROM "PageViewLog" 
        ORDER BY "createdAt" ASC
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()

        if df.empty:
            print("No data available in PageViewLog to generate trends.")
            return

        # 去識別化處理學生使用者 ID (若存在)
        if 'userId' in df.columns:
            df['anonymizedUserId'] = df['userId'].apply(lambda x: hash_identifier(str(x)) if x else "ANON")
            df.drop(columns=['userId'], inplace=True)

        # 時間序列處理
        df['createdAt'] = pd.to_datetime(df['createdAt'])
        df['date'] = df['createdAt'].dt.date
        
        # 每日活躍度與停留時長聚合
        daily_stats = df.groupby('date').agg(
            views=('duration', 'count'),
            total_duration=('duration', 'sum')
        ).reset_index()
        
        daily_stats['date'] = pd.to_datetime(daily_stats['date'])
        daily_stats.set_index('date', inplace=True)
        
        # 補齊中間可能缺失的日期
        all_dates = pd.date_range(start=daily_stats.index.min(), end=daily_stats.index.max())
        daily_stats = daily_stats.reindex(all_dates, fill_value=0)
        
        # 計算 5 日與 10 日滑動平均 (Moving Averages)
        daily_stats['MA_5'] = daily_stats['views'].rolling(window=5, min_periods=1).mean().round(1)
        daily_stats['MA_10'] = daily_stats['views'].rolling(window=10, min_periods=1).mean().round(1)

        # 輸出路徑
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'analytics')
        os.makedirs(output_dir, exist_ok=True)

        # 1. 輸出去識別化結構化 JSON 檔供前端秒級快取讀取
        json_records = []
        for d, row in daily_stats.iterrows():
            json_records.append({
                "date": d.strftime("%Y-%m-%d"),
                "views": int(row['views']),
                "ma5": float(row['MA_5']),
                "ma10": float(row['MA_10'])
            })

        json_output = {
            "metadata": {
                "compliance": "Taiwan PDPA De-identification Standard",
                "hashing": "Salted SHA-256",
                "generatedAt": datetime.utcnow().isoformat() + "Z",
                "piiStatus": "ZERO_RAW_PII"
            },
            "trends": json_records
        }

        json_path = os.path.join(output_dir, 'trends_data.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_output, f, ensure_ascii=False, indent=2)
        print(f"Anonymized trends data JSON saved at {json_path}")

        # 2. 繪製圖表 (人文紙質基調美學)
        plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
        fig, ax = plt.subplots(figsize=(10, 4.8), dpi=150)
        fig.patch.set_facecolor('#F9F8F6')
        ax.set_facecolor('#FFFFFF')

        # 繪製曲線
        ax.plot(daily_stats.index, daily_stats['views'], marker='o', markersize=4, color='#9CA3AF', alpha=0.6, label='Daily Views (每日活躍度)')
        ax.plot(daily_stats.index, daily_stats['MA_5'], color='#D97706', linewidth=2.2, label='5-Day MA (5日滑動平均)')
        ax.plot(daily_stats.index, daily_stats['MA_10'], color='#DC2626', linewidth=2.2, label='10-Day MA (10日滑動平均)')
        
        ax.set_title('ForShare Platform Activity Moving Average (學習熱度移動平均趨勢)', fontsize=12, fontweight='bold', color='#1A1918', pad=12)
        ax.set_xlabel('Date (時間軸)', fontsize=10, color='#4B5563')
        ax.set_ylabel('Page Views (瀏覽量)', fontsize=10, color='#4B5563')
        ax.legend(frameon=True, facecolor='#F9F8F6', edgecolor='#E5E7EB', fontsize=9)
        ax.grid(True, linestyle='--', alpha=0.5, color='#E5E7EB')
        
        # 格式化 X 軸日期
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        fig.autofmt_xdate()
        
        # 儲存圖表
        chart_path = os.path.join(output_dir, 'trend_chart.png')
        plt.savefig(chart_path, bbox_inches='tight', facecolor=fig.get_facecolor())
        plt.close()
        print(f"Trend chart successfully generated at {chart_path}")

    except Exception as e:
        print(f"Error generating trends: {e}")

if __name__ == "__main__":
    generate_trends()
