export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-surface border border-border rounded-2xl p-8 md:p-12 shadow-sm text-center">
        <h1 className="text-3xl font-extrabold text-text-primary mb-6">關於我們</h1>
        
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">FS</span>
        </div>
        
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          打破直屬藩籬，讓知識不再被埋沒
        </h2>
        
        <p className="text-text-secondary leading-relaxed mb-8 text-left">
          我們是一群來自不同科系的大學生，深感在求學過程中，許多學長姐的優質筆記與考古題往往只能在直屬之間流傳，甚至隨著畢業而被遺忘在硬碟的深處。
          <br /><br />
          為了打破這種資訊不對稱，我們創立了 <strong>ForShare</strong>。這是一個專為大學生打造的知識共享平台，我們相信每一份用心整理的筆記都充滿價值。在這裡，您的分享不僅能幫助到其他同學，還能透過積分系統獲得實質的回報。
        </p>

        <div className="border-t border-border pt-8 mt-8">
          <h3 className="text-xl font-bold text-text-primary mb-4">聯絡團隊</h3>
          <p className="text-text-secondary mb-6">
            如果您有任何問題、合作提案，或是發現平台上的 Bug，歡迎隨時與我們聯繫！
          </p>
          <a
            href="mailto:0966494679a@gmail.com"
            className="inline-flex px-8 py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            Email 聯繫我們
          </a>
        </div>
      </div>
    </div>
  );
}
