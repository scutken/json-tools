// useTabStore.ts
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

import { useSettingsStore } from "./useSettingsStore";

import { storage } from "@/lib/indexedDBStore";
import {
  getHistoryContentHash,
  isHistoryContentTooLarge,
} from "@/components/monacoEditor/editorPerformance";

/**
 * Tab 历史记录项
 */
export interface TabHistoryItem {
  key: string; // 历史记录唯一标识
  timestamp: number; // 时间戳
  title: string; // 标题快照
  content: string; // 内容快照
  monacoVersion: number; // 版本号
  truncated?: boolean; // 内容过大时不保存完整快照
  contentLength?: number; // 原始内容长度
  contentHash?: string; // 截断内容的轻量指纹，用于去重
}

export type TabKind = "json";


export interface TabItem {
  kind: TabKind;
  key: string;
  uuid: string; // Tab 的唯一标识符
  title: string;
  content: string;
  diffModifiedValue?: string; // diff 右边比较值
  monacoVersion: number; // 乐观锁
  closable?: boolean;
  history: TabHistoryItem[]; // Tab 历史记录
  editorSettings: {
    fontSize: number;
    language: string;
    indentSize: number; // 缩进大小
    timestampDecoratorsEnabled?: boolean; // 添加时间戳装饰器设置
    base64DecoratorsEnabled?: boolean; // Base64装饰器设置
    unicodeDecoratorsEnabled?: boolean; // Unicode装饰器设置
    urlDecoratorsEnabled?: boolean; // URL装饰器设置
    imageDecoratorsEnabled?: boolean; // 图片装饰器设置
  };
  extraData?: Record<string, any>;
}

interface TabStore {
  tabs: TabItem[];
  activeTabKey: string;
  nextKey: number;
  activeTab: () => TabItem;
  getTabByKey: (key: string) => TabItem | undefined;
  initTab: () => void;
  addTab: (
    title: string | undefined,
    content: string | undefined,
    extraData?: Record<string, any>,
  ) => void;
  setTabContent: (key: string, content: string) => void;
  updateTabContent: (key: string, content: string) => void;
  setTabModifiedValue: (key: string, content: string) => void;
  setMonacoVersion: (key: string, version: number) => void;
  syncTabStore: () => Promise<void>;
  closeTab: (keyToRemove: string) => void;
  setActiveTab: (key: string) => void;
  renameTab: (key: string, newTitle: string) => void;
  closeOtherTabs: (currentKey: string) => Array<string>;
  closeLeftTabs: (currentKey: string) => Array<string>;
  closeRightTabs: (currentKey: string) => Array<string>;
  closeAllTabs: () => Array<string>;
  updateEditorSettings: (
    key: string,
    settings: TabItem["editorSettings"],
  ) => void;
  // 历史记录相关方法
  addTabHistory: (key: string) => void;
  restoreTabHistory: (tabKey: string, historyKey: string) => void;
  deleteTabHistory: (tabKey: string, historyKey: string) => void;
  clearTabHistory: (tabKey: string) => void;
  clearUserData: () => Promise<void>;
}

export const useTabStore = create<TabStore>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
        tabs: [],
        activeTabKey: "1",
        nextKey: 2,
        activeTab: () => {
          const activeTab = get().tabs.find(
            (tab) => tab.key === get().activeTabKey,
          );

          return activeTab || get().tabs[0];
        },
        getTabByKey: (key: string) => get().tabs.find((tab) => tab.key === key),
        addTab: (
          title: string | undefined,
          content: string | undefined,
          extraData?: Record<string, any>,
        ) =>
          set((state) => {
            const settings = useSettingsStore.getState();
            const newTabKey = `${state.nextKey}`;
            const uuid = crypto.randomUUID();
            const newTab: TabItem = {
              kind: "json",
              key: `${state.nextKey}`,
              uuid,
              title: title ? title : `New Tab ${newTabKey}`,
              content: content ? content : ``,
              closable: true,
              monacoVersion: 1,
              history: [],
              extraData: extraData,
              editorSettings: {
                fontSize: 14,
                language: "json",
                indentSize: settings.defaultIndentSize,
                timestampDecoratorsEnabled: true,
                base64DecoratorsEnabled: true,
                unicodeDecoratorsEnabled: true,
                urlDecoratorsEnabled: true,
                imageDecoratorsEnabled: true,
              },
            };

            return {
              tabs: [...state.tabs, newTab],
              activeTabKey: newTabKey,
              nextKey: state.nextKey + 1,
            };
          }),
        initTab: () => {
          set((state) => {
            const settings = useSettingsStore.getState();
            const defaultTab = {
              kind: "json" as const,
              key: "1",
              uuid: crypto.randomUUID(),
              title: "New Tab 1",
              content: ``,
              closable: true,
              monacoVersion: 0,
              history: [],
              editorSettings: {
                fontSize: 14,
                language: "json",
                indentSize: settings.defaultIndentSize,
                timestampDecoratorsEnabled: true,
                base64DecoratorsEnabled: true,
                unicodeDecoratorsEnabled: true,
                urlDecoratorsEnabled: true,
                imageDecoratorsEnabled: true,
              },
            };
            const tabs = [defaultTab];

            return {
              ...state,
              tabs,
              activeTabKey: "1",
              nextKey: 2,
            };
          });
        },
        setMonacoVersion: (key: string, version: number) =>
          set((state) => {
            const updatedTabs = state.tabs.map((tab) =>
              tab.key === key
                ? {
                    ...tab,
                    monacoVersion: version,
                  }
                : tab,
            );

            return { tabs: updatedTabs };
          }),
        setTabContent: (key, content) =>
          set((state) => {
            const updatedTabs = state.tabs.map((tab) => {
              if (tab.key === key) {
                const updatedTab = {
                  ...tab,
                  content,
                  monacoVersion: tab.monacoVersion + 1,
                };

                // 触发历史记录（不阻塞状态更新）
                setTimeout(() => recordTabHistory(updatedTab), 0);

                return updatedTab;
              }
              return tab;
            });

            return { tabs: updatedTabs };
          }),
        updateTabContent: (key, content) =>
          set((state) => {
            const updatedTabs = state.tabs.map((tab) => {
              if (tab.key === key) {
                const updatedTab = {
                  ...tab,
                  content,
                  monacoVersion: tab.monacoVersion + 1,
                };

                // 触发历史记录（不阻塞状态更新）
                setTimeout(() => recordTabHistory(updatedTab), 0);

                return updatedTab;
              }
              return tab;
            });

            return { tabs: updatedTabs };
          }),
        setTabModifiedValue: (key, content) =>
          set((state) => {
            const updatedTabs = state.tabs.map((tab) =>
              tab.key === key
                ? {
                    ...tab,
                    diffModifiedValue: content,
                    monacoVersion: ++tab.monacoVersion,
                  }
                : tab,
            );

            return { tabs: updatedTabs };
          }),
        // 从存储同步数据
        syncTabStore: async () => {
          // 检查是否启用了数据持久化
          const settings = useSettingsStore.getState();
          if (!settings.persistentDataEnabled) {
            // 如果禁用了持久化，初始化干净的标签页
            get().initTab();
            return;
          }

          const tabs = await storage.getItem<PersistedTabItem[]>('tabs');
          const activeTabKey = await storage.getItem<string>('tabs_active_key');
          const nextKey = await storage.getItem<number>('tabs_next_key');
          const data: Record<string, any> = {};

          if (tabs) {
            const normalizedTabs = normalizePersistedTabs(tabs);

            if (normalizedTabs.length === 0) {
              get().initTab();

              return;
            }

            data.tabs = normalizedTabs;

            data.activeTabKey = repairActiveTabKey(normalizedTabs, activeTabKey);
          } else {
            get().initTab();
            return;
          }

          data.nextKey = repairNextTabKey(data.tabs, nextKey);

          set({
            ...data,
          });
        },
        renameTab: (key: string, newTitle: string) =>
          set((state) => {
            // 不允许重命名为空
            if (!newTitle.trim()) return state;

            const updatedTabs = state.tabs.map((tab) =>
              tab.key === key ? { ...tab, title: newTitle.trim() } : tab,
            );

            return { tabs: updatedTabs };
          }),
        closeTab: (keyToRemove) => {
          if (get().tabs.length === 1) {
            get().closeAllTabs();

            return;
          }

          set((state) => {
            const tabIndex = state.tabs.findIndex(
              (tab) => tab.key === keyToRemove,
            );

            const updatedTabs = state.tabs.filter(
              (tab) => tab.key !== keyToRemove,
            );

            let newActiveTab = state.activeTabKey;

            if (keyToRemove === state.activeTabKey && state.tabs.length > 1) {
              if (tabIndex - 1 < 0) {
                newActiveTab = state.tabs[tabIndex + 1].key;
              } else {
                newActiveTab = state.tabs[tabIndex - 1].key;
              }
            }

            return { tabs: updatedTabs, activeTabKey: newActiveTab };
          });
        },
        setActiveTab: (key) => set({ activeTabKey: key }),
        // 关闭其他标签页
        closeOtherTabs: (currentKey): Array<string> => {
          const currentTab = get().tabs.find((tab) => tab.key === currentKey);
          // 将被关闭的key 保存
          const closedTabs = get().tabs.filter((tab) => tab.key !== currentKey);

          const closedKeys = closedTabs.map((tab) => tab.key);

          set(() => {
            return {
              tabs: currentTab ? [currentTab] : [],
              activeTabKey: currentKey,
            };
          });

          return closedKeys;
        },

        // 关闭左侧标签页
        closeLeftTabs: (currentKey): Array<string> => {
          const tabs = get().tabs;
          const currentIndex = tabs.findIndex((tab) => tab.key === currentKey);
          // 将被关闭的key 保存
          const closedTabs = tabs.slice(0, currentIndex);
          const closedKeys = closedTabs.map((tab) => tab.key);
          const updatedTabs = tabs.slice(currentIndex);

          set(() => {
            return {
              tabs: updatedTabs,
              activeTabKey: currentKey,
            };
          });

          return closedKeys;
        },

        // 关闭右侧标签页
        closeRightTabs: (currentKey): Array<string> => {
          const tabs = get().tabs;
          const currentIndex = tabs.findIndex((tab) => tab.key === currentKey);
          // 将被关闭的key 保存
          const closedTabs = tabs.slice(currentIndex + 1);
          const closedKeys = closedTabs.map((tab) => tab.key);

          const updatedTabs = tabs.slice(0, currentIndex + 1);

          set(() => {
            return {
              tabs: updatedTabs,
              activeTabKey: currentKey,
            };
          });

          return closedKeys;
        },
        // 关闭所有标签页，默认保留第一个标签页
        closeAllTabs: (): Array<string> => {
          // 将被关闭的key 保存, 保留key = 1 的标签页
          const closedTabs = get().tabs.filter((tab) => tab.key !== "1");
          const closedKeys = closedTabs.map((tab) => tab.key);

          set(() => {
            const settings = useSettingsStore.getState();
            const defaultTab = {
              kind: "json" as const,
              key: "1",
              uuid: crypto.randomUUID(),
              title: "New Tab 1",
              content: "",
              closable: true,
              monacoVersion: 0,
              history: [],
              editorSettings: {
                fontSize: 14,
                language: "json",
                indentSize: settings.defaultIndentSize,
                timestampDecoratorsEnabled: true,
                base64DecoratorsEnabled: true,
                unicodeDecoratorsEnabled: true,
                urlDecoratorsEnabled: true,
                imageDecoratorsEnabled: true,
              },
            };

            return {
              tabs: [defaultTab],
              activeTabKey: "1",
              nextKey: 2,
            };
          });

          return closedKeys;
        },
        updateEditorSettings: (
          key: string,
          settings: TabItem["editorSettings"],
        ) =>
          set((state) => {
            const updatedTabs = state.tabs.map((tab) =>
              tab.key === key
                ? {
                    ...tab,
                    editorSettings: {
                      ...tab.editorSettings,
                      ...settings,
                    },
                  }
                : tab,
            );

            return { tabs: updatedTabs };
          }),
        // 添加历史记录（手动触发）
        addTabHistory: (key: string) => {
          const tab = get().getTabByKey(key);
          if (!tab) return;

          recordTabHistory(tab);
        },
        // 恢复历史记录
        restoreTabHistory: (tabKey: string, historyKey: string) => {
          const tab = get().getTabByKey(tabKey);
          if (!tab) {
            console.error('[历史记录] Tab 不存在:', tabKey);
            return;
          }

          const historyItem = tab.history.find((h) => h.key === historyKey);
          if (!historyItem) {
            console.error('[历史记录] 历史记录不存在:', historyKey);
            return;
          }

          console.log('[历史记录] 恢复历史:', {
            tabKey,
            historyKey,
            currentTitle: tab.title,
            historyTitle: historyItem.title,
            currentMonacoVersion: tab.monacoVersion,
            historyMonacoVersion: historyItem.monacoVersion,
          });

          set((state) => {
            // 检查是否有重复的 tab.key
            const duplicateKeys = state.tabs
              .map(t => t.key)
              .filter((k, i, arr) => arr.indexOf(k) !== i);

            if (duplicateKeys.length > 0) {
              console.error('[历史记录] 发现重复的 tab.key:', duplicateKeys);
            }

            return {
              tabs: state.tabs.map((t) => {
                if (t.key === tabKey) {
                  if (historyItem.truncated) {
                    console.warn('[历史记录] 历史内容过大，跳过内容恢复:', {
                      tabKey,
                      historyKey,
                      contentLength: historyItem.contentLength,
                    });

                    return {
                      ...t,
                      title: historyItem.title,
                    };
                  }

                  // 保持当前版本号，只恢复内容，避免版本号回退导致问题
                  return {
                    ...t,
                    title: historyItem.title,
                    content: historyItem.content,
                    // 不恢复 monacoVersion，保持当前版本号
                  };
                }
                return t;
              }),
            };
          });

          console.log('[历史记录] 恢复完成，新的 tabs:', get().tabs.map(t => ({ key: t.key, title: t.title })));
        },
        // 删除指定历史记录
        deleteTabHistory: (tabKey: string, historyKey: string) => {
          set((state) => ({
            tabs: state.tabs.map((t) => {
              if (t.key === tabKey) {
                return {
                  ...t,
                  history: t.history.filter((h) => h.key !== historyKey),
                };
              }
              return t;
            }),
          }));
        },
        // 清空 Tab 的所有历史记录
        clearTabHistory: (tabKey: string) => {
          set((state) => ({
            tabs: state.tabs.map((t) => {
              if (t.key === tabKey) {
                return { ...t, history: [] };
              }
              return t;
            }),
          }));
        },
        // 清除用户数据
        clearUserData: async () => {
          try {
            // 清除用户数据相关的存储键
            await storage.removeItem(DB_TABS);
            await storage.removeItem(DB_TAB_ACTIVE_KEY);
            await storage.removeItem(DB_TAB_NEXT_KEY);

            console.log('用户数据已清除');
          } catch (error) {
            console.error('清除用户数据失败:', error);
            throw error;
          }
        },
      }),
      { name: "tabStore", enabled: true },
    ),
  ),
);

const DB_TABS = "tabs";
const DB_TAB_ACTIVE_KEY = "tabs_active_key";
const DB_TAB_NEXT_KEY = "tabs_next_key";

type PersistedHistoryItem = Partial<TabHistoryItem> & { vanilla?: unknown };

export type PersistedTabItem = Partial<Omit<TabItem, "kind" | "history">> & {
  kind?: string;
  history?: PersistedHistoryItem[];
  vanilla?: unknown;
  vanillaVersion?: unknown;
  vanillaMode?: unknown;
};

const normalizePersistedHistoryItem = (
  historyItem: PersistedHistoryItem,
): TabHistoryItem => ({
  key:
    typeof historyItem.key === "string"
      ? historyItem.key
      : `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  timestamp:
    typeof historyItem.timestamp === "number" ? historyItem.timestamp : Date.now(),
  title: typeof historyItem.title === "string" ? historyItem.title : "",
  content: typeof historyItem.content === "string" ? historyItem.content : "",
  monacoVersion:
    typeof historyItem.monacoVersion === "number"
      ? historyItem.monacoVersion
      : 0,
  truncated:
    typeof historyItem.truncated === "boolean" ? historyItem.truncated : undefined,
  contentLength:
    typeof historyItem.contentLength === "number"
      ? historyItem.contentLength
      : undefined,
  contentHash:
    typeof historyItem.contentHash === "string"
      ? historyItem.contentHash
      : undefined,
});

export const normalizePersistedTab = (tab: PersistedTabItem): TabItem | null => {
  if (tab.kind && tab.kind !== "json") {
    return null;
  }

  if (typeof tab.key !== "string" || !tab.key) {
    return null;
  }

  const editorSettings = tab.editorSettings as
    | Partial<TabItem["editorSettings"]>
    | undefined;

  return {
    kind: "json",
    key: tab.key,
    uuid: typeof tab.uuid === "string" ? tab.uuid : crypto.randomUUID(),
    title: typeof tab.title === "string" ? tab.title : `New Tab ${tab.key}`,
    content: typeof tab.content === "string" ? tab.content : "",
    diffModifiedValue:
      typeof tab.diffModifiedValue === "string" ? tab.diffModifiedValue : undefined,
    monacoVersion:
      typeof tab.monacoVersion === "number" ? tab.monacoVersion : 0,
    closable: typeof tab.closable === "boolean" ? tab.closable : true,
    history: Array.isArray(tab.history)
      ? tab.history.map(normalizePersistedHistoryItem)
      : [],
    editorSettings: {
      fontSize:
        typeof editorSettings?.fontSize === "number" ? editorSettings.fontSize : 14,
      language:
        typeof editorSettings?.language === "string" ? editorSettings.language : "json",
      indentSize:
        typeof editorSettings?.indentSize === "number"
          ? editorSettings.indentSize
          : useSettingsStore.getState().defaultIndentSize,
      timestampDecoratorsEnabled: editorSettings?.timestampDecoratorsEnabled,
      base64DecoratorsEnabled: editorSettings?.base64DecoratorsEnabled,
      unicodeDecoratorsEnabled: editorSettings?.unicodeDecoratorsEnabled,
      urlDecoratorsEnabled: editorSettings?.urlDecoratorsEnabled,
      imageDecoratorsEnabled: editorSettings?.imageDecoratorsEnabled,
    },
    extraData: tab.extraData,
  };
};

export const normalizePersistedTabs = (tabs: PersistedTabItem[]): TabItem[] =>
  tabs
    .map(normalizePersistedTab)
    .filter((tab): tab is TabItem => tab !== null);

export const repairActiveTabKey = (
  tabs: Pick<TabItem, "key">[],
  activeTabKey?: string | null,
): string => {
  if (activeTabKey && tabs.some((tab) => tab.key === activeTabKey)) {
    return activeTabKey;
  }

  return tabs[0]?.key || "1";
};

export const repairNextTabKey = (
  tabs: Pick<TabItem, "key">[],
  persistedNextKey?: number | null,
): number => {
  const nextFromTabs = Math.max(...tabs.map((tab) => Number(tab.key) || 0), 0) + 1;

  if (typeof persistedNextKey === "number" && persistedNextKey > 0) {
    return Math.max(persistedNextKey, nextFromTabs);
  }

  return nextFromTabs;
};

let tabsSaveTimeout: NodeJS.Timeout;
let tabActiveSaveTimeout: NodeJS.Timeout;
const timeout = 2000;

// 历史记录最大保存数量
const MAX_HISTORY_COUNT = 50;

// 历史记录防抖
const historyRecordTimeouts: Record<string, NodeJS.Timeout> = {};

// 记录历史的辅助函数
const recordTabHistory = (tab: TabItem) => {
  console.log('[历史记录] 准备记录历史:', tab.key, tab.title);

  // 清除之前的定时器
  if (historyRecordTimeouts[tab.key]) {
    clearTimeout(historyRecordTimeouts[tab.key]);
  }

  // 延迟记录，避免频繁记录
  historyRecordTimeouts[tab.key] = setTimeout(() => {
    const currentTab = useTabStore.getState().getTabByKey(tab.key);
    if (!currentTab) {
      console.log('[历史记录] Tab 不存在，跳过记录');
      return;
    }

    // 检查最新历史记录，避免重复
    const latestHistory = currentTab.history[0];
    const contentLength = currentTab.content.length;
    const truncated = isHistoryContentTooLarge(currentTab.content);
    const contentHash = truncated
      ? getHistoryContentHash(currentTab.content)
      : undefined;

    if (latestHistory) {
      const contentChanged =
        truncated || latestHistory.truncated
          ? latestHistory.contentLength !== contentLength ||
            latestHistory.contentHash !== contentHash
          : latestHistory.content !== currentTab.content;
      const titleChanged = latestHistory.title !== currentTab.title;

      // 如果内容和标题都没变化，不记录
      if (!contentChanged && !titleChanged) {
        console.log('[历史记录] 内容未变化，跳过记录');
        return;
      }
    }

    console.log('[历史记录] 记录新的历史:', currentTab.key, currentTab.history.length + 1);

    // 创建新的历史记录（使用更精确的时间戳确保唯一性）
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const newHistoryItem: TabHistoryItem = {
      key: `history_${timestamp}_${randomSuffix}_${currentTab.uuid}`,
      timestamp: timestamp,
      title: currentTab.title,
      content: truncated
        ? `[历史内容过大，已跳过完整快照，原始长度 ${contentLength} 字符]`
        : currentTab.content,
      monacoVersion: currentTab.monacoVersion,
      truncated,
      contentLength,
      contentHash,
    };

    // 更新 tab 的历史记录
    useTabStore.setState((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.key === currentTab.key) {
          // 限制历史记录数量，最多保存50条
          const history = [newHistoryItem, ...t.history].slice(0, MAX_HISTORY_COUNT);
          console.log('[历史记录] 历史记录已保存，总数:', history.length);
          return { ...t, history };
        }
        return t;
      }),
    }));
  }, 1000); // 延迟 1 秒记录
};

useTabStore.subscribe(
  (state) => state.tabs,
  (tabs) => {

    // 检查是否启用了数据持久化
    const persistentDataEnabled = useSettingsStore.getState().persistentDataEnabled;
    if (!persistentDataEnabled) {
      // 如果禁用了持久化，不保存数据
      return;
    }

    clearTimeout(tabsSaveTimeout);
    tabsSaveTimeout = setTimeout(async () => {
      await storage.setItem(DB_TABS, tabs);
      // storageManager 内部会自动广播,无需手动调用
    }, timeout);
  },
);

useTabStore.subscribe(
  (state) => [state.activeTabKey, state.nextKey],
  (arr) => {

    // 检查是否启用了数据持久化
    const persistentDataEnabled = useSettingsStore.getState().persistentDataEnabled;
    if (!persistentDataEnabled) {
      // 如果禁用了持久化，不保存数据
      return;
    }

    clearTimeout(tabActiveSaveTimeout);
    tabActiveSaveTimeout = setTimeout(async () => {
      await storage.setItem(DB_TAB_ACTIVE_KEY, arr[0]);
      await storage.setItem(DB_TAB_NEXT_KEY, arr[1]);
    }, timeout);
  },
);

