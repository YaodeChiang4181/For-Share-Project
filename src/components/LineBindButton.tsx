"use client";

import { signIn } from "next-auth/react";

interface Props {
  isLinked: boolean;
}

export default function LineBindButton({ isLinked }: Props) {
  if (isLinked) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-success/20 cursor-default">
        <div className="w-10 h-10 rounded-lg bg-success flex items-center justify-center text-white text-xl">
          ✓
        </div>
        <div>
          <p className="text-sm font-medium text-success">LINE 帳號已綁定</p>
          <p className="text-xs text-text-tertiary">您已可接收系統即時通知</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("line")}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-background transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-[#00B900]/10 flex items-center justify-center text-[#00B900] group-hover:bg-[#00B900] group-hover:text-white transition-colors text-xl font-bold">
        L
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">綁定 LINE 帳號</p>
        <p className="text-xs text-text-tertiary">獲取即時通知與點數查詢</p>
      </div>
    </button>
  );
}
