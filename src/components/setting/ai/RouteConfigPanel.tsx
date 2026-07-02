import type { ReactNode } from "react";

import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";

import { ROUTE_LABEL } from "./aiRoutes";
import { ModelListTable } from "./ModelListTable";
import { TestConnectionBar, type TestResult } from "./TestConnection";
import { FormField } from "../settingPrimitives";

import SearchableSelect from "@/components/SearchableSelect/SearchableSelect.tsx";
import { useOpenAIConfigStore, type AIRouteType } from "@/store/useOpenAIConfigStore";

interface RouteConfigPanelProps {
  routeType: AIRouteType;
  isUtoolsAvailable: boolean;
  testing: boolean;
  testResult: TestResult | null;
  testModelUtools: string;
  testModelCustom: string;
  onSetTestModel: (route: "utools" | "custom", value: string) => void;
  onTest: (routeType: AIRouteType, model?: string) => void;
  onConfigureApiKey: (apiKey: string) => void;
  onConfigureProxyUrl: (proxyUrl: string) => void;
  onConfigureUtoolsModel: (model: string) => void;
  onAddCustomModel: (model: string, label?: string) => void;
  onRefreshCustomModels: () => void;
  onRemoveCustomModel: (value: string) => void;
  onClose: () => void;
}

/**
 * 线路配置面板：按 routeType 分发渲染。
 */
export function RouteConfigPanel(props: RouteConfigPanelProps) {
  const { routeType, onClose } = props;

  return (
    <div className="space-y-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2.5 text-lg font-medium">
          <div className="rounded-lg bg-primary/15 p-1.5">
            <Icon icon="solar:settings-bold" width={18} />
          </div>
          {ROUTE_LABEL[routeType]} 配置
        </h3>
        <Button
          isIconOnly
          className="h-8 min-w-8"
          color="default"
          radius="full"
          size="sm"
          variant="flat"
          onPress={onClose}
        >
          <Icon icon="solar:close-circle-bold" width={16} />
        </Button>
      </div>

      {routeType === "utools" && props.isUtoolsAvailable && (
        <UtoolsRouteConfig {...props} />
      )}
      {routeType === "custom" && <CustomRouteConfig {...props} />}
    </div>
  );
}

function ConfigSection({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function UtoolsRouteConfig(props: RouteConfigPanelProps) {
  const { utoolsRoute, utoolsModels } = useOpenAIConfigStore();
  const {
    testing,
    testResult,
    testModelUtools,
    isUtoolsAvailable,
    onSetTestModel,
    onTest,
    onConfigureUtoolsModel,
  } = props;

  return (
    <ConfigSection>
      <FormField id="utools-model" icon="solar:layers-bold" label="选择模型">
        <SearchableSelect
          className="w-full"
          id="utools-model"
          items={utoolsModels}
          placeholder="选择 uTools 模型"
          selectedValue={utoolsRoute.model}
          onChange={(value) => onConfigureUtoolsModel(value)}
        />
      </FormField>

      <TestConnectionBar
        disabled={testing || !isUtoolsAvailable || !testModelUtools}
        result={testResult}
        testing={testing}
        onTest={() => onTest("utools", testModelUtools)}
      >
        <SearchableSelect
          className="w-full sm:w-64"
          items={utoolsModels}
          placeholder="选择模型"
          selectedValue={testModelUtools}
          onChange={(value) => onSetTestModel("utools", value)}
        />
      </TestConnectionBar>

      <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-default-700">
        <div className="flex items-center gap-2">
          <Icon
            className="text-warning"
            icon="solar:info-circle-bold"
            width={16}
          />
          <span className="font-medium">提示</span>
        </div>
        <p className="ml-6 mt-1">uTools AI 线路由 uTools 环境提供，适合本地使用。</p>
      </div>
    </ConfigSection>
  );
}

function CustomRouteConfig(props: RouteConfigPanelProps) {
  const { customRoute, customModels } = useOpenAIConfigStore();
  const {
    testing,
    testResult,
    testModelCustom,
    onSetTestModel,
    onTest,
    onConfigureApiKey,
    onConfigureProxyUrl,
    onAddCustomModel,
    onRefreshCustomModels,
    onRemoveCustomModel,
  } = props;
  const [manualModel, setManualModel] = useState("");
  const [manualLabel, setManualLabel] = useState("");

  const addManualModel = () => {
    const model = manualModel.trim();

    if (!model) return;
    onAddCustomModel(model, manualLabel.trim() || undefined);
    setManualModel("");
    setManualLabel("");
  };

  return (
    <ConfigSection>
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
        <div className="flex items-center gap-2.5">
          <Icon
            className="text-primary"
            icon="solar:bookmark-square-bold"
            width={20}
          />
          <span className="font-medium">私有线路</span>
        </div>
        <p className="mt-2 text-xs text-default-700">
          填入你自己的 API 地址和密钥，连接私有模型服务。
        </p>
      </div>

      <FormField id="api-url" icon="solar:link-bold" label="API 地址">
        <Input
          className="w-full"
          id="api-url"
          placeholder="输入 API 地址，例如: https://your-private-endpoint/v1"
          size="sm"
          value={customRoute.proxyUrl}
          variant="bordered"
          onChange={(e) => onConfigureProxyUrl(e.target.value)}
        />
      </FormField>

      <FormField id="api-key" icon="solar:key-bold" label="API 密钥">
        <Input
          className="w-full"
          id="api-key"
          placeholder="输入您的 API 密钥"
          size="sm"
          type="password"
          value={customRoute.apiKey}
          variant="bordered"
          onChange={(e) => onConfigureApiKey(e.target.value)}
        />
      </FormField>

      <TestConnectionBar
        disabled={testing || !customRoute.apiKey || !customRoute.proxyUrl || !testModelCustom}
        result={testResult}
        testing={testing}
        onTest={() => onTest("custom", testModelCustom)}
      >
        <SearchableSelect
          className="w-full sm:w-60"
          items={customModels}
          placeholder="选择模型"
          selectedValue={testModelCustom}
          onChange={(value) => onSetTestModel("custom", value)}
        />
      </TestConnectionBar>

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-default-200 bg-default-50/60 p-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          aria-label="模型名称"
          placeholder="手动输入模型名称，例如 gpt-4o"
          size="sm"
          value={manualModel}
          variant="bordered"
          onChange={(e) => setManualModel(e.target.value)}
        />
        <Input
          aria-label="显示名称"
          placeholder="显示名称，可选"
          size="sm"
          value={manualLabel}
          variant="bordered"
          onChange={(e) => setManualLabel(e.target.value)}
        />
        <Button
          color="primary"
          isDisabled={!manualModel.trim()}
          radius="full"
          size="sm"
          startContent={<Icon icon="solar:add-circle-bold" width={16} />}
          onPress={addManualModel}
        >
          添加
        </Button>
      </div>

      <ModelListTable
        models={customModels}
        onAdd={() => addManualModel()}
        onRefresh={onRefreshCustomModels}
        onRemove={onRemoveCustomModel}
      />
    </ConfigSection>
  );
}
