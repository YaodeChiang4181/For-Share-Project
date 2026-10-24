"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClick = () => setProfileMenuOpen(false);
    if (profileMenuOpen) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [profileMenuOpen]);

  const isLoggedIn = status === "authenticated" && session?.user;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all ${
        scrolled
          ? "bg-[var(--background)]/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent border-b border-border/60"
      }`}
      style={{ transitionDuration: "var(--transition-base)" }}
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" id="nav-logo">
            <div className="w-7 h-7 rounded-xs bg-primary text-text-inverse flex items-center justify-center font-mono text-xs font-bold">
              FS
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-tight text-text-primary">
                ForShare
              </span>
              <span className="hidden sm:inline text-[10px] font-mono text-text-tertiary">
                // ARCHIVE
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {(!isLoggedIn || (session.user as any)?.role !== "ADMIN") && [
              { label: "探索知識庫", href: "/explore" },
              { label: "排行榜", href: "/leaderboard" },
              { label: "積分商城", href: "/shop" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.href.slice(1)}`}
                className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA / User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                {(session.user as any)?.role === "ADMIN" ? (
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 rounded-sm text-xs font-semibold text-text-inverse bg-error hover:opacity-90 transition-opacity"
                  >
                    管理後台
                  </Link>
                ) : (
                  <Link
                    href="/upload"
                    className="px-3.5 py-1.5 rounded-sm text-xs font-semibold text-text-inverse bg-primary hover:bg-primary-light transition-colors"
                  >
                    上傳筆記
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileMenuOpen(!profileMenuOpen);
                    }}
                    id="nav-user-menu"
                    className="flex items-center gap-2.5 px-3 py-1 rounded-sm border border-border bg-surface hover:border-text-primary transition-colors text-xs"
                  >
                    <span className="w-5 h-5 rounded-xs bg-surface-muted text-text-primary flex items-center justify-center font-mono text-[10px] font-bold">
                      {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                    <span className="font-medium text-text-primary">{session.user.name}</span>
                    <span className="text-text-tertiary font-mono">
                      [ {(session.user as { points?: number }).points ?? 0} PTS ]
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${
                        profileMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-sm shadow-md py-1 overflow-hidden text-xs">
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                      >
                        個人中心
                      </Link>
                      {(session.user as any)?.role === "ADMIN" ? (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 font-medium text-error hover:bg-surface-muted transition-colors"
                        >
                          營運管理後台
                        </Link>
                      ) : (
                        <Link
                          href="/upload"
                          className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                        >
                          上傳筆記
                        </Link>
                      )}
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full text-left px-4 py-2 text-error hover:bg-surface-muted transition-colors"
                      >
                        登出帳號
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  id="nav-login"
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  登入
                </Link>
                <Link
                  href="/register"
                  id="nav-register"
                  className="px-4 py-1.5 rounded-sm text-xs font-semibold text-text-inverse bg-primary hover:bg-primary-light transition-colors"
                >
                  免費加入
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-toggle"
            className="md:hidden p-2 rounded-sm text-text-secondary hover:text-text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all ${
            mobileMenuOpen ? "max-h-[350px] pb-4 border-t border-border" : "max-h-0"
          }`}
          style={{ transitionDuration: "var(--transition-base)" }}
        >
          <div className="flex flex-col gap-1 pt-3 text-xs">
            {(!isLoggedIn || (session.user as any)?.role !== "ADMIN") && [
              { label: "探索知識庫", href: "/explore" },
              { label: "排行榜", href: "/leaderboard" },
              { label: "積分商城", href: "/shop" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  個人中心
                </Link>
                {(session.user as any)?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-sm font-semibold text-error hover:bg-surface-muted transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    營運管理後台
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-3 py-2 rounded-sm text-left text-error hover:bg-surface-muted transition-colors"
                >
                  登出帳號
                </button>
              </>
            ) : (
              <div className="flex gap-2.5 mt-3 pt-3 border-t border-border">
                <Link
                  href="/login"
                  className="flex-1 py-2 rounded-sm text-center border border-border text-text-primary hover:border-text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  登入
                </Link>
                <Link
                  href="/register"
                  className="flex-1 py-2 rounded-sm text-center text-text-inverse bg-primary hover:bg-primary-light transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  免費加入
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
