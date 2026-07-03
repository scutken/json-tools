import type { ReactNode } from "react";

export interface WorkbenchHeaderProps {
  tabs: ReactNode;
  actions?: ReactNode;
}

export default function WorkbenchHeader({ tabs, actions }: WorkbenchHeaderProps) {
  return (
    <header className="workbench-header flex min-w-0 shrink-0 items-center border-b border-default-200 bg-content1">
      <div className="min-w-0 flex-1">{tabs}</div>
      {actions && <div className="flex shrink-0 items-center px-2">{actions}</div>}
    </header>
  );
}
