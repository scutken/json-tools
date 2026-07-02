import "@/styles/globals.css";
import React, { useEffect } from "react";

import { useSettingsStore } from "@/store/useSettingsStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { getFontSizeConfig } from "@/styles/fontSize";

function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      // 先同步设置数据到 store（如果有的话）
      await useSettingsStore.getState().syncSettingsStore();
      // 保持编辑器四视图与持久化侧边栏状态一致
      await useSidebarStore.getState().syncSidebarStore();
    };

    init();
  }, []);

  return (
    <div className="workbench-shell relative flex h-dvh w-full overflow-hidden border-t border-default-200">
      {/*  Settings Content */}
      <div className="flex-1 overflow-hidden min-w-16">{children}</div>
    </div>
  );
}

// 根组件外层包装字体大小样式
function FontSizeLayout({ children }: { children: React.ReactNode }) {
  const { fontSize } = useSettingsStore();
  const fontSizeConfig = getFontSizeConfig(fontSize);

  return (
    <div
      className="font-size-text"
      style={{
        // 应用字体大小到整个布局
        fontSize: fontSizeConfig.base,
        lineHeight: fontSizeConfig.lineHeight,
      }}
    >
      {children}
    </div>
  );
}

export default function DefaultLayout(props: { children: React.ReactNode }) {
  return (
    <FontSizeLayout>
      <RootLayout {...props} />
    </FontSizeLayout>
  );
}
