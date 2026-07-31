import pdfParse from 'pdf-parse';

/**
 * 從 PDF 檔案的 Buffer 中萃取純文字內容
 * @param buffer PDF 檔案的二進位資料
 * @returns 萃取出的純文字
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return '';
  }
}
