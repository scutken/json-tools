import type { AIRouteType } from "@/store/useOpenAIConfigStore";

/**
 * AI 线路品牌标识。
 */

export interface RouteBrand {
  /** 主色（用于图标块、渐变起色、开关选中色） */
  color: string;
  /** 渐变次色（用于卡片底纹过渡） */
  to: string;
}

export const ROUTE_BRAND: Record<AIRouteType, RouteBrand> = {
  utools: { color: "#FFAB00", to: "#FF9100" },
  custom: { color: "#E91E63", to: "#D81B60" },
};

export const ROUTE_LABEL: Record<AIRouteType, string> = {
  utools: "uTools AI",
  custom: "私有线路",
};

export const ROUTE_ICON: Record<AIRouteType, string> = {
  utools: "solar:atom-bold-duotone",
  custom: "solar:key-bold-duotone",
};
