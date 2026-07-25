export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-surface border border-border rounded-2xl p-8 md:p-12 shadow-sm">
        <h1 className="text-3xl font-extrabold text-text-primary mb-8 text-center">使用條款</h1>
        <div className="prose prose-invert max-w-none text-text-secondary">
          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">1. 服務說明</h2>
          <p className="mb-4">ForShare 是一個專為大學生設計的知識共享平台，旨在促進學習資源的交流與共享。使用者可以上傳筆記、考古題，並透過社群互動獲得積分。</p>
          
          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">2. 使用者義務</h2>
          <p className="mb-4">您同意不在本平台發布任何侵犯他人智慧財產權、違反法律、或包含惡意軟體的內容。平台保留審核及刪除違規內容的權利。</p>
          
          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">3. 積分與獎勵機制</h2>
          <p className="mb-4">積分為平台內的虛擬獎勵，不具備法定貨幣價值。平台保留調整積分獲得比例及商城兌換門檻的權利。</p>

          <h2 className="text-xl font-bold text-text-primary mt-6 mb-3">4. 免責聲明</h2>
          <p className="mb-4">平台無法保證所有上傳資料的正確性與完整性，使用者應自行判斷資料的參考價值。</p>
        </div>
      </div>
    </div>
  );
}
