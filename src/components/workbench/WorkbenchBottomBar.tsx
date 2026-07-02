import type { ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";

import EditorModeToolbar from "@/components/workbench/EditorModeToolbar";
import { SidebarKeys } from "@/components/sidebar/Items";

export interface WorkbenchBottomBarProps {
  showEditorToolbar: boolean;
  activeMode: SidebarKeys;
  onModeChange: (mode: SidebarKeys) => void;
  onOpenSettings: () => void;
  actions?: ReactNode;
}

export default function WorkbenchBottomBar({
  showEditorToolbar,
  activeMode,
  onModeChange,
  onOpenSettings,
  actions,
}: WorkbenchBottomBarProps) {
  if (!showEditorToolbar) return null;

  return (
    <footer className="workbench-bottom-bar flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto border-t border-default-200 bg-content1 px-2 scrollbar-hide">
      <EditorModeToolbar activeMode={activeMode} onModeChange={onModeChange} />
      <div className="min-w-0 flex-1" />
      {actions ? <div className="min-w-fit shrink-0">{actions}</div> : null}
      <div className="h-5 w-px shrink-0 bg-default-200" />
      <Tooltip content="设置" placement="top">
        <Button
          isIconOnly
          aria-label="打开设置"
          className="workbench-focus-ring h-7 min-w-7 shrink-0 rounded-md px-1.5 text-default-600 hover:bg-default-100 hover:text-default-900"
          size="sm"
          variant="light"
          onPress={onOpenSettings}
        >
          <Icon icon="solar:settings-linear" width={15} />
        </Button>
      </Tooltip>
    </footer>
  );
}
