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
          
          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">3. 資料安全</h2>
          <p className="mb-4">我們採取標準的資訊安全措施來保護您的帳戶資料，包括密碼加密及安全的資料傳輸協定 (HTTPS)。</p>

          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">4. 您的權利</h2>
          <p className="mb-4">您可以隨時登入帳號修改個人資料，或聯繫我們要求刪除您的帳戶及相關資料。</p>
        </div>
      </div>
    </div>
  );
}
