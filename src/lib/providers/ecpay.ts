import crypto from "crypto";

// 綠界測試環境參數
const MERCHANT_ID = "2000132";
const HASH_KEY = "5294y06JbISpM5x9";
const HASH_IV = "v77hoKGq4kWxNNIS";
const API_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

// 生產環境的 Host
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://for-shareproject1.vercel.app";

function getECPayDate() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 產生檢查碼 CheckMacValue
 */
function generateCheckMacValue(params: Record<string, string>): string {
  // 1. 將參數依照 Key 值字母由 A 到 Z 排序
  const sortedKeys = Object.keys(params).sort();
  
  // 2. 串接字串
  let str = `HashKey=${HASH_KEY}`;
  for (const key of sortedKeys) {
    str += `&${key}=${params[key]}`;
  }
  str += `&HashIV=${HASH_IV}`;

  // 3. URL Encode
  let encodedStr = encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .toLowerCase();

  // 4. SHA256 加密並轉大寫
  const checkMacValue = crypto.createHash("sha256").update(encodedStr).digest("hex").toUpperCase();
  return checkMacValue;
}

/**
 * 產生綠界金流跳轉 HTML
 */
export function generateECPayHtml(order: { merchantTradeNo: string, amount: number, itemName: string }): string {
  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: order.merchantTradeNo,
    MerchantTradeDate: getECPayDate(),
    PaymentType: "aio",
    TotalAmount: order.amount.toString(),
    TradeDesc: "ForShare 平台購買",
    ItemName: order.itemName,
    ReturnURL: `${SITE_URL}/api/payments/callback`, // 綠界背景回呼 (確認付款成功)
    ClientBackURL: `${SITE_URL}/upgrade/success`, // 刷卡完成後畫面導回
    ChoosePayment: "Credit", // 預設信用卡
    EncryptType: "1", // SHA256
  };

  const checkMacValue = generateCheckMacValue(params);
  params["CheckMacValue"] = checkMacValue;

  // 建立一個會自動送出的 HTML Form，這是綠界官方要求的串接方式
  let html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>轉跳至綠界金流...</title></head>
    <body style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
      <h2>正在為您轉跳至綠界金流，請稍候...</h2>
      <form id="ecpay-form" method="POST" action="${API_URL}" style="display:none;">`;
      
  for (const key in params) {
    html += `<input type="hidden" name="${key}" value="${params[key]}" />`;
  }
  
  html += `
      </form>
      <script>document.getElementById("ecpay-form").submit();</script>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * 驗證綠界回傳的 CheckMacValue
 */
export function verifyCheckMacValue(params: Record<string, string>): boolean {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) return false;
  
  const generated = generateCheckMacValue(rest);
  return generated === CheckMacValue;
}
