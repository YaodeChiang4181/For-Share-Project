import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const execPromise = util.promisify(exec);

export async function GET() {
  try {
    // 簡單權限檢查：只允許 ADMIN 或系統管理者呼叫 (這裡為簡化先只確認有登入)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 取得 Python 腳本的絕對路徑
    const scriptPath = path.join(process.cwd(), 'python_analytics', 'generate_trends.py');
    
    // 執行 Python 腳本 (環境中必須有 python3)
    const { stdout, stderr } = await execPromise(`python3 ${scriptPath}`);

    if (stderr && !stderr.includes('matplotlib')) {
      console.warn('Python Script Stderr:', stderr);
    }

    return NextResponse.json({ 
      message: '趨勢圖表產生成功', 
      output: stdout,
      imageUrl: '/analytics/trend_chart.png' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ 
      error: '圖表產生失敗', 
      details: error.message 
    }, { status: 500 });
  }
}
