"use client";

import { signIn } from "next-auth/react";

interface Props {
  isLinked: boolean;
}

export default function LineBindButton({ isLinked }: Props) {
  if (isLinked) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-md bg-surface border border-border cursor-default">
        <div className="w-8 h-8 rounded-xs bg-surface-muted border border-border flex items-center justify-center text-text-primary text-[10px] font-mono font-bold">
          [ OK ]
        </div>
        <div>
          <p className="text-xs font-bold text-text-primary">LINE 帳號已綁定</p>
          <p className="text-[11px] text-text-secondary">您已可接收系統即時通知</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("line")}
      className="w-full text-left flex items-center gap-3 p-3 rounded-md bg-surface border border-border hover:border-text-primary transition-colors group"
    >
      <div className="w-8 h-8 rounded-xs bg-surface-muted border border-border flex items-center justify-center text-text-primary font-mono font-bold text-[10px] group-hover:bg-primary group-hover:text-white transition-colors">
        LINE
      </div>
      <div>
        <p className="text-xs font-bold text-text-primary">綁定 LINE 帳號</p>
        <p className="text-[11px] text-text-secondary">獲取即時通知與點數查詢</p>
      </div>
    </button>
  );
}
