import os
import psycopg2
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from dotenv import load_dotenv

# Load environment variables (from .env)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv('DATABASE_URL')

def generate_trends():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found.")
        return

    try:
        # Connect to the PostgreSQL database
        conn = psycopg2.connect(DATABASE_URL)
        
        # Query the PageViewLog table
        query = """
        SELECT "createdAt", "duration" 
        FROM "PageViewLog" 
        ORDER BY "createdAt" ASC
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()

        if df.empty:
            print("No data available in PageViewLog to generate trends.")
            return

        # Ensure datetime format
        df['createdAt'] = pd.to_datetime(df['createdAt'])
        # Extract just the date part for daily aggregation
        df['date'] = df['createdAt'].dt.date
        
        # Group by date to get daily total views and total duration
        daily_stats = df.groupby('date').agg(
            views=('duration', 'count'),
            total_duration=('duration', 'sum')
        ).reset_index()
        
        # Set date as index for rolling average calculations
        daily_stats['date'] = pd.to_datetime(daily_stats['date'])
        daily_stats.set_index('date', inplace=True)
        
        # Reindex to fill missing dates with 0
        all_dates = pd.date_range(start=daily_stats.index.min(), end=daily_stats.index.max())
        daily_stats = daily_stats.reindex(all_dates, fill_value=0)
        
        # Calculate 5-day and 10-day moving averages (MA)
        daily_stats['MA_5'] = daily_stats['views'].rolling(window=5, min_periods=1).mean()
        daily_stats['MA_10'] = daily_stats['views'].rolling(window=10, min_periods=1).mean()

        # Plotting
        plt.figure(figsize=(10, 5))
        plt.plot(daily_stats.index, daily_stats['views'], marker='o', alpha=0.5, label='Daily Views (活躍度)')
        plt.plot(daily_stats.index, daily_stats['MA_5'], color='orange', linewidth=2, label='5-Day MA')
        plt.plot(daily_stats.index, daily_stats['MA_10'], color='red', linewidth=2, label='10-Day MA')
        
        plt.title('Platform Resource Activity Trends (資源活躍度移動平均趨勢線)')
        plt.xlabel('Date')
        plt.ylabel('Daily Page Views')
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.7)
        
        # Formatting X-axis dates
        plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        plt.gcf().autofmt_xdate()
        
        # Ensure the output directory exists
        output_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'analytics')
        os.makedirs(output_dir, exist_ok=True)
        
        # Save the plot
        output_path = os.path.join(output_dir, 'trend_chart.png')
        plt.savefig(output_path, bbox_inches='tight')
        plt.close()
        print(f"Trend chart successfully generated at {output_path}")

    except Exception as e:
        print(f"Error generating trends: {e}")

if __name__ == "__main__":
    generate_trends()
