export interface IssueVoucherResponse {
  success: boolean;
  barcode?: string;
  voucherUrl?: string;
  transactionId?: string;
  error?: string;
}

/**
 * 模擬呼叫第三方電子票券商 API (如 Edenred, Presco)
 * 未來若與真實廠商簽約，只需替換此處的 fetch 邏輯即可，無需改動核心兌換系統。
 * 
 * @param itemId 商城的商品 ID
 * @param idempotencyKey 交易唯一金鑰，防止重複發送
 */
export async function issueRealVoucher(itemId: string, idempotencyKey: string): Promise<IssueVoucherResponse> {
  // 模擬網路延遲 (1~2秒) 以測試非同步處理與鎖定狀態
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  console.log(`[Mock Voucher API] 正在發行票券... 項目: ${itemId}, IdempotencyKey: ${idempotencyKey}`);

  // 模擬商品與第三方 Product ID 的映射
  const mockVouchers: Record<string, { prefix: string, url: string }> = {
    "item-1": { prefix: "711", url: "https://mock-voucher.com/711/view?token=" },
    "item-2": { prefix: "FM", url: "https://mock-voucher.com/familymart/view?token=" },
    "item-3": { prefix: "SB", url: "https://mock-voucher.com/starbucks/view?token=" },
    "item-4": { prefix: "LINE", url: "https://mock-voucher.com/linepoints/view?token=" }
  };

  const voucherData = mockVouchers[itemId];
  if (!voucherData) {
    return {
      success: false,
      error: "未知的商品 ID，第三方 API 拒絕發行"
    };
  }

  // 模擬生成一張真實票券
  const transactionId = "TXN-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  const token = Math.random().toString(36).substr(2, 15);
  
  return {
    success: true,
    barcode: `${voucherData.prefix}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    voucherUrl: voucherData.url + token,
    transactionId
  };
}
