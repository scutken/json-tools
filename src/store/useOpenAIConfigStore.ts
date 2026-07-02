import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { OpenAI } from "openai";

import { storage } from "@/lib/indexedDBStore";

// 检查 utools 是否可用
const isUtoolsAvailable = typeof window !== "undefined" && "utools" in window;

// AI 路由类型
export type AIRouteType = "utools" | "custom";

// Utools线路配置
interface UtoolsRouteConfig {
  model: string;
  temperature: number;
}

// 自定义线路配置
interface CustomRouteConfig {
  apiKey: string;
  model: string;
  proxyUrl: string;
  temperature: number;
}

interface LegacyRemovedRouteConfig {
  apiKey?: string;
  model?: string;
  proxyUrl?: string;
  temperature?: number;
}

interface LegacyOpenAIConfig {
  routeType?: string;
  utoolsRoute?: UtoolsRouteConfig;
  customRoute?: CustomRouteConfig;
  utoolsModels?: Array<{ value: string; label: string }>;
  customModels?: Array<{ value: string; label: string }>;
  routeEnabled?: Partial<OpenAIConfig["routeEnabled"]>;
  [legacyKey: string]: unknown;
}

// OpenAI 客户端配置接口
export interface OpenAIConfig {
  routeType: AIRouteType;
  utoolsRoute: UtoolsRouteConfig;
  customRoute: CustomRouteConfig;
  utoolsModels: Array<{ value: string; label: string }>;
  customModels: Array<{ value: string; label: string }>;
  // 线路启用状态
  routeEnabled: {
    utools: boolean;
    custom: boolean;
  };
}

const defaultOpenAIConfig: OpenAIConfig = {
  routeType: "utools",
  utoolsRoute: {
    model: "deepseek-v3",
    temperature: 0.7,
  },
  customRoute: {
    apiKey: "",
    model: "deepseek-v4-pro",
    proxyUrl: "",
    temperature: 0.7,
  },
  utoolsModels: [],
  customModels: [],
  routeEnabled: {
    utools: true,
    custom: false,
  },
};

const BD_OPENAI_CONFIG_KEY = "openai-config";

function mergeModels(
  models: Array<{ value: string; label: string }> = [],
  model?: string,
) {
  const merged = [...models];

  if (model && !merged.some((item) => item.value === model)) {
    merged.unshift({ value: model, label: model });
  }

  return merged;
}

interface OpenAIConfigStore extends OpenAIConfig {
  updateConfig: (config: Partial<OpenAIConfig>) => void;
  updateUtoolsRouteConfig: (config: Partial<UtoolsRouteConfig>) => void;
  updateCustomRouteConfig: (config: Partial<CustomRouteConfig>) => void;
  updateRouteEnabled: (routeType: AIRouteType, enabled: boolean) => void;
  resetConfig: () => void;
  syncConfig: () => Promise<void>;
  fetchUtoolsModels: () => Promise<void>;
  fetchCustomModels: () => Promise<void>;
  addCustomModel: (model: string, label?: string) => void;
  removeCustomModel: (model: string) => void;

  // 获取当前线路的配置
  getCurrentRouteConfig: () => UtoolsRouteConfig | CustomRouteConfig;

  // 获取当前线路的有效 API Key
  getCurrentApiKey: () => string;

  // 获取当前线路的有效 API 地址
  getCurrentProxyUrl: () => string;

  // 获取当前线路的有效模型
  getCurrentModel: () => string;
}

export const useOpenAIConfigStore = create<OpenAIConfigStore>()(
  subscribeWithSelector(
    devtools(
      (set, get) => {
        // 辅助函数：获取可序列化状态
        const getSerializableState = () => {
          const state = get();

          return {
            routeType: state.routeType,
            utoolsRoute: state.utoolsRoute,
            customRoute: state.customRoute,
            utoolsModels: state.utoolsModels,
            customModels: state.customModels,
            routeEnabled: state.routeEnabled,
          };
        };

        return {
          ...defaultOpenAIConfig,

          updateConfig: (config) => {
            set((state) => ({ ...state, ...config }));
            // 保存到存储，只保存可序列化的数据
            storage
              .setItem(BD_OPENAI_CONFIG_KEY, getSerializableState())
              .catch((err) => console.error("Failed to save config:", err));
          },

          updateUtoolsRouteConfig: (config) => {
            set((state) => ({
              ...state,
              utoolsRoute: { ...state.utoolsRoute, ...config },
            }));
            // 保存到存储，只保存可序列化的数据
            storage
              .setItem(BD_OPENAI_CONFIG_KEY, getSerializableState())
              .catch((err) =>
                console.error("Failed to save utools route config:", err),
              );
          },

          updateCustomRouteConfig: (config) => {
            set((state) => ({
              ...state,
              customRoute: { ...state.customRoute, ...config },
            }));
            // 保存到存储，只保存可序列化的数据
            storage
              .setItem(BD_OPENAI_CONFIG_KEY, getSerializableState())
              .catch((err) =>
                console.error("Failed to save custom route config:", err),
              );
          },

          updateRouteEnabled: (routeType: AIRouteType, enabled: boolean) => {
            set((state) => ({
              ...state,
              routeEnabled: {
                ...state.routeEnabled,
                [routeType]: enabled,
              },
            }));
            // 保存到存储，只保存可序列化的数据
            storage
              .setItem(BD_OPENAI_CONFIG_KEY, getSerializableState())
              .catch((err) =>
                console.error("Failed to save route enabled state:", err),
              );
          },

          resetConfig: () => set(defaultOpenAIConfig),

          syncConfig: async () => {
            try {
              const savedConfig = await storage.getItem(BD_OPENAI_CONFIG_KEY);

              if (savedConfig) {
                const serializableConfig = savedConfig as LegacyOpenAIConfig;
                const removedRouteKey = "ssoo" + "ai";
                const legacyRoute = serializableConfig[
                  `${removedRouteKey}Route`
                ] as LegacyRemovedRouteConfig | undefined;
                const legacyModels = serializableConfig[
                  `${removedRouteKey}Models`
                ] as Array<{ value: string; label: string }> | undefined;
                const shouldMigrateRemovedRoute =
                  serializableConfig.routeType === removedRouteKey && !!legacyRoute;
                const savedRouteEnabled = serializableConfig.routeEnabled;

                // 只恢复支持的字段，旧私有凭据迁移为当前私有线路
                set((state) => {
                  const migratedCustomRoute = shouldMigrateRemovedRoute
                    ? {
                        ...state.customRoute,
                        ...serializableConfig.customRoute,
                        apiKey:
                          legacyRoute.apiKey ||
                          serializableConfig.customRoute?.apiKey ||
                          state.customRoute.apiKey,
                        model:
                          legacyRoute.model ||
                          serializableConfig.customRoute?.model ||
                          state.customRoute.model,
                        proxyUrl:
                          legacyRoute.proxyUrl ||
                          serializableConfig.customRoute?.proxyUrl ||
                          state.customRoute.proxyUrl,
                        temperature:
                          legacyRoute.temperature ??
                          serializableConfig.customRoute?.temperature ??
                          state.customRoute.temperature,
                      }
                    : serializableConfig.customRoute || state.customRoute;
                  const savedRouteType =
                    serializableConfig.routeType === "custom" ||
                    shouldMigrateRemovedRoute
                      ? "custom"
                      : "utools";

                  return {
                    ...state,
                    routeType: savedRouteType,
                    utoolsRoute:
                      serializableConfig.utoolsRoute || state.utoolsRoute,
                    customRoute: migratedCustomRoute,
                    utoolsModels:
                      serializableConfig.utoolsModels || state.utoolsModels,
                    customModels: shouldMigrateRemovedRoute
                      ? mergeModels(
                          [
                            ...(serializableConfig.customModels || []),
                            ...(legacyModels || []),
                          ],
                          migratedCustomRoute.model,
                        )
                      : mergeModels(
                          serializableConfig.customModels || state.customModels,
                          migratedCustomRoute.model,
                        ),
                    routeEnabled: {
                      utools:
                        typeof savedRouteEnabled?.utools === "boolean"
                          ? savedRouteEnabled.utools
                          : state.routeEnabled.utools,
                      custom: shouldMigrateRemovedRoute
                        ? true
                        : typeof savedRouteEnabled?.custom === "boolean"
                          ? savedRouteEnabled.custom
                          : state.routeEnabled.custom,
                    },
                  };
                });
              }
            } catch (error) {
              console.error("Failed to sync OpenAI config:", error);
            }
          },

          fetchUtoolsModels: async () => {
            try {
              // 检查 uTools 是否可用
              if (!isUtoolsAvailable) {
                console.error("uTools is not available");

                return;
              }

              // 使用 utools.allAiModels API 获取模型列表
              const models = await (window as any).utools.allAiModels();

              if (Array.isArray(models) && models.length > 0) {
                // 将 utools 模型数据转换为应用需要的格式
                const formattedModels = models.map((model) => ({
                  value: model.id,
                  label: `${model.label}${model.cost > 0 ? ` (${model.cost}积分)` : ""}`,
                }));

                set((state) => ({ ...state, utoolsModels: formattedModels }));

                // 如果当前没有选择模型或选择的模型不在列表中，自动选择第一个模型
                const currentModel = get().utoolsRoute.model;

                if (
                  !currentModel ||
                  !formattedModels.find((m) => m.value === currentModel)
                ) {
                  const defaultModel = formattedModels[0]?.value || "deepseek-v3";

                  get().updateUtoolsRouteConfig({ model: defaultModel });
                }
              }
            } catch (error) {
              console.error("Failed to fetch Utools models:", error);
            }
          },

          fetchCustomModels: async () => {
            try {
              const state = get();

              // 只有在有API密钥和代理URL时才尝试获取模型列表
              if (!state.customRoute.apiKey || !state.customRoute.proxyUrl) {
                return;
              }

              // 创建临时OpenAI实例用于获取模型
              const openai = new OpenAI({
                apiKey: state.customRoute.apiKey,
                baseURL: state.customRoute.proxyUrl,
                dangerouslyAllowBrowser: true,
              });

              // 获取模型列表
              const response = await openai.models.list();

              if (response.data && Array.isArray(response.data)) {
                // 提取模型信息
                const apiModels = response.data.map((model) => ({
                  value: model.id,
                  label: model.id,
                }));

                // 获取当前存储的自定义模型
                const currentCustomModels = state.customModels.filter(
                  (model) =>
                    !apiModels.some(
                      (apiModel) => apiModel.value === model.value,
                    ),
                );

                // 合并自定义模型和API模型
                const mergedModels = [...currentCustomModels, ...apiModels];

                set({ customModels: mergedModels });
              }
            } catch (error) {
              console.error("Failed to fetch custom models:", error);
              // 失败时不清空现有模型，保留手动添加的模型
            }
          },

          addCustomModel: (model: string, label?: string) => {
            // 如果model为空，不添加
            if (!model.trim()) return;

            set((state) => {
              // 检查模型是否已存在
              const modelExists = state.customModels.some(
                (m) => m.value === model,
              );

              if (modelExists) {
                // 如果模型已存在，不需要添加
                return state;
              }

              // 创建新的模型对象
              const newModel = {
                value: model,
                label: label || model,
              };

              // 添加到列表前面
              return {
                ...state,
                customModels: [newModel, ...state.customModels],
              };
            });

            // 保存到存储，只保存可序列化的数据
            storage
              .setItem(BD_OPENAI_CONFIG_KEY, getSerializableState())
              .catch((err) =>
                console.error("Failed to save custom model:", err),
              );
          },

          removeCustomModel: (model: string) => {
            set((state) => {
              // 过滤掉要删除的模型
              const filteredModels = state.customModels.filter(
                (m) => m.value !== model,
              );

              return {
                ...state,
                customModels: filteredModels,
              };
            });

            // 保存到存储，只保存可序列化的数据
            storage
              .setItem(BD_OPENAI_CONFIG_KEY, getSerializableState())
              .catch((err) =>
                console.error(
                  "Failed to save after removing custom model:",
                  err,
                ),
              );
          },

          // 获取当前线路的配置
          getCurrentRouteConfig: () => {
            const state = get();

            switch (state.routeType) {
              case "utools":
                return state.utoolsRoute;
              case "custom":
                return state.customRoute;
              default:
                return state.utoolsRoute;
            }
          },

          // 获取当前线路的 API Key
          getCurrentApiKey: () => {
            const state = get();

            switch (state.routeType) {
              case "utools":
                return "";
              case "custom":
                return state.customRoute.apiKey;
              default:
                return "";
            }
          },

          // 获取当前线路的 API 地址
          getCurrentProxyUrl: () => {
            const state = get();

            switch (state.routeType) {
              case "utools":
                return "";
              case "custom":
                return state.customRoute.proxyUrl;
              default:
                return "";
            }
          },

          // 获取当前线路的模型
          getCurrentModel: () => {
            const config = get().getCurrentRouteConfig();

            return config.model;
          },
        };
      },
      {
        name: "OpenAIConfigStore",
        enabled: true,
      },
    ),
  ),
);

// 注意：所有的更新操作已经在各自的方法中包含了保存到存储的逻辑
// 不需要额外的订阅来保存，这可能导致序列化错误
