export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-surface border border-border rounded-2xl p-8 md:p-12 shadow-sm">
        <h1 className="text-3xl font-extrabold text-text-primary mb-8 text-center">隱私政策</h1>
        <div className="prose prose-invert max-w-none text-text-secondary">
          <p className="mb-4">ForShare（以下簡稱「我們」）非常重視您的隱私權。本隱私政策旨在說明我們如何收集、使用與保護您的個人資料。</p>
          
          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">1. 資料收集</h2>
          <p className="mb-4">當您註冊時，我們會收集您的電子郵件、暱稱及就讀學校科系等基本資訊，以便為您提供客製化的服務體驗。</p>
          
          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">2. 資料使用</h2>
          <p className="mb-4">您的資料將僅用於帳號驗證、積分發放、聯絡通知及平台內部的數據分析，我們不會將您的個人資料出售或提供給第三方。</p>
          
          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">3. 資料安全與系統保護</h2>
          <p className="mb-2">我們採取業界標準的高規格資訊安全措施來保護您的帳戶與交易資料：</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li><strong>帳號與身分授權：</strong> 採用業界標準的身份驗證技術 (NextAuth) 與 Google 第三方登入，全程加密，我們絕不會直接獲取或儲存您的 Google 密碼。</li>
            <li><strong>資料傳輸與儲存：</strong> 全站強制啟用安全的 HTTPS 傳輸協定。資料庫儲存於具備企業級資安防護的雲端伺服器 (Neon PostgreSQL) 中，確保個資不外洩。</li>
            <li><strong>金流交易安全：</strong> 本站金流全面委託台灣最大第三方支付平台「綠界科技 (ECPay)」處理。您的信用卡卡號與交易資訊皆透過符合國際 PCI-DSS 資安認證的綠界系統加密傳輸，本站絕不觸碰、也不會儲存您的任何信用卡明細。</li>
            <li><strong>附檔防護機制：</strong> 使用者上傳的附件皆存放於安全的企業級雲端儲存空間 (AWS S3 架構)，且採用嚴格的「動態簽章網址 (Presigned URL)」防護技術，有效阻絕未經授權的惡意下載與檔案外流。</li>
          </ul>

          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">4. 您的權利</h2>
          <p className="mb-4">您可以隨時登入帳號修改個人資料，或聯繫我們要求刪除您的帳戶及相關資料。</p>
        </div>
      </div>
    </div>
  );
}
