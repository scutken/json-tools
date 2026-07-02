import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Chip, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";

import PromptContainer, { PromptContainerRef } from "@/components/ai/PromptContainer";
import { AIRouteType, useOpenAIConfigStore } from "@/store/useOpenAIConfigStore";

interface ModelOption {
  value: string;
  label: string;
}

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
  handler?: () => void;
}

export interface AIAssistantSidebarMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AIAssistantSidebarProps {
  isOpen: boolean;
  prompt: string;
  messages: AIAssistantSidebarMessage[];
  editorContent: string;
  quickPrompts?: QuickPrompt[];
  placeholderText?: string;
  tipText?: string;
  tipIcon?: string;
  isDiffEditor?: boolean;
  onPromptChange: (prompt: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onQuickPromptClick?: (quickPrompt: QuickPrompt) => void;
  onApplyCode?: (code: string) => void;
  onApplyCodeToLeft?: (code: string) => void;
  onApplyCodeToRight?: (code: string) => void;
}

export interface AIAssistantSidebarRef {
  sendMessage: (content: string) => void;
}

const AIAssistantSidebar = forwardRef<AIAssistantSidebarRef, AIAssistantSidebarProps>(
  (
    {
      isOpen,
      prompt,
      messages,
      editorContent,
      quickPrompts = [],
      placeholderText = "输入您的问题...",
      tipText = "提示: 您可以让AI为您处理关于数据修复，数据优化，模拟数据生成等问题",
      tipIcon = "mdi:lightbulb-outline",
      isDiffEditor = false,
      onPromptChange,
      onSubmit,
      onClose,
      onQuickPromptClick,
      onApplyCode,
      onApplyCodeToLeft,
      onApplyCodeToRight,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const promptContainerRef = useRef<PromptContainerRef>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUtoolsAvailable] = useState(
      () => typeof window !== "undefined" && "utools" in window,
    );

    const routeType = useOpenAIConfigStore((state) => state.routeType);
    const routeEnabled = useOpenAIConfigStore((state) => state.routeEnabled);
    const utoolsModel = useOpenAIConfigStore((state) => state.utoolsRoute.model);
    const customModel = useOpenAIConfigStore((state) => state.customRoute.model);
    const customApiKey = useOpenAIConfigStore((state) => state.customRoute.apiKey);
    const customProxyUrl = useOpenAIConfigStore((state) => state.customRoute.proxyUrl);
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

    const fallbackRouteType: AIRouteType = isCustomRouteAvailable ? "custom" : "utools";
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
            return utoolsModels;
          }

          return [
            {
              value: "deepseek-v3",
              label: "DeepSeek-V3",
            },
          ];
        case "custom":
          if (customModels.length > 0) {
            return customModels;
          }

          return [
            {
              value: customModel || "deepseek-v4-pro",
              label: customModel || "deepseek-v4-pro",
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
      inputRef.current?.focus();
    };

    useImperativeHandle(ref, () => ({
      sendMessage: (content: string) => {
        promptContainerRef.current?.sendMessage(content);
      },
    }));

    if (!isOpen) {
      return null;
    }

    return (
      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-default-200 bg-content1/95 dark:border-default-100/20 dark:bg-neutral-900/95">
        <div className="flex items-center justify-between gap-3 border-b border-default-200 px-4 py-3 dark:border-default-100/20">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="shrink-0 text-primary" icon="hugeicons:ai-chat-02" width={18} />
            <span className="truncate text-sm font-medium text-foreground">AI 助手</span>
          </div>
          <Button isIconOnly aria-label="关闭" size="sm" variant="light" onPress={onClose}>
            <Icon icon="mdi:close" width={18} />
          </Button>
        </div>

        <div className="flex flex-none items-center gap-2 border-b border-default-200 px-4 py-3 dark:border-default-100/20">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-default-200 bg-background px-3 py-2 dark:border-default-100/20 dark:bg-neutral-950/60">
            <Icon className="shrink-0 text-primary" icon="hugeicons:ai-chat-02" width={18} />
            <input
              ref={inputRef}
              aria-label="AI prompt"
              className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-default-400"
              placeholder={placeholderText}
              type="text"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isGenerating) {
                    promptContainerRef.current?.stopGeneration();

                    return;
                  }

                  onSubmit();
                }
              }}
            />
            {prompt ? (
              <Button
                isIconOnly
                aria-label="清除输入"
                size="sm"
                variant="light"
                onPress={() => onPromptChange("")}
              >
                <Icon icon="mdi:close" width={16} />
              </Button>
            ) : null}
          </div>

          <Button
            isIconOnly
            aria-label={isGenerating ? "停止生成" : "发送"}
            color={isGenerating ? "danger" : "primary"}
            isDisabled={!isGenerating && !prompt.trim()}
            size="sm"
            onPress={() => {
              if (isGenerating) {
                promptContainerRef.current?.stopGeneration();

                return;
              }

              onSubmit();
            }}
          >
            <Icon icon={isGenerating ? "solar:stop-circle-linear" : "tabler:send"} width={16} />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-default-200 px-4 py-3 dark:border-default-100/20 sm:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-1 text-xs text-default-500">线路</div>
            <Select
              aria-label="选择 AI 线路"
              className="w-full"
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

          <div className="min-w-0">
            <div className="mb-1 text-xs text-default-500">模型</div>
            {currentRouteType === "custom" && !isCustomRouteAvailable ? (
              <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                未填写API密钥，请在设置中配置
              </div>
            ) : (
              <Select
                aria-label="选择 AI 模型"
                className="w-full"
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
            )}
          </div>
        </div>

        {quickPrompts.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-default-200 px-4 py-3 dark:border-default-100/20">
            {quickPrompts.map((item) => (
              <Chip
                key={item.id}
                className="cursor-pointer transition-transform hover:scale-105"
                color={item.color || "primary"}
                size="sm"
                startContent={item.icon ? <Icon icon={item.icon} width={14} /> : null}
                variant="flat"
                onClick={() => handleQuickPromptClick(item)}
              >
                {item.label}
              </Chip>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-1 border-b border-default-200 px-4 py-2 text-xs text-default-500 dark:border-default-100/20">
          <Icon className="shrink-0" icon={tipIcon} width={14} />
          <span className="min-w-0 truncate">{tipText}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <PromptContainer
            ref={promptContainerRef}
            className="h-full"
            editorContent={editorContent}
            hideInput={true}
            initialMessages={messages}
            isDiffEditor={isDiffEditor}
            showAttachButtons={false}
            useDirectApi={true}
            onApplyCode={onApplyCode}
            onApplyCodeToLeft={onApplyCodeToLeft}
            onApplyCodeToRight={onApplyCodeToRight}
            onLoadingChange={setIsGenerating}
          />
        </div>
      </aside>
    );
  },
);

AIAssistantSidebar.displayName = "AIAssistantSidebar";

export default AIAssistantSidebar;
