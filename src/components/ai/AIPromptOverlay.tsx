import React, { useRef, useEffect, useMemo, useState } from "react";
import { Button, Chip, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";

import { AIRouteType, useOpenAIConfigStore } from "@/store/useOpenAIConfigStore";

// 定义模型选项类型
interface ModelOption {
  value: string;
  label: string;
  tag?: {
    text: string;
    type: "energy" | "private";
  };
}

// 快捷指令类型定义
export interface QuickPrompt {
  id: string;
  label: string;
  icon?: string;
  prompt: string;
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "default";
  handler?: () => void; // 可选的自定义处理函数
}

interface AIPromptOverlayProps {
  isOpen: boolean;
  prompt: string;
  placeholderText?: string;
  tipText?: string;
  tipIcon?: string;
  quickPrompts?: QuickPrompt[]; // 新增：快捷指令数组
  onPromptChange: (prompt: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onQuickPromptClick?: (quickPrompt: QuickPrompt) => void; // 新增：自定义快捷指令点击处理函数
}

const AIPromptOverlay: React.FC<AIPromptOverlayProps> = ({
  isOpen,
  prompt,
  placeholderText = "输入您的问题...",
  tipText = "提示: 您可以让AI为您处理关于数据修复，数据优化，模拟数据生成等问题",
  tipIcon = "mdi:lightbulb-outline",
  quickPrompts = [], // 默认为空数组
  onPromptChange,
  onSubmit,
  onClose,
  onQuickPromptClick,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isUtoolsAvailable] = useState(
    () => typeof window !== "undefined" && "utools" in window,
  );

  const routeType = useOpenAIConfigStore((state) => state.routeType);
  const routeEnabled = useOpenAIConfigStore((state) => state.routeEnabled);
  const utoolsModel = useOpenAIConfigStore((state) => state.utoolsRoute.model);
  const customModel = useOpenAIConfigStore((state) => state.customRoute.model);
  const customApiKey = useOpenAIConfigStore((state) => state.customRoute.apiKey);
  const customProxyUrl = useOpenAIConfigStore(
    (state) => state.customRoute.proxyUrl,
  );
  const utoolsModels = useOpenAIConfigStore((state) => state.utoolsModels);
  const customModels = useOpenAIConfigStore((state) => state.customModels);

  const updateConfig = useOpenAIConfigStore((state) => state.updateConfig);
  const updateUtoolsRouteConfig = useOpenAIConfigStore(
    (state) => state.updateUtoolsRouteConfig,
  );
  const updateCustomRouteConfig = useOpenAIConfigStore(
    (state) => state.updateCustomRouteConfig,
  );
  const fetchUtoolsModels = useOpenAIConfigStore(
    (state) => state.fetchUtoolsModels,
  );
  const fetchCustomModels = useOpenAIConfigStore(
    (state) => state.fetchCustomModels,
  );

  const isCustomRouteAvailable = !!customApiKey && !!customProxyUrl;

  useEffect(() => {
    if (isUtoolsAvailable && routeType === "utools") {
      fetchUtoolsModels();
    }
  }, [fetchUtoolsModels, isUtoolsAvailable, routeType]);

  useEffect(() => {
    if (routeType === "custom" && isCustomRouteAvailable && customModels.length === 0) {
      fetchCustomModels();
    }
  }, [fetchCustomModels, routeType, isCustomRouteAvailable, customModels.length]);

  const availableRoutes = useMemo(() => {
    const routes: AIRouteType[] = [];

    if (routeEnabled.utools && isUtoolsAvailable) {
      routes.push("utools");
    }

    if (routeEnabled.custom) {
      routes.push("custom");
    }

    return routes;
  }, [routeEnabled, isUtoolsAvailable]);

  const fallbackRouteType: AIRouteType = isCustomRouteAvailable
    ? "custom"
    : "utools";
  const currentRouteType = availableRoutes.includes(routeType)
    ? routeType
    : fallbackRouteType;

  useEffect(() => {
    if (!availableRoutes.includes(routeType)) {
      updateConfig({ routeType: fallbackRouteType });
    }
  }, [availableRoutes, fallbackRouteType, routeType, updateConfig]);

  const modelOptions = useMemo((): ModelOption[] => {
    switch (currentRouteType) {
      case "utools":
        if (utoolsModels.length > 0) {
          return utoolsModels.map((model) => ({
            ...model,
            tag: { text: "能量", type: "energy" },
          }));
        }

        return [
          {
            value: "deepseek-v3",
            label: "DeepSeek-V3",
            tag: { text: "能量", type: "energy" },
          },
        ];
      case "custom":
        if (customModels.length > 0) {
          return customModels.map((model) => ({
            ...model,
            tag: { text: "私有", type: "private" },
          }));
        }

        return [
          {
            value: customModel || "deepseek-v4-pro",
            label: customModel || "deepseek-v4-pro",
            tag: { text: "私有", type: "private" },
          },
        ];
    }
  }, [currentRouteType, customModel, customModels, utoolsModels]);

  const currentModel = useMemo(() => {
    switch (currentRouteType) {
      case "utools":
        return utoolsModel;
      case "custom":
        return customModel;
    }
  }, [currentRouteType, customModel, utoolsModel]);

  const handleRouteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRouteType = e.target.value as AIRouteType;

    if (!availableRoutes.includes(newRouteType)) {
      return;
    }

    if (newRouteType === "utools" && isUtoolsAvailable) {
      fetchUtoolsModels();
      const defaultUtoolsModel =
        utoolsModels.length > 0 ? utoolsModels[0].value : "deepseek-v3";

      updateUtoolsRouteConfig({ model: defaultUtoolsModel });
    }

    if (newRouteType === "custom") {
      if (isCustomRouteAvailable && customModels.length === 0) {
        fetchCustomModels();
      }

      if (customModels.length > 0) {
        updateCustomRouteConfig({ model: customModels[0].value });
      }
    }

    updateConfig({ routeType: newRouteType });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;

    switch (currentRouteType) {
      case "utools":
        updateUtoolsRouteConfig({ model: newModel });
        break;
      case "custom":
        updateCustomRouteConfig({ model: newModel });
        break;
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleQuickPromptClick = (quickPrompt: QuickPrompt) => {
    if (onQuickPromptClick) {
      onQuickPromptClick(quickPrompt);

      return;
    }

    if (quickPrompt.handler) {
      quickPrompt.handler();

      return;
    }

    onPromptChange(quickPrompt.prompt);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      aria-label="AI 提示对话框"
      aria-modal="true"
      className="absolute z-50 top-[10px] left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl"
      role="dialog"
    >
      <div className="flex flex-col overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-r from-blue-200/30 to-indigo-50 shadow-xl backdrop-blur-sm dark:border-neutral-700 dark:from-neutral-800/80">
        <div className="flex items-center gap-2 p-4">
          <div className="flex flex-1 items-center rounded-md border border-blue-200 bg-white px-1 py-1 pl-2 pr-1 shadow-inner dark:border-neutral-700 dark:bg-neutral-800">
            <Icon
              className="mx-2 text-indigo-500"
              icon="hugeicons:ai-chat-02"
              width={20}
            />
            <input
              ref={inputRef}
              aria-label="AI 提示输入"
              className="h-8 flex-1 border-none bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400 dark:text-gray-200 dark:placeholder-neutral-500"
              placeholder={placeholderText}
              type="text"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            {prompt && (
              <Button
                isIconOnly
                aria-label="清除输入"
                className="mr-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                size="sm"
                variant="light"
                onPress={() => onPromptChange("")}
              >
                <Icon icon="mdi:close" width={16} />
              </Button>
            )}
          </div>

          <Button
            isIconOnly
            aria-label="发送提问"
            className="w-12 bg-gradient-to-r from-blue-500 to-indigo-600 order-none"
            color="primary"
            size="sm"
            onPress={onSubmit}
          >
            <Icon icon="tabler:send" width={16} />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-blue-100 bg-white/30 px-4 py-3 dark:border-neutral-700/50 dark:bg-neutral-800/30">
          <div className="flex items-center gap-2">
            <div className="flex items-center whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
              线路:
            </div>
            <Select
              aria-label="选择 AI 线路"
              className="min-w-[180px]"
              disallowEmptySelection={true}
              selectedKeys={new Set([currentRouteType])}
              selectionMode="single"
              size="sm"
              onChange={handleRouteChange}
            >
              {availableRoutes.map((route) => {
                switch (route) {
                  case "utools":
                    return (
                      <SelectItem
                        key="utools"
                        startContent={
                          <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
                            AI 能量
                          </span>
                        }
                      >
                        uTools AI
                      </SelectItem>
                    );
                  case "custom":
                    return (
                      <SelectItem
                        key="custom"
                        startContent={
                          <span className="rounded-full bg-primary/20 px-3 py-0.5 text-xs text-primary">
                            私 有
                          </span>
                        }
                      >
                        私有线路
                      </SelectItem>
                    );
                }
              })}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
              模型:
            </div>
            {currentRouteType === "custom" && !isCustomRouteAvailable ? (
              <div className="text-xs text-red-500">未填写API密钥，请在设置中配置</div>
            ) : (
              <div className="flex items-center gap-2">
                <Select
                  aria-label="选择 AI 模型"
                  className="min-w-[200px]"
                  disallowEmptySelection={true}
                  selectedKeys={new Set([currentModel])}
                  selectionMode="single"
                  size="sm"
                  onChange={handleModelChange}
                >
                  {modelOptions.map((model) => (
                    <SelectItem key={model.value}>{model.label}</SelectItem>
                  ))}
                </Select>
                {currentRouteType === "utools" && (
                  <span className="whitespace-nowrap rounded-full bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
                    AI 能量
                  </span>
                )}
                {currentRouteType === "custom" && (
                  <span className="whitespace-nowrap rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                    私 有
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {quickPrompts.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-blue-100 bg-white/30 px-4 py-4 dark:border-neutral-700/50 dark:bg-neutral-800/30">
            {quickPrompts.map((prompt) => (
              <Chip
                key={prompt.id}
                className="cursor-pointer transition-transform hover:scale-105"
                color={prompt.color || "primary"}
                size="sm"
                startContent={
                  prompt.icon && <Icon icon={prompt.icon} width={14} />
                }
                variant="flat"
                onClick={() => handleQuickPromptClick(prompt)}
              >
                {prompt.label}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex items-center px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
          <Icon className="mr-1" icon={tipIcon} width={14} />
          <span>{tipText}</span>
        </div>
      </div>
    </div>
  );
};

export default AIPromptOverlay;
