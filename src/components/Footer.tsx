import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="mx-auto max-w-6xl px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4" id="footer-logo">
              <div className="w-6 h-6 rounded-xs bg-primary text-white flex items-center justify-center font-mono text-[10px] font-bold">
                FS
              </div>
              <span className="text-sm font-bold tracking-tight text-text-primary">
                ForShare
              </span>
            </Link>
            <p className="text-xs text-text-secondary leading-relaxed">
              打破直屬制度壁壘，讓校園筆記與知識不再沉睡。<br />
              每一份整理與分享，皆具實質價值。
            </p>
          </div>

          {/* Links */}
          {[
            {
              title: "資料庫索引",
              links: [
                { label: "探索筆記庫", href: "/explore" },
                { label: "同儕排行榜", href: "/leaderboard" },
                { label: "積分商城", href: "/shop" },
              ],
            },
            {
              title: "使用者支援",
              links: [
                { label: "常見問題", href: "/faq" },
                { label: "使用條款", href: "/terms" },
                { label: "隱私政策", href: "/privacy" },
              ],
            },
            {
              title: "專案團隊",
              links: [
                { label: "團隊介紹", href: "/about" },
                { label: "問題反饋與聯絡", href: "mailto:0966494679a@gmail.com" },
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-mono tracking-wider uppercase text-text-primary mb-3">
                [ {section.title} ]
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-tertiary">
          <p className="font-mono">
            © {new Date().getFullYear()} ForShare. All rights reserved.
          </p>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>CAMPUS KNOWLEDGE INDEX</span>
            <span>·</span>
            <span>NOT FOR RESALE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
