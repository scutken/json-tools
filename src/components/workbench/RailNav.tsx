import { Button, Tooltip, cn } from "@heroui/react";
import { Icon } from "@iconify/react";

import { ThemeSwitch } from "@/components/button/ThemeSwitch";
import { railItems, SidebarKeys } from "@/components/sidebar/Items";

export interface RailNavProps {
  activeKey: SidebarKeys | "editor";
  onNavigate: (key: SidebarKeys | "editor") => void;
}

export default function RailNav({ activeKey, onNavigate }: RailNavProps) {
  return (
    <aside className="workbench-rail flex h-dvh flex-col items-center py-2">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg">
        <img alt="合社JSON" className="h-8 w-8 rounded-md" src="./logo.png" />
      </div>

      <nav aria-label="主导航" className="flex flex-1 flex-col items-center gap-1">
        {railItems.map((item) => {
          const key = item.key as SidebarKeys | "editor";
          const active = activeKey === key;

          return (
            <Tooltip key={String(item.key)} content={item.title} placement="right">
              <Button
                isIconOnly
                aria-label={item.title}
                className={cn("workbench-icon-button workbench-focus-ring", {
                  "text-default-900": active,
                })}
                data-active={active ? "true" : "false"}
                radius="sm"
                size="sm"
                variant="light"
                onPress={() => onNavigate(key)}
              >
                <Icon icon={item.icon!} width={19} />
              </Button>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1">
        <Tooltip content="切换主题" placement="right">
          <ThemeSwitch className="w-9" isCollapsed={true} />
        </Tooltip>
      </div>
    </aside>
  );
}
