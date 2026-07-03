import toast from "./toast";

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(
  text: string,
  successMessage = "复制成功！",
  errorMessage = "复制失败，请手动复制",
): Promise<boolean> {
  if (!text) {
    toast.error("没有内容可复制");
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    if (successMessage) toast.success(successMessage);
    return true;
  } catch {
    toast.error(errorMessage);
    return false;
  }
}

/**
 * 从剪贴板读取文本
 */
export async function readFromClipboard(
  errorMessage = "无法读取剪贴板内容",
): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    toast.error(errorMessage);
    return null;
  }
}

/**
 * 检测当前环境是否支持剪贴板 API
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && window.isSecureContext);
}

export default {
  copy: copyToClipboard,
  read: readFromClipboard,
  isSupported: isClipboardSupported,
};
