import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";

import { SearchBox } from "@/components/toolbox/SearchBox";
import { ToolCard } from "@/components/toolbox/ToolCard";
import { useToolboxStore } from "@/store/useToolboxStore";

export function ToolLauncher() {
  const { filteredTools, setSearchQuery, searchQuery } = useToolboxStore();
  const tools = filteredTools();
  const categories = Array.from(
    new Set(tools.flatMap((tool) => tool.category || []).filter(Boolean)),
  );

  return (
    <div className="h-full overflow-auto bg-default-50 p-3 dark:bg-transparent">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <section className="workbench-surface flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-default-900">工具箱</h1>
              <p className="text-xs text-default-500">搜索并启动 JSON 处理工具</p>
            </div>
            <SearchBox />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((category) => (
                <Chip
                  key={category}
                  className="cursor-pointer"
                  size="sm"
                  variant={searchQuery === category ? "solid" : "flat"}
                  onClick={() => setSearchQuery(category as string)}
                >
                  {category}
                </Chip>
              ))}
              {searchQuery && (
                <Button size="sm" variant="light" onPress={() => setSearchQuery("")}>清除</Button>
              )}
            </div>
          )}
        </section>

        {tools.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="workbench-surface flex flex-col items-center justify-center py-14 text-center">
            <Icon className="mb-3 text-default-300" icon="solar:empty-file-outline" width={48} />
            <h2 className="text-sm font-semibold text-default-800">没有找到匹配的工具</h2>
            <p className="mt-1 text-xs text-default-500">换个关键词或清除筛选后再试</p>
          </div>
        )}
      </div>
    </div>
  );
}
