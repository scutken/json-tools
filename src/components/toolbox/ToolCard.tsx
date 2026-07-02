import type { Tool } from "@/store/useToolboxStore.ts";

import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Icon } from "@iconify/react";

import { useTabStore } from "@/store/useTabStore";

interface ToolCardProps {
  tool: Tool;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const addToolTab = useTabStore((state) => state.addToolTab);

  const handleCardClick = () => {
    addToolTab(tool);
  };

  return (
    <Card
      isPressable
      className="workbench-surface workbench-focus-ring cursor-pointer p-3 transition-colors hover:bg-default-100"
      onPress={handleCardClick}
    >
      <CardBody className="overflow-hidden p-0">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-default-100 text-default-700">
            <Icon icon={tool.icon} width={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-default-900">{tool.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-default-500">{tool.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {tool.category.slice(0, 2).map((category) => (
                <span key={category} className="rounded bg-default-100 px-1.5 py-0.5 text-[11px] text-default-500">
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
