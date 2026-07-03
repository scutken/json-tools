import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@heroui/react";
import { useTheme } from "next-themes";
import { ThemeSwitch } from "@/components/button/ThemeSwitch";
import { useNavigate } from "react-router-dom";

import { useTabStore } from "@/store/useTabStore";
import DynamicTabs, {
  DynamicTabsRef,
} from "@/components/dynamicTabs/DynamicTabs.tsx";
import WorkbenchHeader from "@/components/workbench/WorkbenchHeader";
import WorkbenchBottomBar from "@/components/workbench/WorkbenchBottomBar";
import MonacoJsonEditor, {
  MonacoJsonEditorRef,
} from "@/components/monacoEditor/MonacoJsonEditor.tsx";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useMonacoInit } from "@/components/monacoEditor/useMonacoInit.ts";
import MonacoDiffEditor, {
  MonacoDiffEditorRef,
} from "@/components/monacoEditor/MonacoDiffEditor.tsx";
import MonacoDiffOperationBar from "@/components/monacoEditor/operationBar/MonacoDiffOperationBar.tsx";
import MonacoOperationBar from "@/components/monacoEditor/operationBar/MonacoOperationBar.tsx";
import "@/styles/index.css";
import { SidebarKeys } from "@/components/sidebar/Items.tsx";
import JsonTableView, {
  JsonTableViewRef,
} from "@/components/jsonTable/JsonTableView.tsx";
import TabHistoryModal from "@/components/tabHistory/TabHistoryModal.tsx";
import clipboard from "@/utils/clipboard";
import toast from "@/utils/toast";
import { stringifyJson } from "@/utils/json";
import UtoolsListener from "@/services/utoolsListener";

export default function IndexPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const monacoReady = useMonacoInit();
  const monacoJsonEditorRefs = useRef<Record<string, MonacoJsonEditorRef>>({});
  const monacoDiffEditorRefs = useRef<Record<string, MonacoDiffEditorRef>>({});
  // 添加JsonTableView的引用
  const jsonTableViewRefs = useRef<Record<string, JsonTableViewRef>>({});

  // 历史记录弹窗状态
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isJsonQueryVisible, setJsonQueryVisible] = useState(false);
  const [isValidationEnabled, setIsValidationEnabled] = useState(true);

  const {
    tabs,
    activeTabKey,
    activeTab,
    getTabByKey,
    setTabContent,
    setTabModifiedValue,
    syncTabStore,
    restoreTabHistory,
    deleteTabHistory,
    clearTabHistory,
  } = useTabStore();

  const sidebarStore = useSidebarStore();
  const tabRef = useRef<DynamicTabsRef>(null);
  const [isTabStoreReady, setIsTabStoreReady] = useState(false);

  const monacoUpdateContentTimeoutId = useRef<Record<string, NodeJS.Timeout>>(
    {},
  );

  // 使用Map来分别存储每种编辑器类型的加载状态
  const [loadedEditors, setLoadedEditors] = useState<{
    monaco: Set<string>;
    diff: Set<string>;
    table: Set<string>;
  }>({
    monaco: new Set(),
    diff: new Set(),
    table: new Set(),
  });

  // LRU 淘汰：跟踪每种编辑器类型的标签页访问顺序（最近访问在前）
  const lruOrder = useRef<Record<string, string[]>>({
    monaco: [],
    diff: [],
    table: [],
  });

  /** 单种编辑器类型最多同时存活的实例数 */
  const MAX_EDITOR_INSTANCES = 5;

  /**
   * 将 key 标记为最近访问，并淘汰超出上限的最久未访问的标签页
   * @returns 需要被卸载的 tab keys
   */
  const touchAndEvict = (editorType: string, key: string): string[] => {
    const order = lruOrder.current[editorType];
    // 移到最前面
    const idx = order.indexOf(key);
    if (idx !== -1) order.splice(idx, 1);
    order.unshift(key);

    // 淘汰超出上限的
    if (order.length > MAX_EDITOR_INSTANCES) {
      const evicted = order.splice(MAX_EDITOR_INSTANCES);
      return evicted;
    }
    return [];
  };

  const closeTabHandle = (keys: string[]) => {
    if (keys.length === 0) {
      return;
    }
    // 删除 monacoJsonEditorRefs 中对象
    keys.forEach((key) => {
      delete monacoJsonEditorRefs.current[key];
      delete monacoDiffEditorRefs.current[key];
      delete jsonTableViewRefs.current[key];

      // 清理 LRU 记录
      for (const type of Object.keys(lruOrder.current)) {
        lruOrder.current[type] = lruOrder.current[type].filter(
          (k) => k !== key,
        );
      }
    });

    // 删除 loadedEditors 中对象
    setLoadedEditors((prev) => ({
      ...prev,
      monaco: new Set([...prev.monaco].filter((key) => !keys.includes(key))),
      diff: new Set([...prev.diff].filter((key) => !keys.includes(key))),
      table: new Set([...prev.table].filter((key) => !keys.includes(key))),
    }));
  };

  // MonacoJsonEditor 更新内容后同步
  const monacoEditorUpdateContent = (key: string, content: string) => {
    clearTimeout(monacoUpdateContentTimeoutId.current[key]);
    monacoUpdateContentTimeoutId.current[key] = setTimeout(() => {
      setTabContent(key, content);
    }, 0);
  };

  const [editorLoading, setEditorLoading] = useState<{
    [key: string]: boolean;
  }>({});

  const renderMonacoJsonEditor = () => {
    return (
      <div className="editor-container flex-grow overflow-hidden">
          {tabs
            .filter((tab) => tab.kind === "json")
            .map((tab) => {
            // 如果已加载过该 tab，或者该 tab 恰好为当前激活 tab，则渲染
            const shouldRender = loadedEditors.monaco.has(tab.key);
            const isVisible = tab.key === activeTabKey;

            // 如果当前 tab 未加载且正是 activeTab，则将其加入 loaded 集合
            if (!shouldRender && isVisible) {
              // LRU 淘汰：移除最久未使用的编辑器实例
              const evicted = touchAndEvict("monaco", tab.key);
              const newMonacoSet = new Set([...loadedEditors.monaco, tab.key]);
              for (const evictedKey of evicted) {
                newMonacoSet.delete(evictedKey);
                delete monacoJsonEditorRefs.current[evictedKey];
              }
              setLoadedEditors((prev) => ({
                ...prev,
                monaco: newMonacoSet,
              }));
            } else if (shouldRender && isVisible) {
              // 已加载但切换到此 tab，更新 LRU 顺序
              touchAndEvict("monaco", tab.key);
            }

            // 保持一个包裹容器常驻 DOM
            // 如果 shouldRender 为 true 才真正挂载编辑器，否则空占位
            return (
              <div
                key={tab.key}
                className={cn(
                  "editor-wrapper w-full h-full",
                  "editor-transition",
                  isVisible && "visible",
                  !editorLoading[tab.key] && "loaded",
                )}
              >
                {shouldRender && (
                  <MonacoJsonEditor
                    key={tab.key}
                    ref={(ref) => {
                      if (ref) {
                        monacoJsonEditorRefs.current[tab.key] = ref;
                      }
                    }}
                    height="100%"
                    isMenu={false}
                    language={tab.editorSettings?.language || "json"}
                    minimap={true}
                    showJsonQueryFilter={isJsonQueryVisible}
                    validationEnabled={isValidationEnabled}
                    tabKey={tab.key}
                    tabTitle={tab.title}
                    theme={theme === "dark" ? "vs-dark" : "vs-light"}
                    value={tab.content}
                    onMount={() => {
                      setEditorLoading((prev) => ({
                        ...prev,
                        [tab.key]: false,
                      }));
                    }}
                    onUpdateValue={(value) => {
                      monacoEditorUpdateContent(tab.key, value);
                    }}
                  />
                )}
              </div>
            );
            })}
      </div>
    );
  };

  // MonacoDiffEditor 渲染函数
  const renderMonacoDiffEditor = () => {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="editor-container flex-grow overflow-hidden">
          {tabs
            .filter((tab) => tab.kind === "json")
            .map((tab) => {
            const shouldRender = loadedEditors.diff.has(tab.key);
            const isVisible = tab.key === activeTabKey;

            if (!shouldRender && isVisible) {
              const evicted = touchAndEvict("diff", tab.key);
              const newDiffSet = new Set([...loadedEditors.diff, tab.key]);
              for (const evictedKey of evicted) {
                newDiffSet.delete(evictedKey);
                delete monacoDiffEditorRefs.current[evictedKey];
              }
              setLoadedEditors((prev) => ({
                ...prev,
                diff: newDiffSet,
              }));
            } else if (shouldRender && isVisible) {
              touchAndEvict("diff", tab.key);
            }

            return (
              <div
                key={"diff" + tab.key}
                className={cn(
                  "editor-wrapper w-full h-full",
                  "editor-transition",
                  isVisible && "visible",
                  !editorLoading[tab.key] && "loaded",
                )}
              >
                {shouldRender && (
                  <MonacoDiffEditor
                    key={"diff" + tab.key}
                    ref={(ref) => {
                      if (ref) {
                        monacoDiffEditorRefs.current[tab.key] = ref;
                      }
                    }}
                    height="100%"
                    language={tab.editorSettings?.language || "json"}
                    modifiedValue={
                      tab.diffModifiedValue ? tab.diffModifiedValue : ""
                    }
                    originalValue={tab.content}
                    tabKey={tab.key}
                    tabTitle={tab.title}
                    theme={theme === "dark" ? "vs-dark" : "vs-light"}
                    onMount={() => {
                      setEditorLoading((prev) => ({
                        ...prev,
                        [tab.key]: false,
                      }));
                    }}
                    onUpdateModifiedValue={(value) => {
                      setTabModifiedValue(tab.key, value);
                    }}
                    onUpdateOriginalValue={(value) => {
                      monacoEditorUpdateContent(tab.key, value);
                    }}
                  />
                )}
              </div>
            );
            })}
        </div>
      </div>
    );
  };

  // 通过菜单栏的 activeKey 渲染编辑器
  const renderEditor = () => {
    switch (sidebarStore.activeKey) {
      case SidebarKeys.textView:
        return monacoReady ? renderMonacoJsonEditor() : null;
      case SidebarKeys.diffView:
        return monacoReady ? renderMonacoDiffEditor() : null;
      case SidebarKeys.tableView:
        return renderJsonTableView();
      default:
        return <div>404</div>;
    }
  };

  // tab 切换时同步数据
  const tabSwitchHandle = () => {
    const currentTab = activeTab();

    if (!currentTab || currentTab.kind !== "json") {
      return;
    }

    switch (sidebarStore.clickSwitchKey) {
      case SidebarKeys.textView:
        monacoJsonEditorRefs.current[currentTab.key]?.updateValue(
          currentTab.content,
        );
        break;
      case SidebarKeys.diffView:
        monacoDiffEditorRefs.current[currentTab.key]?.updateOriginalValue(
          currentTab.content,
        );
        break;
      case SidebarKeys.tableView:
        break;
    }

    // tab 切换时触发校验
    if (
      sidebarStore.clickSwitchKey == SidebarKeys.textView &&
      isValidationEnabled
    ) {
      setTimeout(() => {
        monacoJsonEditorRefs.current[currentTab.key]?.validate();
      }, 500);
    }
  };

  // url 刷新时同步数据同步数据
  const urlRefreshHandle = (key: string) => {
    const currentTab = getTabByKey(key);

    if (!currentTab || currentTab.kind !== "json") {
      return;
    }

    switch (sidebarStore.clickSwitchKey) {
      case SidebarKeys.textView:
        monacoJsonEditorRefs.current[currentTab.key]?.updateValue(
          activeTab().content,
        );
        break;
      case SidebarKeys.diffView:
        monacoDiffEditorRefs.current[currentTab.key]?.updateOriginalValue(
          activeTab().content,
        );
        break;
      case SidebarKeys.tableView:
        break;
    }
  };

  useLayoutEffect(() => {
    const init = async () => {
      // 先同步设置数据到 store
      await useSettingsStore.getState().syncSettingsStore();

      // 同步标签页数据
      await syncTabStore();
      setIsTabStoreReady(true);
    };

    init();
  }, []);

  useEffect(() => {
    // 设置 UtoolsListener 的编辑器引用
    UtoolsListener.getInstance().setEditorRefs(monacoJsonEditorRefs.current);
  }, [monacoJsonEditorRefs]);

  useEffect(() => {
    // 在切换标签时预加载下一个编辑器
    if (activeTabKey) {
      const currentTab = getTabByKey(activeTabKey);

      if (!currentTab || currentTab.kind !== "json") {
        return;
      }

      // 设置新标签页的加载状态
      setEditorLoading((prev) => ({
        ...prev,
        [activeTabKey]: true,
      }));

      // 预加载相邻的标签页
      const currentIndex = tabs.findIndex((tab) => tab.key === activeTabKey);
      const preloadIndexes = [currentIndex - 1, currentIndex + 1].filter(
        (index) => index >= 0 && index < tabs.length,
      );

      preloadIndexes.forEach((index) => {
        const tab = tabs[index];

        if (!tab) {
          return;
        }

        switch (sidebarStore.activeKey) {
          case SidebarKeys.textView: {
            const evicted = touchAndEvict("monaco", tab.key);
            const newSet = new Set([...loadedEditors.monaco, tab.key]);
            for (const evictedKey of evicted) {
              newSet.delete(evictedKey);
              delete monacoJsonEditorRefs.current[evictedKey];
            }
            setLoadedEditors((prev) => ({ ...prev, monaco: newSet }));
            // 焦点切换到当前激活的 tab
            if (monacoJsonEditorRefs.current[activeTabKey]) {
              monacoJsonEditorRefs.current[activeTabKey].layout();
              monacoJsonEditorRefs.current[activeTabKey].focus();
            }
            break;
          }
          case SidebarKeys.diffView: {
            const evicted = touchAndEvict("diff", tab.key);
            const newSet = new Set([...loadedEditors.diff, tab.key]);
            for (const evictedKey of evicted) {
              newSet.delete(evictedKey);
              delete monacoDiffEditorRefs.current[evictedKey];
            }
            setLoadedEditors((prev) => ({ ...prev, diff: newSet }));
            // 焦点切换到当前激活的 tab
            if (monacoDiffEditorRefs.current[activeTabKey]) {
              monacoDiffEditorRefs.current[activeTabKey].layout();
              monacoDiffEditorRefs.current[activeTabKey].focus();
            }
            break;
          }
          case SidebarKeys.tableView: {
            const evicted = touchAndEvict("table", tab.key);
            const newSet = new Set([...loadedEditors.table, tab.key]);
            for (const evictedKey of evicted) {
              newSet.delete(evictedKey);
              delete jsonTableViewRefs.current[evictedKey];
            }
            setLoadedEditors((prev) => ({ ...prev, table: newSet }));
            break;
          }
        }
      });
    }
  }, [activeTabKey]);

  // 切换视图时同步数据
  useEffect(() => {
    tabSwitchHandle();
    sidebarStore.switchActiveKey();
  }, [sidebarStore.clickSwitchKey]);

  // 历史记录处理函数
  const handleShowHistory = () => {
    setIsHistoryModalOpen(true);
  };

  useEffect(() => {
    if (!isTabStoreReady) return;
    if (sidebarStore.historyRequestId === 0) return;

    const currentTab = activeTab();

    if (currentTab?.kind === "json") {
      setIsHistoryModalOpen(true);
      sidebarStore.consumeHistoryModal();
    }
  }, [activeTab, activeTabKey, isTabStoreReady, sidebarStore, sidebarStore.historyRequestId, tabs]);

  const handleEditorModeChange = (mode: SidebarKeys) => {
    sidebarStore.updateClickSwitchKey(mode);
  };

  const handleRestoreHistory = (historyKey: string) => {
    const currentTab = activeTab();
    if (!currentTab) return;

    restoreTabHistory(currentTab.key, historyKey);
    toast.success("历史记录已恢复");

    // 更新编辑器显示（使用 requestAnimationFrame 确保状态已更新）
    requestAnimationFrame(() => {
      const updatedTab = getTabByKey(currentTab.key);
      if (!updatedTab) return;

      console.log('[历史记录] 更新编辑器内容:', updatedTab.key);

      switch (sidebarStore.activeKey) {
        case SidebarKeys.textView:
          monacoJsonEditorRefs.current[currentTab.key]?.updateValue(
            updatedTab.content,
          );
          break;
        case SidebarKeys.diffView:
          monacoDiffEditorRefs.current[currentTab.key]?.updateOriginalValue(
            updatedTab.content,
          );
          break;
      }
    });
  };

  const handleDeleteHistory = (historyKey: string) => {
    const currentTab = activeTab();
    if (!currentTab) return;

    deleteTabHistory(currentTab.key, historyKey);
    toast.success("历史记录已删除");
  };

  const handleClearHistory = () => {
    const currentTab = activeTab();
    if (!currentTab) return;

    clearTabHistory(currentTab.key);
    toast.success("历史记录已清空");
  };

  const renderBottomActions = () => {
    if (activeTabItem?.kind !== "json") return null;

    switch (sidebarStore.activeKey) {
      case SidebarKeys.textView:
        return (
          <MonacoOperationBar
            onClear={() => {
              return monacoJsonEditorRefs.current[activeTabKey]?.clear() ?? false;
            }}
            onCopy={() => {
              return monacoJsonEditorRefs.current[activeTabKey]?.copy() ?? false;
            }}
            onCompress={() => {
              return monacoJsonEditorRefs.current[activeTabKey]?.compress() ?? false;
            }}
            onEscape={() => {
              return monacoJsonEditorRefs.current[activeTabKey]?.escape() ?? false;
            }}
            onFieldSort={(type) => {
              return monacoJsonEditorRefs.current[activeTabKey]?.fieldSort(type) ?? false;
            }}
            onFormat={() => {
              return monacoJsonEditorRefs.current[activeTabKey]?.format() ?? false;
            }}
            onMore={(key) => {
              return monacoJsonEditorRefs.current[activeTabKey]?.moreAction(key) ?? false;
            }}
            onSaveFile={() => {
              return monacoJsonEditorRefs.current[activeTabKey]?.saveFile() ?? false;
            }}
            onShowHistory={handleShowHistory}
            onToggleFilter={() => setJsonQueryVisible((value) => !value)}
            isValidationEnabled={isValidationEnabled}
            onToggleValidation={setIsValidationEnabled}
          />
        );
      case SidebarKeys.diffView:
        return (
          <MonacoDiffOperationBar
            onClear={(type) => {
              return monacoDiffEditorRefs.current[activeTabKey]?.clear(type) ?? false;
            }}
            onCopy={(type) => {
              return monacoDiffEditorRefs.current[activeTabKey]?.copy(type) ?? false;
            }}
            onFieldSort={(type, sort: "asc" | "desc") => {
              return monacoDiffEditorRefs.current[activeTabKey]?.fieldSort(
                type,
                sort,
              ) ?? false;
            }}
            onFormat={(type) => {
              return monacoDiffEditorRefs.current[activeTabKey]?.format(type) ?? false;
            }}
          />
        );
      default:
        return null;
    }
  };

  // 添加renderJsonTableView函数
  const renderJsonTableView = () => {
    return (
      <div className="h-full">
        {tabs
          .filter((tab) => tab.kind === "json")
          .map((tab) => {
          const shouldRender = loadedEditors.table.has(tab.key);
          const isVisible = tab.key === activeTabKey;

          if (!shouldRender && isVisible) {
            const evicted = touchAndEvict("table", tab.key);
            const newTableSet = new Set([...loadedEditors.table, tab.key]);
            for (const evictedKey of evicted) {
              newTableSet.delete(evictedKey);
              delete jsonTableViewRefs.current[evictedKey];
            }
            setLoadedEditors((prev) => ({
              ...prev,
              table: newTableSet,
            }));
          } else if (shouldRender && isVisible) {
            touchAndEvict("table", tab.key);
          }

          return (
            <div
              key={"table-" + tab.key}
              className={cn(
                "w-full h-full",
                "editor-transition", // 添加与其他编辑器一致的过渡效果
                isVisible && "visible",
                !editorLoading[tab.key] && "loaded",
                {
                  hidden: tab.key !== activeTabKey,
                },
              )}
            >
              {shouldRender && (
                <JsonTableView
                  key={tab.key}
                  ref={(ref) => {
                    if (ref) {
                      jsonTableViewRefs.current[tab.key] = ref;
                    }
                  }}
                  data={tab.content}
                  onCopy={(type) => {
                    // 实现复制功能
                    try {
                      let content = "";
                      const currentTab = activeTab();

                      if (!currentTab) return false;

                      switch (type) {
                        case "node":
                          // 复制选中节点的值
                          if (jsonTableViewRefs.current[tab.key]) {
                            const selectedNode =
                              jsonTableViewRefs.current[
                                tab.key
                              ].getSelectedNode();

                            if (selectedNode) {
                              content = stringifyJson(selectedNode, 2);
                              clipboard.copy(content, "已复制选中节点");

                              return true;
                            }
                          }

                          return false;
                        case "path":
                          // 复制选中节点的路径
                          if (jsonTableViewRefs.current[tab.key]) {
                            const selectedPath =
                              jsonTableViewRefs.current[
                                tab.key
                              ].getSelectedPath();

                            if (selectedPath) {
                              clipboard.copy(selectedPath, "已复制选中路径");

                              return true;
                            }
                          }

                          return false;
                        default:
                          // 默认复制整个JSON内容
                          content = tab.content || "{}";
                          clipboard.copy(content, "已复制全部内容");

                          return true;
                      }
                    } catch (err) {
                      console.error("复制失败:", err);
                      toast.error("复制失败: " + (err as Error).message);

                      return false;
                    }
                  }}
                  onDataUpdate={(newData) => {
                    // 更新tab内容
                    setTabContent(tab.key, newData);
                  }}
                  onMount={() => {
                    setEditorLoading((prev) => ({
                      ...prev,
                      [tab.key]: false,
                    }));
                  }}
                />
              )}
            </div>
          );
          })}
      </div>
    );
  };

  const activeTabItem = getTabByKey(activeTabKey);

  return (
    <div className="flex flex-col h-full dark:bg-vscode-dark">
      <WorkbenchHeader
        tabs={
          <DynamicTabs
            ref={tabRef}
            onClose={closeTabHandle}
            onSwitch={tabSwitchHandle}
            onUrlRefresh={urlRefreshHandle}
          />
        }
        actions={<ThemeSwitch isCollapsed />}
      />
      <div className="flex-grow h-0 overflow-hidden flex flex-col">
        {activeTabItem?.kind === "json" && renderEditor()}
      </div>
      <WorkbenchBottomBar
        activeMode={sidebarStore.activeKey}
        actions={renderBottomActions()}
        showEditorToolbar={activeTabItem?.kind === "json"}
        onOpenSettings={() => navigate("/settings")}
        onModeChange={handleEditorModeChange}
      />

      {/* 历史记录弹窗 */}
      <TabHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        currentContent={activeTab()?.content || ""}
        historyItems={activeTab()?.history || []}
        onRestore={handleRestoreHistory}
        onDelete={handleDeleteHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}
