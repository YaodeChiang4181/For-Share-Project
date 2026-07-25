export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-surface border border-border rounded-2xl p-8 md:p-12 shadow-sm">
        <h1 className="text-3xl font-extrabold text-text-primary mb-8 text-center">常見問題</h1>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-bold text-text-primary mb-2">如何上傳筆記並獲得積分？</h3>
            <p className="text-text-secondary leading-relaxed">請先註冊並登入帳號，在首頁點擊「上傳」，選擇您的筆記或考古題，填寫標題與標籤後送出即可。系統審核通過後，您將獲得對應的上傳積分。</p>
          </div>
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-bold text-text-primary mb-2">積分可以做什麼？</h3>
            <p className="text-text-secondary leading-relaxed">累積的積分可以在「積分商城」兌換超商禮券、電子商品卡等實體獎勵，也可以用來打賞其他優質的筆記作者。</p>
          </div>
          <div className="border-b border-border pb-4">
            <h3 className="text-lg font-bold text-text-primary mb-2">上傳的檔案有大小限制嗎？</h3>
            <p className="text-text-secondary leading-relaxed">目前單一檔案上傳限制為 30MB。請確認您的檔案格式為 PDF 或常見的文件格式。</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-2">如何邀請朋友加入？</h3>
            <p className="text-text-secondary leading-relaxed">在您的個人後台可以找到專屬的邀請碼，您的朋友在註冊時填寫該邀請碼，雙方皆可獲得額外的積分獎勵。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
