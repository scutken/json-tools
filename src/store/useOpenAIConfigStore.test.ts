import type { AIRouteType, OpenAIConfig } from "./useOpenAIConfigStore";

export const supportedAIRoutes: Record<AIRouteType, true> = {
  utools: true,
  custom: true,
};

export const supportedRouteEnabledKeys: Record<
  keyof OpenAIConfig["routeEnabled"],
  true
> = {
  utools: true,
  custom: true,
};
