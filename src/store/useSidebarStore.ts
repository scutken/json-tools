// useSidebarStore.ts

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

import { storage } from "@/lib/indexedDBStore";
import { SidebarKeys } from "@/components/sidebar/Items.tsx";

const VALID_EDITOR_KEYS = new Set<SidebarKeys>([
  SidebarKeys.textView,
  SidebarKeys.diffView,
  SidebarKeys.tableView,
]);

const normalizeEditorKey = (key?: string | null): SidebarKeys => {
  if (key && VALID_EDITOR_KEYS.has(key as SidebarKeys)) {
    return key as SidebarKeys;
  }

  return SidebarKeys.textView;
};

interface SidebarStore {
  activeKey: SidebarKeys;
  clickSwitchKey: SidebarKeys;
  historyRequestId: number;
  updateActiveKey: (key: SidebarKeys) => void;
  updateClickSwitchKey: (key: SidebarKeys) => void;
  requestHistoryModal: () => void;
  consumeHistoryModal: () => void;
  syncSidebarStore: () => Promise<void>;
  switchActiveKey: () => void;
}

const BD_SIDEBAR_ACTIVE_KEY = "sidebar";

export const useSidebarStore = create<SidebarStore>()(
  subscribeWithSelector(
    devtools(
      (set) => ({
        activeKey: SidebarKeys.textView,
        clickSwitchKey: SidebarKeys.textView,
        historyRequestId: 0,
        updateActiveKey: (key) => set({ activeKey: normalizeEditorKey(key) }),
        updateClickSwitchKey: (key) =>
          set({ clickSwitchKey: normalizeEditorKey(key) }),
        requestHistoryModal: () =>
          set((state) => ({ historyRequestId: state.historyRequestId + 1 })),
        consumeHistoryModal: () => set({ historyRequestId: 0 }),
        switchActiveKey: () =>
          set((state) => ({
            activeKey: normalizeEditorKey(state.clickSwitchKey),
          })),
        syncSidebarStore: async () => {
          const activeKey = (await storage.getItem(BD_SIDEBAR_ACTIVE_KEY)) as
            | string
            | null
            | undefined;
          const data: Record<string, any> = {};

          const normalizedKey = normalizeEditorKey(activeKey);
          data.activeKey = normalizedKey;
          data.clickSwitchKey = normalizedKey;
          set(data);

          if (activeKey !== normalizedKey) {
            await storage.setItem(BD_SIDEBAR_ACTIVE_KEY, normalizedKey);
          }
        },
      }),
      {
        name: "SidebarStore",
        enabled: true,
      },
    ),
  ),
);

// 只监听 activeKey 的变化
useSidebarStore.subscribe(
  (state) => state.activeKey,
  (activeKey) => {
    // 本地存储始终启用
    storage
      .setItem(BD_SIDEBAR_ACTIVE_KEY, normalizeEditorKey(activeKey))
      .catch((error) => {
        console.error("保存侧边栏状态失败:", error);
      });
  },
);
