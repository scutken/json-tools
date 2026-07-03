import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { cn } from "@heroui/react";
import { editor } from "monaco-editor";

import toast from "@/utils/toast";
import { MonacoDiffEditorEditorType } from "@/components/monacoEditor/monacoEntity";
import { sortJson, parseJson } from "@/utils/json";
import { useTabStore } from "@/store/useTabStore";
import {
  TimestampDecoratorState,
  clearTimestampCache,
  toggleTimestampDecorators,
  updateTimestampDecorations,
  handleTimestampContentChange,
} from "@/components/monacoEditor/decorations/timestampDecoration.ts";
import {
  Base64DecoratorState,
  updateBase64Decorations,
  handleBase64ContentChange,
  setBase64DecorationEnabled,
  setBase64ProviderEnabled,
} from "@/components/monacoEditor/decorations/base64Decoration.ts";
import {
  UnicodeDecoratorState,
  updateUnicodeDecorations,
  handleUnicodeContentChange,
  setUnicodeDecorationEnabled,
  setUnicodeProviderEnabled,
} from "@/components/monacoEditor/decorations/unicodeDecoration.ts";
import {
  UrlDecoratorState,
  updateUrlDecorations,
  handleUrlContentChange,
  setUrlDecorationEnabled,
  setUrlProviderEnabled,
} from "@/components/monacoEditor/decorations/urlDecoration.ts";
import {
  ImageDecoratorState,
  updateImageDecorations,
  handleImageContentChange,
  setImageDecorationEnabled,
  toggleImageDecorators,
} from "@/components/monacoEditor/decorations/imageDecoration.ts";
import { DecorationManager } from "@/components/monacoEditor/decorations/decorationManager.ts";
import { DisposableStore } from "@/components/monacoEditor/monacoDisposables.ts";
import { ensureProvidersRegistered } from "@/components/monacoEditor/decorations/decorationInit.ts";
import {
  getEditorWorkload,
  scheduleInlineDecorationUpdate,
  shouldRunInlineDecorations,
} from "@/components/monacoEditor/editorPerformance";

import "@/styles/monaco.css";
import { Json5LanguageDef } from "@/components/monacoEditor/MonacoLanguageDef.tsx";
import { useSettingsStore } from "@/store/useSettingsStore";

export interface MonacoDiffEditorProps {
  tabKey: string;
  tabTitle?: string;
  height?: number | string;
  originalValue: string;
  modifiedValue: string;
  language?: string;
  theme?: string;
  showTimestampDecorators?: boolean;
  showBase64Decorators?: boolean;
  showUnicodeDecorators?: boolean;
  showUrlDecorators?: boolean;
  showImageDecorators?: boolean;
  onUpdateOriginalValue: (value: string) => void;
  onUpdateModifiedValue?: (value: string) => void;
  onMount?: () => void;
  ref?: React.Ref<MonacoDiffEditorRef>;
}

export interface MonacoDiffEditorRef {
  clear: (type?: MonacoDiffEditorEditorType) => boolean;
  copy: (type?: MonacoDiffEditorEditorType) => boolean;
  fieldSort: (
    type?: MonacoDiffEditorEditorType,
    sort?: "asc" | "desc",
  ) => boolean;
  focus: () => void;
  format: (type?: MonacoDiffEditorEditorType) => boolean;
  layout: () => void;
  updateModifiedValue: (value: string) => void;
  updateOriginalValue: (value: string) => void;
  toggleTimestampDecorators: (enabled?: boolean) => boolean;
  toggleBase64Decorators: (enabled?: boolean) => boolean;
  toggleUnicodeDecorators: (enabled?: boolean) => boolean;
  toggleUrlDecorators: (enabled?: boolean) => boolean;
  toggleImageDecorators: (enabled?: boolean) => boolean;
}

const MonacoDiffEditor: React.FC<MonacoDiffEditorProps> = ({
  originalValue,
  modifiedValue,
  language,
  theme,
  height,
  tabKey,
  showTimestampDecorators = true,
  showBase64Decorators = true,
  showUnicodeDecorators = true,
  showUrlDecorators = true,
  showImageDecorators = true,
  onUpdateOriginalValue,
  onUpdateModifiedValue,
  onMount,
  ref,
}) => {
  const { getTabByKey, updateEditorSettings } = useTabStore();
  const { base64DecoderEnabled, unicodeDecoderEnabled, urlDecoderEnabled } =
    useSettingsStore();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const rootContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const originalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const modifiedEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Monaco 资源生命周期管理器，统一管理所有事件监听器
  const disposableStore = useRef(new DisposableStore());

  // 从 store 获取当前 tab 的设置
  const currentTab = getTabByKey(tabKey);
  const editorSettings = currentTab?.editorSettings || {
    fontSize: 14,
    language: language || "json",
    indentSize: 4,
    timestampDecoratorsEnabled: showTimestampDecorators,
    base64DecoratorsEnabled: showBase64Decorators,
    unicodeDecoratorsEnabled: showUnicodeDecorators,
    urlDecoratorsEnabled: showUrlDecorators,
    imageDecoratorsEnabled: showImageDecorators,
  };

  // 菜单状态
  const [currentLanguage] = useState(editorSettings.language);
  const [fontSize] = useState(editorSettings.fontSize);
  const [indentSize] = useState(editorSettings.indentSize || 4);

  // 时间戳装饰器相关引用
  // 为原始编辑器和修改后编辑器分别创建装饰器状态
  const originalTimestampDecorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const originalTimestampDecorationIdsRef = useRef<Record<string, string[]>>(
    {},
  );
  const originalTimestampUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalTimestampCacheRef = useRef<Record<string, boolean>>({});

  const modifiedTimestampDecorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const modifiedTimestampDecorationIdsRef = useRef<Record<string, string[]>>(
    {},
  );
  const modifiedTimestampUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modifiedTimestampCacheRef = useRef<Record<string, boolean>>({});

  // 时间戳装饰器启用状态，优先从编辑器设置中读取
  const [timestampDecoratorsEnabled, setTimestampDecoratorsEnabled] = useState(
    editorSettings.timestampDecoratorsEnabled !== undefined
      ? editorSettings.timestampDecoratorsEnabled
      : showTimestampDecorators,
  );

  // Base64下划线装饰器启用状态，优先从编辑器设置中读取
  const [base64DecoratorsEnabled, setBase64DecoratorsEnabled] = useState(
    editorSettings.base64DecoratorsEnabled !== undefined
      ? editorSettings.base64DecoratorsEnabled
      : base64DecoderEnabled,
  );

  // Unicode装饰器启用状态，优先从编辑器设置中读取
  const [unicodeDecoratorsEnabled, setUnicodeDecoratorsEnabled] = useState(
    editorSettings.unicodeDecoratorsEnabled !== undefined
      ? editorSettings.unicodeDecoratorsEnabled
      : unicodeDecoderEnabled,
  );

  // URL装饰器启用状态，优先从编辑器设置中读取
  const [urlDecoratorsEnabled, setUrlDecoratorsEnabled] = useState(
    editorSettings.urlDecoratorsEnabled !== undefined
      ? editorSettings.urlDecoratorsEnabled
      : urlDecoderEnabled,
  );

  // 时间戳装饰器状态
  const originalTimestampDecoratorState: TimestampDecoratorState = {
    editorRef: originalEditorRef,
    decorationsRef: originalTimestampDecorationsRef,
    decorationIdsRef: originalTimestampDecorationIdsRef,
    updateTimeoutRef: originalTimestampUpdateTimeoutRef,
    cacheRef: originalTimestampCacheRef,
    enabled: timestampDecoratorsEnabled,
    hoverProviderId: { current: null },
  };

  const modifiedTimestampDecoratorState: TimestampDecoratorState = {
    editorRef: modifiedEditorRef,
    decorationsRef: modifiedTimestampDecorationsRef,
    decorationIdsRef: modifiedTimestampDecorationIdsRef,
    updateTimeoutRef: modifiedTimestampUpdateTimeoutRef,
    cacheRef: modifiedTimestampCacheRef,
    enabled: timestampDecoratorsEnabled,
    hoverProviderId: { current: null },
  };

  // Base64下划线装饰器相关引用 - 添加空的引用以兼容现有代码
  const originalBase64UpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalBase64DecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );
  const modifiedBase64UpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modifiedBase64DecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );

  // Unicode下划线装饰器相关引用
  const originalUnicodeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalUnicodeDecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );

  const modifiedUnicodeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modifiedUnicodeDecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );

  // URL下划线装饰器相关引用
  const originalUrlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalUrlDecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );
  const modifiedUrlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modifiedUrlDecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );

  // 图片装饰器相关引用
  const originalImageUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalImageDecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );
  const originalImageCacheRef = useRef<Record<string, boolean>>({});

  const modifiedImageUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modifiedImageDecorationManagerRef = useRef<DecorationManager | null>(
    null,
  );
  const modifiedImageCacheRef = useRef<Record<string, boolean>>({});
  const originalInlineDecorationUpdateTimeoutRef =
    useRef<NodeJS.Timeout | null>(null);
  const modifiedInlineDecorationUpdateTimeoutRef =
    useRef<NodeJS.Timeout | null>(null);

  // 图片装饰器启用状态
  const [imageDecoratorsEnabled, setImageDecoratorsEnabled] = useState(
    editorSettings.imageDecoratorsEnabled !== undefined
      ? editorSettings.imageDecoratorsEnabled
      : showImageDecorators,
  );

  // Base64下划线装饰器状态
  const originalBase64DecoratorState: Base64DecoratorState = {
    editorRef: originalEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: originalBase64UpdateTimeoutRef,
    decorationManagerRef: originalBase64DecorationManagerRef,
    enabled: base64DecoratorsEnabled,
  };

  const modifiedBase64DecoratorState: Base64DecoratorState = {
    editorRef: modifiedEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: modifiedBase64UpdateTimeoutRef,
    decorationManagerRef: modifiedBase64DecorationManagerRef,
    enabled: base64DecoratorsEnabled,
  };

  // Unicode下划线装饰器状态
  const originalUnicodeDecoratorState: UnicodeDecoratorState = {
    editorRef: originalEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: originalUnicodeUpdateTimeoutRef,
    decorationManagerRef: originalUnicodeDecorationManagerRef,
    enabled: unicodeDecoratorsEnabled,
  };

  const modifiedUnicodeDecoratorState: UnicodeDecoratorState = {
    editorRef: modifiedEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: modifiedUnicodeUpdateTimeoutRef,
    decorationManagerRef: modifiedUnicodeDecorationManagerRef,
    enabled: unicodeDecoratorsEnabled,
  };

  // URL下划线装饰器状态
  const originalUrlDecoratorState: UrlDecoratorState = {
    editorRef: originalEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: originalUrlUpdateTimeoutRef,
    decorationManagerRef: originalUrlDecorationManagerRef,
    enabled: urlDecoratorsEnabled,
  };

  const modifiedUrlDecoratorState: UrlDecoratorState = {
    editorRef: modifiedEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: modifiedUrlUpdateTimeoutRef,
    decorationManagerRef: modifiedUrlDecorationManagerRef,
    enabled: urlDecoratorsEnabled,
  };

  // 图片装饰器状态
  const originalImageDecoratorState: ImageDecoratorState = {
    editorRef: originalEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: originalImageUpdateTimeoutRef,
    decorationManagerRef: originalImageDecorationManagerRef,
    cacheRef: originalImageCacheRef,
    enabled: imageDecoratorsEnabled,
    theme: theme == "vs-dark" ? "dark" : "light",
    editorPrefix: "original",
  };

  const modifiedImageDecoratorState: ImageDecoratorState = {
    editorRef: modifiedEditorRef,
    hoverProviderId: { current: null },
    updateTimeoutRef: modifiedImageUpdateTimeoutRef,
    decorationManagerRef: modifiedImageDecorationManagerRef,
    cacheRef: modifiedImageCacheRef,
    enabled: imageDecoratorsEnabled,
    theme: theme == "vs-dark" ? "dark" : "light",
    editorPrefix: "modified",
  };

  // 监听时间戳装饰器状态变化
  useEffect(() => {
    // 更新状态对象中的启用状态
    originalTimestampDecoratorState.enabled = timestampDecoratorsEnabled;
    modifiedTimestampDecoratorState.enabled = timestampDecoratorsEnabled;

    if (timestampDecoratorsEnabled) {
      // 检查行数，小于3行时不启用装饰器
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 3) {
        // 清空缓存并更新装饰器
        clearTimestampCache(originalTimestampDecoratorState);
        setTimeout(() => {
          if (originalEditorRef.current) {
            updateTimestampDecorations(
              originalEditorRef.current,
              originalTimestampDecoratorState,
            );
          }
        }, 0);
      }

      if (modifiedLineCount >= 3) {
        // 清空缓存并更新装饰器
        clearTimestampCache(modifiedTimestampDecoratorState);
        setTimeout(() => {
          if (modifiedEditorRef.current) {
            updateTimestampDecorations(
              modifiedEditorRef.current,
              modifiedTimestampDecoratorState,
            );
          }
        }, 0);
      }
    } else {
      // 禁用时清理缓存和装饰器
      if (originalTimestampDecorationsRef.current) {
        originalTimestampDecorationsRef.current.clear();
      }
      if (modifiedTimestampDecorationsRef.current) {
        modifiedTimestampDecorationsRef.current.clear();
      }
      clearTimestampCache(originalTimestampDecoratorState);
      clearTimestampCache(modifiedTimestampDecoratorState);
    }
  }, [timestampDecoratorsEnabled]);

  // 监听Base64下划线装饰器状态变化
  useEffect(() => {
    // 更新状态对象中的启用状态
    originalBase64DecoratorState.enabled = base64DecoratorsEnabled;
    modifiedBase64DecoratorState.enabled = base64DecoratorsEnabled;

    // 更新全局状态
    setBase64ProviderEnabled(base64DecoratorsEnabled);
    setBase64DecorationEnabled(base64DecoratorsEnabled);

    if (base64DecoratorsEnabled) {
      // 初始化装饰器管理器（如果尚未初始化）
      if (
        !originalBase64DecorationManagerRef.current &&
        originalEditorRef.current
      ) {
        originalBase64DecorationManagerRef.current = new DecorationManager();
      }
      if (
        !modifiedBase64DecorationManagerRef.current &&
        modifiedEditorRef.current
      ) {
        modifiedBase64DecorationManagerRef.current = new DecorationManager();
      }

      // 检查行数，小于3行时不启用装饰器
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 3) {
        setTimeout(() => {
          if (originalEditorRef.current) {
            updateBase64Decorations(
              originalEditorRef.current,
              originalBase64DecoratorState,
            );
          }
        }, 0);
      }

      if (modifiedLineCount >= 3) {
        setTimeout(() => {
          if (modifiedEditorRef.current) {
            updateBase64Decorations(
              modifiedEditorRef.current,
              modifiedBase64DecoratorState,
            );
          }
        }, 0);
      }
    } else {
      // 禁用时清理装饰器
      if (originalBase64DecorationManagerRef.current) {
        originalBase64DecorationManagerRef.current.clearAllDecorations(
          originalEditorRef.current!,
        );
      }
      if (modifiedBase64DecorationManagerRef.current) {
        modifiedBase64DecorationManagerRef.current.clearAllDecorations(
          modifiedEditorRef.current!,
        );
      }
    }
  }, [base64DecoratorsEnabled]);

  // 监听Unicode装饰器状态变化
  useEffect(() => {
    // 更新状态对象中的启用状态
    originalUnicodeDecoratorState.enabled = unicodeDecoratorsEnabled;
    modifiedUnicodeDecoratorState.enabled = unicodeDecoratorsEnabled;

    // 更新全局状态
    setUnicodeProviderEnabled(unicodeDecoratorsEnabled);
    setUnicodeDecorationEnabled(unicodeDecoratorsEnabled);

    if (unicodeDecoratorsEnabled) {
      // 初始化装饰器管理器（如果尚未初始化）
      if (
        !originalUnicodeDecorationManagerRef.current &&
        originalEditorRef.current
      ) {
        originalUnicodeDecorationManagerRef.current = new DecorationManager();
      }
      if (
        !modifiedUnicodeDecorationManagerRef.current &&
        modifiedEditorRef.current
      ) {
        modifiedUnicodeDecorationManagerRef.current = new DecorationManager();
      }

      // 检查行数，小于3行时不启用装饰器
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 3) {
        setTimeout(() => {
          if (originalEditorRef.current) {
            updateUnicodeDecorations(
              originalEditorRef.current,
              originalUnicodeDecoratorState,
            );
          }
        }, 0);
      }

      if (modifiedLineCount >= 3) {
        setTimeout(() => {
          if (modifiedEditorRef.current) {
            updateUnicodeDecorations(
              modifiedEditorRef.current,
              modifiedUnicodeDecoratorState,
            );
          }
        }, 0);
      }
    } else {
      // 禁用时清理装饰器
      if (originalUnicodeDecorationManagerRef.current) {
        originalUnicodeDecorationManagerRef.current.clearAllDecorations(
          originalEditorRef.current!,
        );
      }
      if (modifiedUnicodeDecorationManagerRef.current) {
        modifiedUnicodeDecorationManagerRef.current.clearAllDecorations(
          modifiedEditorRef.current!,
        );
      }
    }
  }, [unicodeDecoratorsEnabled]);

  // 监听URL装饰器状态变化
  useEffect(() => {
    // 更新状态对象中的启用状态
    originalUrlDecoratorState.enabled = urlDecoratorsEnabled;
    modifiedUrlDecoratorState.enabled = urlDecoratorsEnabled;

    // 更新全局状态
    setUrlProviderEnabled(urlDecoratorsEnabled);
    setUrlDecorationEnabled(urlDecoratorsEnabled);

    if (urlDecoratorsEnabled) {
      // 初始化装饰器管理器（如果尚未初始化）
      if (
        !originalUrlDecorationManagerRef.current &&
        originalEditorRef.current
      ) {
        originalUrlDecorationManagerRef.current = new DecorationManager();
      }
      if (
        !modifiedUrlDecorationManagerRef.current &&
        modifiedEditorRef.current
      ) {
        modifiedUrlDecorationManagerRef.current = new DecorationManager();
      }

      // 检查行数，小于3行时不启用装饰器
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 3) {
        setTimeout(() => {
          if (originalEditorRef.current) {
            updateUrlDecorations(
              originalEditorRef.current,
              originalUrlDecoratorState,
            );
          }
        }, 0);
      }

      if (modifiedLineCount >= 3) {
        setTimeout(() => {
          if (modifiedEditorRef.current) {
            updateUrlDecorations(
              modifiedEditorRef.current,
              modifiedUrlDecoratorState,
            );
          }
        }, 0);
      }
    } else {
      // 禁用时清理装饰器
      if (originalUrlDecorationManagerRef.current) {
        originalUrlDecorationManagerRef.current.clearAllDecorations(
          originalEditorRef.current!,
        );
      }
      if (modifiedUrlDecorationManagerRef.current) {
        modifiedUrlDecorationManagerRef.current.clearAllDecorations(
          modifiedEditorRef.current!,
        );
      }
    }
  }, [urlDecoratorsEnabled]);

  // 监听图片装饰器状态变化
  useEffect(() => {
    // 更新状态对象中的启用状态
    originalImageDecoratorState.enabled = imageDecoratorsEnabled;
    modifiedImageDecoratorState.enabled = imageDecoratorsEnabled;

    if (imageDecoratorsEnabled) {
      // 初始化装饰器管理器（如果尚未初始化）
      if (
        !originalImageDecorationManagerRef.current &&
        originalEditorRef.current
      ) {
        originalImageDecorationManagerRef.current = new DecorationManager();
      }
      if (
        !modifiedImageDecorationManagerRef.current &&
        modifiedEditorRef.current
      ) {
        modifiedImageDecorationManagerRef.current = new DecorationManager();
      }

      // 检查行数，图片装饰器在行数>=1时就可以启用
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 1) {
        setTimeout(() => {
          if (originalEditorRef.current) {
            updateImageDecorations(
              originalEditorRef.current,
              originalImageDecoratorState,
            );
          }
        }, 0);
      }

      if (modifiedLineCount >= 1) {
        setTimeout(() => {
          if (modifiedEditorRef.current) {
            updateImageDecorations(
              modifiedEditorRef.current,
              modifiedImageDecoratorState,
            );
          }
        }, 0);
      }
    } else {
      // 禁用时清理装饰器
      if (originalImageDecorationManagerRef.current) {
        originalImageDecorationManagerRef.current.clearAllDecorations(
          originalEditorRef.current!,
        );
      }
      if (modifiedImageDecorationManagerRef.current) {
        modifiedImageDecorationManagerRef.current.clearAllDecorations(
          modifiedEditorRef.current!,
        );
      }
    }
  }, [imageDecoratorsEnabled]);

  // 监听主题变化并更新图片装饰器
  useEffect(() => {
    const currentTheme = theme == "vs-dark" ? "dark" : "light";

    if (originalEditorRef.current && imageDecoratorsEnabled) {
      const updatedState = {
        ...originalImageDecoratorState,
        theme: currentTheme,
      };

      updateImageDecorations(originalEditorRef.current, updatedState);
    }

    if (modifiedEditorRef.current && imageDecoratorsEnabled) {
      const updatedState = {
        ...modifiedImageDecoratorState,
        theme: currentTheme,
      };

      updateImageDecorations(modifiedEditorRef.current, updatedState);
    }
  }, [theme, imageDecoratorsEnabled]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [height]);

  useEffect(() => {
    if (editorRef.current) {
      const options: editor.IStandaloneDiffEditorConstructionOptions = {
        theme: theme,
      };

      editorRef.current.updateOptions(options);
    }
  }, [theme]);

  // 监听字体大小变化
  useEffect(() => {
    updateEditorOptions({
      fontSize: fontSize,
    });
  }, [fontSize]);

  // 监听缩进大小变化
  useEffect(() => {
    updateEditorTabSize(indentSize);
    editorFormat(MonacoDiffEditorEditorType.all);
  }, [indentSize]);

  // 监听语言变化
  useEffect(() => {
    if (originalEditorRef.current && modifiedEditorRef.current) {
      const originalModel = originalEditorRef.current.getModel();
      const modifiedModel = modifiedEditorRef.current.getModel();

      if (originalModel && modifiedModel) {
        monaco.editor.setModelLanguage(originalModel, currentLanguage);
        monaco.editor.setModelLanguage(modifiedModel, currentLanguage);
      }
    }
  }, [currentLanguage]);

  const runInlineDecorationRefresh = (
    targetEditor: editor.IStandaloneCodeEditor | null,
    editorType: "original" | "modified",
  ) => {
    if (!targetEditor) {
      return;
    }

    const workload = getEditorWorkload(targetEditor.getModel());

    if (!shouldRunInlineDecorations(workload)) {
      clearEditorDecorators(targetEditor, editorType);

      return;
    }

    if (editorType === "original") {
      if (timestampDecoratorsEnabled) {
        updateTimestampDecorations(
          targetEditor,
          originalTimestampDecoratorState,
        );
      }
      if (base64DecoratorsEnabled) {
        updateBase64Decorations(targetEditor, originalBase64DecoratorState);
      }
      if (unicodeDecoratorsEnabled) {
        updateUnicodeDecorations(targetEditor, originalUnicodeDecoratorState);
      }
      if (urlDecoratorsEnabled) {
        updateUrlDecorations(targetEditor, originalUrlDecoratorState);
      }
      if (imageDecoratorsEnabled) {
        updateImageDecorations(targetEditor, originalImageDecoratorState);
      }

      return;
    }

    if (timestampDecoratorsEnabled) {
      updateTimestampDecorations(targetEditor, modifiedTimestampDecoratorState);
    }
    if (base64DecoratorsEnabled) {
      updateBase64Decorations(targetEditor, modifiedBase64DecoratorState);
    }
    if (unicodeDecoratorsEnabled) {
      updateUnicodeDecorations(targetEditor, modifiedUnicodeDecoratorState);
    }
    if (urlDecoratorsEnabled) {
      updateUrlDecorations(targetEditor, modifiedUrlDecoratorState);
    }
    if (imageDecoratorsEnabled) {
      updateImageDecorations(targetEditor, modifiedImageDecoratorState);
    }
  };

  const scheduleEditorInlineDecorationRefresh = (
    targetEditor: editor.IStandaloneCodeEditor | null,
    editorType: "original" | "modified",
    delay = 200,
  ) => {
    if (!targetEditor) {
      return;
    }

    const workload = getEditorWorkload(targetEditor.getModel());

    if (!shouldRunInlineDecorations(workload)) {
      clearEditorDecorators(targetEditor, editorType);
    }

    scheduleInlineDecorationUpdate({
      timeoutRef:
        editorType === "original"
          ? originalInlineDecorationUpdateTimeoutRef
          : modifiedInlineDecorationUpdateTimeoutRef,
      workload,
      delay,
      run: () => runInlineDecorationRefresh(targetEditor, editorType),
    });
  };

  // 创建差异编辑器实例
  async function createDiffEditor() {
    loader.config({ monaco });

    loader.init().then((monacoInstance) => {
      // 确保全局悬停提供者已注册
      ensureProvidersRegistered();

      // 注册 JSON5 语言支持
      if (
        !monacoInstance.languages
          .getLanguages()
          .some((lang) => lang.id === "json5")
      ) {
        monacoInstance.languages.register({ id: "json5" });
        monacoInstance.languages.setMonarchTokensProvider(
          "json5",
          Json5LanguageDef,
        );
      }

      if (editorContainerRef.current) {
        // 创建差异编辑器
        editorRef.current = monacoInstance.editor.createDiffEditor(
          editorContainerRef.current,
          {
            originalEditable: true, // 允许编辑原始文本
            renderSideBySide: true, // 并排显示
            useInlineViewWhenSpaceIsLimited: false, // 当空间有限时使用InlineView
            minimap: {
              enabled: true, // 启用缩略图
            },
            // fontFamily: `${jetbrainsMono.style.fontFamily}, "Arial","Microsoft YaHei","黑体","宋体", sans-serif`, // 字体
            fontSize: fontSize, // 使用状态中的字体大小
            colorDecorators: true, // 颜色装饰器
            readOnly: false, // 是否开启已读功能
            theme: theme || "vs-light", // 主题
            mouseWheelZoom: true, // 启用鼠标滚轮缩放
            formatOnPaste: false, // 粘贴时自动格式化
            formatOnType: false, // 输入时自动格式化
            automaticLayout: true, // 自动布局
            scrollBeyondLastLine: false, // 禁用滚动超出最后一行
            suggestOnTriggerCharacters: true, // 在触发字符时显示建议
            acceptSuggestionOnCommitCharacter: true, // 接受关于提交字符的建议
            acceptSuggestionOnEnter: "smart", // 按Enter键接受建议
            wordWrap: "on", // 自动换行
            autoSurround: "never", // 是否应自动环绕选择
            cursorBlinking: "smooth", // 光标动画样式
            cursorSmoothCaretAnimation: "on", // 是否启用光标平滑插入动画  当你在快速输入文字的时候 光标是直接平滑的移动还是直接"闪现"到当前文字所处位置
            cursorStyle: "line", //  光标样式
            cursorSurroundingLines: 0, // 光标环绕行数 当文字输入超过屏幕时 可以看见右侧滚动条中光标所处位置是在滚动条中间还是顶部还是底部 即光标环绕行数 环绕行数越大 光标在滚动条中位置越居中
            cursorSurroundingLinesStyle: "all", // "default" | "all" 光标环绕样式
            links: false, // 是否点击链接
            diffAlgorithm: "advanced",
          },
        );
        onMount && onMount();

        // 设置模型
        const originalModel = monacoInstance.editor.createModel(
          originalValue,
          language || "json",
        );
        const modifiedModel = monacoInstance.editor.createModel(
          modifiedValue,
          language || "json",
        );

        editorRef.current.setModel({
          original: originalModel,
          modified: modifiedModel,
        });

        // 获取两个编辑器实例
        originalEditorRef.current = editorRef.current.getOriginalEditor();
        modifiedEditorRef.current = editorRef.current.getModifiedEditor();

        // 监听原始编辑器内容变化
        disposableStore.current.add(
          originalEditorRef.current.onDidChangeModelContent((e) => {
            const originalText = originalEditorRef.current!.getValue();

            onUpdateOriginalValue(originalText);

            // 根据行数控制装饰器
            const lineCount = getEditorLineCount(originalEditorRef.current);
            const workload = getEditorWorkload(
              originalEditorRef.current?.getModel(),
            );

            if (lineCount < 3 || !shouldRunInlineDecorations(workload)) {
              // 小于3行时，清空原始编辑器的所有装饰器
              clearEditorDecorators(originalEditorRef.current, "original");
            } else {
              // 更新时间戳装饰器
              if (timestampDecoratorsEnabled) {
                handleTimestampContentChange(
                  e,
                  originalTimestampDecoratorState,
                );
              }

              // 更新Base64下划线装饰器
              if (base64DecoratorsEnabled) {
                handleBase64ContentChange(e, originalBase64DecoratorState);
              }

              // Unicode下划线装饰器
              if (unicodeDecoratorsEnabled) {
                handleUnicodeContentChange(e, originalUnicodeDecoratorState);
              }

              // URL下划线装饰器
              if (urlDecoratorsEnabled) {
                handleUrlContentChange(e, originalUrlDecoratorState);
              }

              // 图片装饰器
              if (imageDecoratorsEnabled) {
                handleImageContentChange(e, originalImageDecoratorState);
              }
            }
          }),
        );

        // 监听修改编辑器内容变化
        disposableStore.current.add(
          modifiedEditorRef.current.onDidChangeModelContent((e) => {
            const modifiedText = modifiedEditorRef.current!.getValue();

            onUpdateModifiedValue && onUpdateModifiedValue(modifiedText);

            // 根据行数控制装饰器
            const lineCount = getEditorLineCount(modifiedEditorRef.current);
            const workload = getEditorWorkload(
              modifiedEditorRef.current?.getModel(),
            );

            if (lineCount < 3 || !shouldRunInlineDecorations(workload)) {
              // 小于3行时，清空修改编辑器的所有装饰器
              clearEditorDecorators(modifiedEditorRef.current, "modified");
            } else {
              // 更新时间戳装饰器
              if (timestampDecoratorsEnabled) {
                handleTimestampContentChange(
                  e,
                  modifiedTimestampDecoratorState,
                );
              }

              // 更新Base64下划线装饰器
              if (base64DecoratorsEnabled) {
                handleBase64ContentChange(e, modifiedBase64DecoratorState);
              }

              // Unicode下划线装饰器
              if (unicodeDecoratorsEnabled) {
                handleUnicodeContentChange(e, modifiedUnicodeDecoratorState);
              }

              // URL下划线装饰器
              if (urlDecoratorsEnabled) {
                handleUrlContentChange(e, modifiedUrlDecoratorState);
              }

              // 图片装饰器
              if (imageDecoratorsEnabled) {
                handleImageContentChange(e, modifiedImageDecoratorState);
              }
            }
          }),
        );

        // 监听滚动事件
        disposableStore.current.add(
          originalEditorRef.current.onDidScrollChange(() => {
            scheduleEditorInlineDecorationRefresh(
              originalEditorRef.current,
              "original",
            );
          }),
        );

        disposableStore.current.add(
          modifiedEditorRef.current.onDidScrollChange(() => {
            scheduleEditorInlineDecorationRefresh(
              modifiedEditorRef.current,
              "modified",
            );
          }),
        );

        // 初始化完成后更新时间戳装饰器
        setTimeout(() => {
          if (originalEditorRef.current && modifiedEditorRef.current) {
            // 检查行数，小于3行时不启用装饰器
            const originalLineCount = getEditorLineCount(
              originalEditorRef.current,
            );
            const modifiedLineCount = getEditorLineCount(
              modifiedEditorRef.current,
            );

            if (timestampDecoratorsEnabled) {
              // 初始化时间戳装饰器
              if (originalLineCount >= 3) {
                updateTimestampDecorations(
                  originalEditorRef.current,
                  originalTimestampDecoratorState,
                );
              }
              if (modifiedLineCount >= 3) {
                updateTimestampDecorations(
                  modifiedEditorRef.current,
                  modifiedTimestampDecoratorState,
                );
              }
            }

            // 初始化Base64下划线装饰器
            if (base64DecoratorsEnabled) {
              // 确保全局状态与本地状态同步
              setBase64ProviderEnabled(base64DecoratorsEnabled);
              setBase64DecorationEnabled(base64DecoratorsEnabled);

              // 初始化装饰器管理器
              if (
                !originalBase64DecorationManagerRef.current &&
                originalEditorRef.current
              ) {
                originalBase64DecorationManagerRef.current =
                  new DecorationManager();
              }
              if (
                !modifiedBase64DecorationManagerRef.current &&
                modifiedEditorRef.current
              ) {
                modifiedBase64DecorationManagerRef.current =
                  new DecorationManager();
              }

              if (originalLineCount >= 3) {
                updateBase64Decorations(
                  originalEditorRef.current,
                  originalBase64DecoratorState,
                );
              }
              if (modifiedLineCount >= 3) {
                updateBase64Decorations(
                  modifiedEditorRef.current,
                  modifiedBase64DecoratorState,
                );
              }
            }

            // 初始化Unicode装饰器
            if (unicodeDecoratorsEnabled) {
              // 确保全局状态与本地状态同步
              setUnicodeProviderEnabled(unicodeDecoratorsEnabled);
              setUnicodeDecorationEnabled(unicodeDecoratorsEnabled);

              // 初始化装饰器管理器
              if (
                !originalUnicodeDecorationManagerRef.current &&
                originalEditorRef.current
              ) {
                originalUnicodeDecorationManagerRef.current =
                  new DecorationManager();
              }
              if (
                !modifiedUnicodeDecorationManagerRef.current &&
                modifiedEditorRef.current
              ) {
                modifiedUnicodeDecorationManagerRef.current =
                  new DecorationManager();
              }

              if (originalLineCount >= 3) {
                updateUnicodeDecorations(
                  originalEditorRef.current,
                  originalUnicodeDecoratorState,
                );
              }
              if (modifiedLineCount >= 3) {
                updateUnicodeDecorations(
                  modifiedEditorRef.current,
                  modifiedUnicodeDecoratorState,
                );
              }
            }

            // 初始化URL装饰器
            if (urlDecoratorsEnabled) {
              // 确保全局状态与本地状态同步
              setUrlProviderEnabled(urlDecoratorsEnabled);
              setUrlDecorationEnabled(urlDecoratorsEnabled);

              // 初始化装饰器管理器
              if (
                !originalUrlDecorationManagerRef.current &&
                originalEditorRef.current
              ) {
                originalUrlDecorationManagerRef.current =
                  new DecorationManager();
              }
              if (
                !modifiedUrlDecorationManagerRef.current &&
                modifiedEditorRef.current
              ) {
                modifiedUrlDecorationManagerRef.current =
                  new DecorationManager();
              }

              if (originalLineCount >= 3) {
                updateUrlDecorations(
                  originalEditorRef.current,
                  originalUrlDecoratorState,
                );
              }
              if (modifiedLineCount >= 3) {
                updateUrlDecorations(
                  modifiedEditorRef.current,
                  modifiedUrlDecoratorState,
                );
              }
            }

            // 初始化图片装饰器
            if (imageDecoratorsEnabled) {
              // 确保全局状态与本地状态同步
              setImageDecorationEnabled(imageDecoratorsEnabled);

              // 初始化装饰器管理器
              if (
                !originalImageDecorationManagerRef.current &&
                originalEditorRef.current
              ) {
                originalImageDecorationManagerRef.current =
                  new DecorationManager();
              }
              if (
                !modifiedImageDecorationManagerRef.current &&
                modifiedEditorRef.current
              ) {
                modifiedImageDecorationManagerRef.current =
                  new DecorationManager();
              }

              // 图片装饰器在行数>=1时就可以启用
              if (originalLineCount >= 1) {
                updateImageDecorations(
                  originalEditorRef.current,
                  originalImageDecoratorState,
                );
              }
              if (modifiedLineCount >= 1) {
                updateImageDecorations(
                  modifiedEditorRef.current,
                  modifiedImageDecoratorState,
                );
              }
            }
          }
        }, 300);
      }
    });
  }

  // 确保编辑器只创建一次
  useEffect(() => {
    // 使用 setTimeout 确保在 React 严格模式下只执行一次
    const timeoutId = setTimeout(() => {
      createDiffEditor();
    }, 0);

    return () => {
      clearTimeout(timeoutId);

      // 统一释放所有 Monaco 事件监听器
      disposableStore.current.dispose();
      if (originalInlineDecorationUpdateTimeoutRef.current) {
        clearTimeout(originalInlineDecorationUpdateTimeoutRef.current);
        originalInlineDecorationUpdateTimeoutRef.current = null;
      }
      if (modifiedInlineDecorationUpdateTimeoutRef.current) {
        clearTimeout(modifiedInlineDecorationUpdateTimeoutRef.current);
        modifiedInlineDecorationUpdateTimeoutRef.current = null;
      }

      // 销毁差异编辑器实例（会同时清理内部模型和子编辑器）
      if (editorRef.current) {
        const originalModel = originalEditorRef.current?.getModel();
        const modifiedModel = modifiedEditorRef.current?.getModel();

        editorRef.current.dispose();
        originalModel?.dispose();
        modifiedModel?.dispose();
        editorRef.current = null;
      }

      originalEditorRef.current = null;
      modifiedEditorRef.current = null;
    };
  }, []); // 空依赖数组确保只在挂载时执行

  // 同步设置到store
  useEffect(() => {
    updateEditorSettings(tabKey, {
      fontSize: fontSize,
      language: currentLanguage,
      indentSize: indentSize,
      timestampDecoratorsEnabled: timestampDecoratorsEnabled,
      base64DecoratorsEnabled: base64DecoratorsEnabled,
      unicodeDecoratorsEnabled: unicodeDecoratorsEnabled,
      urlDecoratorsEnabled: urlDecoratorsEnabled,
      imageDecoratorsEnabled: imageDecoratorsEnabled,
    });
  }, [
    fontSize,
    currentLanguage,
    indentSize,
    timestampDecoratorsEnabled,
    base64DecoratorsEnabled,
    unicodeDecoratorsEnabled,
    urlDecoratorsEnabled,
    imageDecoratorsEnabled,
    tabKey,
    updateEditorSettings,
  ]);

  // 使用useSettingsStore的state更新
  useEffect(() => {
    // 同步全局状态到本地状态
    setBase64DecoratorsEnabled(base64DecoderEnabled);
    // 更新装饰器状态
    if (originalEditorRef.current && modifiedEditorRef.current) {
      setBase64ProviderEnabled(base64DecoderEnabled);
      setBase64DecorationEnabled(base64DecoderEnabled);
      // 检查行数，小于3行时不更新装饰器
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 3) {
        // 更新装饰
        updateBase64Decorations(
          originalEditorRef.current,
          originalBase64DecoratorState,
        );
      }

      if (modifiedLineCount >= 3) {
        // 更新装饰
        updateBase64Decorations(
          modifiedEditorRef.current,
          modifiedBase64DecoratorState,
        );
      }
    }
  }, [base64DecoderEnabled]);

  useEffect(() => {
    // 同步全局状态到本地状态
    setUnicodeDecoratorsEnabled(unicodeDecoderEnabled);
    // 更新装饰器状态
    if (originalEditorRef.current && modifiedEditorRef.current) {
      setUnicodeProviderEnabled(unicodeDecoderEnabled);
      setUnicodeDecorationEnabled(unicodeDecoderEnabled);
      // 检查行数，小于3行时不更新装饰器
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 3) {
        // 更新装饰
        updateUnicodeDecorations(
          originalEditorRef.current,
          originalUnicodeDecoratorState,
        );
      }

      if (modifiedLineCount >= 3) {
        // 更新装饰
        updateUnicodeDecorations(
          modifiedEditorRef.current,
          modifiedUnicodeDecoratorState,
        );
      }
    }
  }, [unicodeDecoderEnabled]);

  useEffect(() => {
    // 同步全局状态到本地状态
    setUrlDecoratorsEnabled(urlDecoderEnabled);
    // 更新装饰器状态
    if (originalEditorRef.current && modifiedEditorRef.current) {
      setUrlProviderEnabled(urlDecoderEnabled);
      setUrlDecorationEnabled(urlDecoderEnabled);
      // 检查行数，小于3行时不更新装饰器
      const originalLineCount = getEditorLineCount(originalEditorRef.current);
      const modifiedLineCount = getEditorLineCount(modifiedEditorRef.current);

      if (originalLineCount >= 3) {
        // 更新装饰
        updateUrlDecorations(
          originalEditorRef.current,
          originalUrlDecoratorState,
        );
      }

      if (modifiedLineCount >= 3) {
        // 更新装饰
        updateUrlDecorations(
          modifiedEditorRef.current,
          modifiedUrlDecoratorState,
        );
      }
    }
  }, [urlDecoderEnabled]);

  const formatEditorAction = (
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>,
  ) => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const editorFormat = (type: MonacoDiffEditorEditorType): boolean => {
    // 暂时关闭自动缩进
    let op = {
      detectIndentation: false,
    };

    originalEditorRef.current?.updateOptions(op);
    modifiedEditorRef.current?.updateOptions(op);

    switch (type) {
      case MonacoDiffEditorEditorType.left:
        formatEditorAction(originalEditorRef);
        break;
      case MonacoDiffEditorEditorType.right:
        formatEditorAction(modifiedEditorRef);
        break;
      case MonacoDiffEditorEditorType.all:
        formatEditorAction(originalEditorRef);
        formatEditorAction(modifiedEditorRef);
        break;
      default:
        console.log("unknown type", type);

        return false;
    }

    setTimeout(() => {
      let op = {
        detectIndentation: true,
      };

      originalEditorRef.current?.updateOptions(op);
      modifiedEditorRef.current?.updateOptions(op);
    }, 50);

    return true;
  };

  // 设置编辑器内容，保留历史, 支持 ctrl + z 撤销
  const setEditorValue = (
    editor: editor.IStandaloneCodeEditor | null,
    jsonText: string,
  ) => {
    if (!editor) {
      return;
    }
    const model = editor.getModel();

    if (!model) {
      return;
    }
    editor.executeEdits("", [
      {
        range: model.getFullModelRange(),
        text: jsonText,
        forceMoveMarkers: true,
      },
    ]);
  };

  // 获取编辑器行数
  const getEditorLineCount = (
    editor: editor.IStandaloneCodeEditor | null,
  ): number => {
    if (!editor) {
      return 0;
    }

    const model = editor.getModel();
    const workload = getEditorWorkload(model);

    if (!shouldRunInlineDecorations(workload)) {
      return 0;
    }

    return model?.getLineCount() || 0;
  };

  // 清空指定编辑器的所有装饰器
  const clearEditorDecorators = (
    editor: editor.IStandaloneCodeEditor | null,
    editorType: "original" | "modified",
  ) => {
    if (!editor) {
      return;
    }

    // 清空时间戳装饰器
    if (editorType === "original") {
      if (originalTimestampDecorationsRef.current) {
        originalTimestampDecorationsRef.current.clear();
      }
    } else {
      if (modifiedTimestampDecorationsRef.current) {
        modifiedTimestampDecorationsRef.current.clear();
      }
    }

    // 清空Base64装饰器
    if (editorType === "original") {
      if (originalBase64DecorationManagerRef.current) {
        originalBase64DecorationManagerRef.current.clearAllDecorations(editor);
      }
    } else {
      if (modifiedBase64DecorationManagerRef.current) {
        modifiedBase64DecorationManagerRef.current.clearAllDecorations(editor);
      }
    }

    // 清空Unicode装饰器
    if (editorType === "original") {
      if (originalUnicodeDecorationManagerRef.current) {
        originalUnicodeDecorationManagerRef.current.clearAllDecorations(editor);
      }
    } else {
      if (modifiedUnicodeDecorationManagerRef.current) {
        modifiedUnicodeDecorationManagerRef.current.clearAllDecorations(editor);
      }
    }

    // 清空URL装饰器
    if (editorType === "original") {
      if (originalUrlDecorationManagerRef.current) {
        originalUrlDecorationManagerRef.current.clearAllDecorations(editor);
      }
    } else {
      if (modifiedUrlDecorationManagerRef.current) {
        modifiedUrlDecorationManagerRef.current.clearAllDecorations(editor);
      }
    }

    // 清空图片装饰器
    if (editorType === "original") {
      if (originalImageDecorationManagerRef.current) {
        originalImageDecorationManagerRef.current.clearAllDecorations(editor);
      }
    } else {
      if (modifiedImageDecorationManagerRef.current) {
        modifiedImageDecorationManagerRef.current.clearAllDecorations(editor);
      }
    }
  };

  const clearEditor = (
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>,
    editorType: "original" | "modified" | "both",
  ) => {
    setEditorValue(editorRef.current, "");

    // 清空装饰器状态
    if (editorType === "original" || editorType === "both") {
      // 清空原始编辑器的装饰器状态
      if (originalTimestampDecorationsRef.current) {
        originalTimestampDecorationsRef.current.clear();
      }
      if (originalTimestampCacheRef.current) {
        originalTimestampCacheRef.current = {};
      }
      if (originalTimestampDecorationIdsRef.current) {
        originalTimestampDecorationIdsRef.current = {};
      }
    }

    if (editorType === "modified" || editorType === "both") {
      // 清空修改后编辑器的装饰器状态
      if (modifiedTimestampDecorationsRef.current) {
        modifiedTimestampDecorationsRef.current.clear();
      }
      if (modifiedTimestampCacheRef.current) {
        modifiedTimestampCacheRef.current = {};
      }
      if (modifiedTimestampDecorationIdsRef.current) {
        modifiedTimestampDecorationIdsRef.current = {};
      }
    }

    // 清空图片装饰器缓存
    if (editorType === "original" || editorType === "both") {
      if (originalImageCacheRef.current) {
        originalImageCacheRef.current = {};
      }
    }

    if (editorType === "modified" || editorType === "both") {
      if (modifiedImageCacheRef.current) {
        modifiedImageCacheRef.current = {};
      }
    }
  };

  const sortEditor = (
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>,
    sort: "asc" | "desc",
  ): boolean => {
    const val = editorRef.current!.getValue();

    if (!val) {
      return false;
    }

    try {
      const jsonObj = parseJson(val);

      setEditorValue(editorRef.current, sortJson(jsonObj, sort));

      return true;
    } catch {
      return false;
    }
  };

  // 复制到剪贴板
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    updateOriginalValue: (value: string) => {
      setEditorValue(originalEditorRef.current, value);
    },
    updateModifiedValue: (value: string) => {
      setEditorValue(modifiedEditorRef.current, value);
    },
    focus: () => {
      if (editorRef.current) {
        originalEditorRef.current?.focus();
      }
    },
    layout: () => {
      if (editorRef.current) {
        editorRef.current.layout();
        originalEditorRef.current?.layout();
        modifiedEditorRef.current?.layout();
      }
    },
    copy: (type) => {
      if (!editorRef.current) {
        return false;
      }

      let val = "";

      if (type === MonacoDiffEditorEditorType.left) {
        val = originalEditorRef.current!.getValue();
      } else if (type === MonacoDiffEditorEditorType.right) {
        val = modifiedEditorRef.current!.getValue();
      }

      copyText(val);
      toast.success("复制成功");

      return true;
    },
    format: (type) => {
      if (type === undefined) {
        return false;
      }

      const ok = editorFormat(type);

      if (!ok) {
        toast.error("格式化失败，请检查JSON格式是否正确");

        return false;
      }
      toast.success("格式化成功");

      return ok;
    },
    clear: (type) => {
      if (!editorRef.current) {
        return false;
      }
      switch (type) {
        case MonacoDiffEditorEditorType.left:
          clearEditor(originalEditorRef, "original");
          break;
        case MonacoDiffEditorEditorType.right:
          clearEditor(modifiedEditorRef, "modified");
          break;
        case MonacoDiffEditorEditorType.all:
          clearEditor(originalEditorRef, "both");
          break;
        default:
          return false;
      }
      toast.success("清空成功");

      return true;
    },
    fieldSort: (type, sort): boolean => {
      if (!editorRef.current || type === undefined || sort === undefined) {
        return false;
      }
      let ok = false;

      switch (type) {
        case MonacoDiffEditorEditorType.left:
          ok = sortEditor(originalEditorRef, sort);
          break;
        case MonacoDiffEditorEditorType.right:
          ok = sortEditor(modifiedEditorRef, sort);
          break;
        case MonacoDiffEditorEditorType.all:
          ok = sortEditor(originalEditorRef, sort);
          ok = sortEditor(modifiedEditorRef, sort);
          break;
        default:
          return false;
      }

      if (!ok) {
        toast.error("JSON格式错误，请检查后重试");

        return false;
      }

      toast.success("排序成功");

      return true;
    },
    toggleTimestampDecorators: (enabled?: boolean) => {
      // 更新状态
      const newState =
        enabled !== undefined ? enabled : !timestampDecoratorsEnabled;

      setTimestampDecoratorsEnabled(newState);

      // 处理原始编辑器装饰器
      let result1 = true;
      let result2 = true;

      if (originalEditorRef.current) {
        result1 = toggleTimestampDecorators(
          originalEditorRef.current,
          originalTimestampDecoratorState,
          newState,
        );
      }

      // 处理修改后编辑器装饰器
      if (modifiedEditorRef.current) {
        result2 = toggleTimestampDecorators(
          modifiedEditorRef.current,
          modifiedTimestampDecoratorState,
          newState,
        );
      }

      return result1 && result2;
    },
    toggleBase64Decorators: (enabled?: boolean) => {
      // 更新状态
      const newState =
        enabled !== undefined ? enabled : !base64DecoratorsEnabled;

      setBase64DecoratorsEnabled(newState);

      return true;
    },
    toggleUnicodeDecorators: (enabled?: boolean) => {
      // 更新状态
      const newState =
        enabled !== undefined ? enabled : !unicodeDecoratorsEnabled;

      setUnicodeDecoratorsEnabled(newState);

      return true;
    },
    toggleUrlDecorators: (enabled?: boolean) => {
      // 更新状态
      const newState = enabled !== undefined ? enabled : !urlDecoratorsEnabled;

      setUrlDecoratorsEnabled(newState);

      return true;
    },
    toggleImageDecorators: (enabled?: boolean) => {
      // 更新状态
      const newState =
        enabled !== undefined ? enabled : !imageDecoratorsEnabled;

      setImageDecoratorsEnabled(newState);

      // 处理原始编辑器装饰器
      let result1 = true;
      let result2 = true;

      if (originalEditorRef.current) {
        result1 = toggleImageDecorators(
          originalEditorRef.current,
          originalImageDecoratorState,
          newState,
        );
      }

      // 处理修改后编辑器装饰器
      if (modifiedEditorRef.current) {
        result2 = toggleImageDecorators(
          modifiedEditorRef.current,
          modifiedImageDecoratorState,
          newState,
        );
      }

      return result1 && result2;
    },
  }));

  // 更新编辑器选项
  const updateEditorOptions = (options: editor.IEditorOptions) => {
    if (editorRef.current) {
      editorRef.current.updateOptions(options);
      originalEditorRef.current?.updateOptions(options);
      modifiedEditorRef.current?.updateOptions(options);
    }
  };
  // 更新编辑器tabSize
  const updateEditorTabSize = (tabSize: number) => {
    if (editorRef.current) {
      let op = {
        tabSize: tabSize,
        detectIndentation: false,
      };

      // @ts-ignore
      // 类型中没有tabSize，但实际有效
      editorRef.current.updateOptions(op);
    }
  };

  return (
    <div ref={rootContainerRef} className="flex flex-col w-full h-full relative" style={{ height }}>
      <div className={cn("w-full h-full overflow-hidden")}>
        <div
          ref={editorContainerRef}
          className="h-full overflow-hidden monaco-editor-container"
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
};

MonacoDiffEditor.displayName = "MonacoDiffEditor";

export default MonacoDiffEditor;
