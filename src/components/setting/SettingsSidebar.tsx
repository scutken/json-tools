import { cn, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";

/** 设置页二级导航项 */
export interface SettingsMenuItem {
  key: string;
  label: string;
  icon: string;
}

interface SettingsSidebarProps {
  items: SettingsMenuItem[];
  activeTab: string;
  onSelect: (key: string) => void;
}

/**
 * 设置页左侧导航（Apple 系统风）：始终是竖排图标条，选中项用圆角高亮块 +
 * 强调色，未选中保持中性灰。宽屏（≥ md）在图标右侧显示文字标签。
 * 窄屏纯图标，hover 时 Tooltip 显示名称。
 */
export function SettingsSidebar({
  items,
  activeTab,
  onSelect,
}: SettingsSidebarProps) {
  return (
    <div className="flex h-full w-[68px] flex-shrink-0 flex-col border-r border-default-200/60 bg-default-100/50 backdrop-blur-md dark:bg-default-50/20 md:w-52">
      {/* 标题区 */}
      <div className="px-3 pb-2 pt-5 md:px-4">
        <p className="hidden text-[10px] font-semibold uppercase tracking-wide text-default-400 md:block">
          设置
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 md:p-3">
        {items.map((item) => {
          const isActive = activeTab === item.key;
          const button = (
            <button
              aria-label={item.label}
              aria-pressed={isActive}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-all md:px-3",
                isActive
                  ? "bg-primary text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:bg-primary"
                  : "text-default-600 hover:bg-default-200/60 dark:text-default-400 dark:hover:bg-default-100/40",
              )}
              onClick={() => onSelect(item.key)}
            >
              <Icon className="flex-shrink-0" icon={item.icon} width={18} />
              <span className="hidden truncate text-[12px] font-medium md:inline">
                {item.label}
              </span>
            </button>
          );

          // 窄屏纯图标模式用 Tooltip 显示名称
          return (
            <Tooltip
              key={item.key}
              className="md:hidden"
              content={item.label}
              delay={200}
              placement="right"
            >
              {button}
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}
