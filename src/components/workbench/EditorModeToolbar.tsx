import { Button, Tooltip, cn } from "@heroui/react";
import { Icon } from "@iconify/react";

import { editorModeItems, SidebarKeys } from "@/components/sidebar/Items";

export interface EditorModeToolbarProps {
  activeMode: SidebarKeys;
  onModeChange: (mode: SidebarKeys) => void;
}

export default function EditorModeToolbar({
  activeMode,
  onModeChange,
}: EditorModeToolbarProps) {
  return (
    <div
      className="flex min-w-0 items-center gap-1"
      role="toolbar"
      aria-label="编辑器视图模式"
    >
      {editorModeItems.map((item) => {
        const mode = item.key as SidebarKeys;
        const active = activeMode === mode;

        return (
          <Tooltip key={mode} content={item.title} placement="bottom">
            <Button
              aria-label={item.title}
              className={cn(
                "workbench-focus-ring h-7 min-w-7 rounded-md px-1.5 text-xs",
                {
                  "bg-default-200 text-default-900": active,
                  "text-default-600": !active,
                },
              )}
              data-active={active ? "true" : "false"}
              radius="sm"
              size="sm"
              variant="light"
              onPress={() => onModeChange(mode)}
            >
              <Icon icon={item.icon!} width={15} />
              <span className="hidden xl:inline">
                {item.title.replace("视图", "")}
              </span>
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
}
