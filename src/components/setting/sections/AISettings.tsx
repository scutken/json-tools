import type { TestResult } from "../ai/TestConnection";

import { useEffect, useState } from "react";

import { GroupLabel, SectionCard, SectionHeader } from "../settingPrimitives";
import { RouteCard } from "../ai/RouteCard";
import { RouteConfigPanel } from "../ai/RouteConfigPanel";

import toast from "@/utils/toast";
import { useOpenAIConfigStore, type AIRouteType } from "@/store/useOpenAIConfigStore";
import { openAIService } from "@/services/openAIService";
import { isUtoolsAvailable } from "@/utils/env";

/**
 * AI 助手设置：线路管理 + 线路配置面板。
 */
export function AISettings() {
  const {
    routeType,
    utoolsRoute,
    customRoute,
    customModels,
    utoolsModels,
    routeEnabled,
    updateConfig,
    updateUtoolsRouteConfig,
    updateCustomRouteConfig,
    updateRouteEnabled,
    fetchUtoolsModels,
    fetchCustomModels,
    syncConfig,
    addCustomModel,
    removeCustomModel,
  } = useOpenAIConfigStore();

  const [configuringRoute, setConfiguringRoute] = useState<AIRouteType | null>(
    null,
  );
  const [testingRoute, setTestingRoute] = useState<AIRouteType | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testModelUtools, setTestModelUtools] = useState<string>("");
  const [testModelCustom, setTestModelCustom] = useState<string>(
    customRoute.model,
  );

  // 初始化时同步配置
  useEffect(() => {
    syncConfig();
  }, [syncConfig]);

  // 按当前线路获取模型列表
  useEffect(() => {
    if (routeType === "utools") {
      fetchUtoolsModels();
    } else if (routeType === "custom" && customRoute.apiKey && customRoute.proxyUrl) {
      fetchCustomModels();
    }
  }, [routeType, customRoute.apiKey, customRoute.proxyUrl, fetchUtoolsModels, fetchCustomModels]);

  // 配置变更同步到 openAIService
  useEffect(() => {
    openAIService.syncConfig();
  }, [
    routeType,
    utoolsRoute.model,
    utoolsRoute.temperature,
    customRoute.apiKey,
    customRoute.proxyUrl,
    customRoute.model,
    customRoute.temperature,
  ]);

  // 默认测试模型
  useEffect(() => {
    if (utoolsModels.length > 0 && !testModelUtools) {
      setTestModelUtools(utoolsModels[0].value);
    }
  }, [utoolsModels, testModelUtools]);

  useEffect(() => {
    if (customRoute.model && testModelCustom !== customRoute.model) {
      setTestModelCustom(customRoute.model);
    } else if (customModels.length > 0 && !testModelCustom) {
      setTestModelCustom(customModels[0].value);
    }
  }, [customModels, customRoute.model, testModelCustom]);

  useEffect(() => {
    if (
      routeType === "custom" &&
      customModels.length > 0 &&
      !customModels.some((model) => model.value === customRoute.model)
    ) {
      updateCustomRouteConfig({ model: customModels[0].value });
    }
  }, [routeType, customModels, customRoute.model, updateCustomRouteConfig]);

  // 配置线路：切换 routeType 并自动启用
  const handleConfigureRoute = (type: AIRouteType) => {
    if (type === "utools" && !isUtoolsAvailable) {
      toast.error("uTools API 不可用，请确保在 uTools 环境中运行");

      return;
    }

    setConfiguringRoute(type);
    updateConfig({ routeType: type });
    updateRouteEnabled(type, true);
    setTestingRoute(null);
    setTestResult(null);

    if (type === "utools") {
      fetchUtoolsModels();
    }

    if (type === "custom" && customRoute.apiKey && customRoute.proxyUrl) {
      fetchCustomModels();
    }

    openAIService.syncConfig();
  };

  const handleCloseConfig = () => setConfiguringRoute(null);

  // 配置变更处理
  const handleApiKeyChange = (apiKey: string) => {
    updateCustomRouteConfig({ apiKey });
    if (routeType === "custom" && apiKey && customRoute.proxyUrl) {
      fetchCustomModels();
      openAIService.syncConfig();
    }
  };

  const handleProxyUrlChange = (proxyUrl: string) => {
    updateCustomRouteConfig({ proxyUrl });
    if (routeType === "custom" && customRoute.apiKey && proxyUrl) {
      fetchCustomModels();
      openAIService.syncConfig();
    }
  };

  const handleUtoolsModelChange = (model: string) => {
    updateUtoolsRouteConfig({ model });
    if (routeType === "utools") openAIService.syncConfig();
  };

  // 测试连接
  const testRouteConnection = async (type: AIRouteType, testModel?: string) => {
    setTestingRoute(type);
    setTestResult(null);
    try {
      const modelToTest = testModel || (type === "utools" ? testModelUtools : testModelCustom);

      if (!modelToTest) {
        throw new Error("请选择要测试的模型");
      }

      const originalConfig = { ...openAIService.config };

      openAIService.updateConfig({ routeType: type, model: modelToTest });
      const response = await openAIService.chat({
        messages: [{ role: "user", content: "say 1" }],
        model: modelToTest,
      });

      if (response?.choices?.[0]?.message) {
        setTestResult({ success: true, message: "Connection successful." });
      } else {
        throw new Error("API 返回结果异常");
      }
      openAIService.updateConfig(originalConfig);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error, connection failed",
      });
    } finally {
      setTestingRoute(null);
    }
  };

  const handleRemoveCustomModel = (modelValue: string) => {
    const isCurrent = modelValue === customRoute.model;

    removeCustomModel(modelValue);
    if (isCurrent && customModels.length > 1) {
      const next = customModels.find((m) => m.value !== modelValue);

      updateCustomRouteConfig({ model: next ? next.value : "" });
    } else if (isCurrent) {
      updateCustomRouteConfig({ model: "" });
    }
    toast.success(`已删除模型 ${modelValue}`);
  };

  const handleAddCustomModel = (model: string, label?: string) => {
    addCustomModel(model, label);
    updateCustomRouteConfig({ model });
    setTestModelCustom(model);
    toast.success(`已添加模型 ${model}`);
  };

  return (
    <div className="h-full">
      <SectionHeader description="管理 AI 线路与模型配置" title="AI 设置" />

      <GroupLabel>AI 线路</GroupLabel>
      <p className="mb-3 px-4 text-[13px] text-default-500">
        启用或禁用不同的 AI 线路，点击「配置」按钮设置线路参数。
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RouteCard
          available={isUtoolsAvailable}
          description="uTools 官方的 AI 智能助手"
          isSelected={routeEnabled.utools}
          routeType="utools"
          showConfigure
          onConfigure={() => handleConfigureRoute("utools")}
          onToggle={(enabled) => {
            updateRouteEnabled("utools", enabled);
            if (enabled) {
              updateConfig({ routeType: "utools" });
            }
          }}
        />
        <RouteCard
          available
          description="连接你自己的私有 API 服务"
          isSelected={routeEnabled.custom}
          routeType="custom"
          showConfigure
          onConfigure={() => handleConfigureRoute("custom")}
          onToggle={(enabled) => {
            updateRouteEnabled("custom", enabled);
            if (enabled) {
              updateConfig({ routeType: "custom" });
            }
          }}
        />
      </div>

      {configuringRoute ? <GroupLabel>线路配置</GroupLabel> : null}
      {configuringRoute ? (
        <SectionCard className="p-4 sm:p-5">
          <RouteConfigPanel
            isUtoolsAvailable={isUtoolsAvailable}
            routeType={configuringRoute}
            testModelCustom={testModelCustom}
            testModelUtools={testModelUtools}
            testResult={testResult}
            testing={testingRoute === configuringRoute}
            onClose={handleCloseConfig}
            onConfigureApiKey={handleApiKeyChange}
            onConfigureProxyUrl={handleProxyUrlChange}
            onConfigureUtoolsModel={handleUtoolsModelChange}
            onAddCustomModel={handleAddCustomModel}
            onRefreshCustomModels={fetchCustomModels}
            onRemoveCustomModel={handleRemoveCustomModel}
            onSetTestModel={(route, value) => {
              if (route === "utools") setTestModelUtools(value);
              else setTestModelCustom(value);
            }}
            onTest={testRouteConnection}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
