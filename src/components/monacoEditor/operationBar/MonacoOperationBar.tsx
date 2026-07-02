import React, { useState, useRef } from "react";
import {
  Tooltip,
} from "@heroui/react";

import {
  ButtonConfig,
  ButtonGroup as BarButtonGroup,
  IconStatus,
  renderDropdownButton,
  renderMoreMenu,
  renderStandardButton,
} from "@/components/monacoEditor/operationBar/OperationBarBase.tsx";

import {
  DEFAULT_DROPDOWN_TIMEOUT,
  useDropdownTimeout,
} from "@/components/monacoEditor/operationBar/useDropdownTimeout";

import StatusButton from "@/components/button/StatusButton.tsx";
import toast from "@/utils/toast.tsx";

interface MonacoOperationBarProps {
  onCopy: (type?: "default") => boolean;
  onCompress: () => boolean;
  onEscape: () => boolean;
  onFormat: () => boolean;
  onClear: () => boolean;
  onFieldSort: (type: "asc" | "desc") => boolean;
  onMore: (key: "unescape" | "del_comment") => boolean;
  onSaveFile: () => boolean;
  onAiClick?: () => void;
  onShowHistory?: () => void;
  onToggleFilter?: () => void;
  isFilterVisible?: boolean;
  ref?: React.RefObject<MonacoOperationBarRef> | null;
}

export interface MonacoOperationBarRef {}

const MonacoOperationBar: React.FC<MonacoOperationBarProps> = ({
  onCopy,
  onCompress,
  onEscape,
  onFormat,
  onClear,
  onFieldSort,
  onSaveFile,
  onMore,
  onAiClick,
  onShowHistory,
  onToggleFilter,
  isFilterVisible,
}) => {
  const [isFixedMoreDropdownOpen, setFixedMoreDropdownOpen] = useState(false);
  const [isOverflowMoreDropdownOpen, setOverflowMoreDropdownOpen] =
    useState(false);
  const [copyStatus, setCopyStatus] = useState<IconStatus>(IconStatus.Default);
  const [formatStatus, setFormatStatus] = useState<IconStatus>(
    IconStatus.Default,
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // 使用通用的下拉菜单超时管理hook
  const { createTimeout, clearTimeoutByKey } = useDropdownTimeout();

  // 更多下拉菜单
  const showMoreDropdown = () => {
    setFixedMoreDropdownOpen(true);
  };
  const unShowMoreDropdown = () => {
    createTimeout(
      "more",
      () => setFixedMoreDropdownOpen(false),
      DEFAULT_DROPDOWN_TIMEOUT,
    );
  };
  const clearMoreDropdownTimeout = () => {
    clearTimeoutByKey("more");
  };

  const showOverflowMoreDropdown = () => {
    setOverflowMoreDropdownOpen(true);
  };
  const unShowOverflowMoreDropdown = () => {
    createTimeout(
      "overflow-more",
      () => setOverflowMoreDropdownOpen(false),
      DEFAULT_DROPDOWN_TIMEOUT,
    );
  };
  const clearOverflowMoreDropdownTimeout = () => {
    clearTimeoutByKey("overflow-more");
  };

  const handleAction = (action: "unescape" | "del_comment" | "save_file") => {
    switch (action) {
      case "unescape":
        if (onMore("unescape")) {
          toast.success("删除转义成功");
        }
        break;
      case "del_comment":
        if (onMore("del_comment")) {
          toast.success("删除注释成功");
        } else {
          toast.error("删除注释失败");
        }
        break;
      case "save_file":
        if (!onSaveFile()) {
          toast.error("下载文件到本地失败");
        }
        break;
    }
    // 执行操作后关闭更多菜单
    setFixedMoreDropdownOpen(false);
  };

  // 按钮组配置
  const actionGroups: BarButtonGroup[] = [
    {
      key: "main",
      buttons: [
        {
          key: "ai",
          icon: "hugeicons:ai-chat-02",
          text: "AI助手",
          tooltip: "打开AI助手",
          onClick: onAiClick || (() => {}),
          iconColor: "text-indigo-500",
          className:
            "text-xs text-default-600 px-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-50/10 hover:bg-indigo-100/70",
          priority: 10,
        },
      ],
    },
    {
      key: "edit",
      buttons: [
        {
          key: "copy",
          isStatusButton: true,
          icon: "si:copy-line",
          text: "复制",
          tooltip: "",
          status: copyStatus,
          successText: "已复制",
          priority: 20,
          onClick: () => {
            setTimeout(() => {
              setCopyStatus(IconStatus.Default);
            }, 1000);
            setCopyStatus(onCopy() ? IconStatus.Success : IconStatus.Error);
          },
        },
        {
          key: "format",
          isStatusButton: true,
          icon: "ph:magic-wand-light",
          text: "格式化",
          tooltip: "",
          status: formatStatus,
          priority: 30,
          onClick: () => {
            setTimeout(() => {
              setFormatStatus(IconStatus.Default);
            }, 2000);
            setFormatStatus(onFormat() ? IconStatus.Success : IconStatus.Error);
          },
        },
      ],
    },
    {
      key: "advanced",
      buttons: [
        {
          key: "compress",
          icon: "f7:rectangle-compress-vertical",
          text: "压缩",
          tooltip: "压缩当前JSON内容",
          onClick: onCompress,
          priority: 60,
        },
        ...(onToggleFilter
          ? [
              {
                key: "filter",
                icon: "mdi:filter-outline",
                text: "筛选",
                tooltip: isFilterVisible ? "隐藏JsonQuery筛选" : "显示JsonQuery筛选",
                onClick: onToggleFilter,
                priority: 70,
              },
            ]
          : []),
        {
          key: "more",
          icon: "mingcute:more-2-fill",
          text: "更多",
          tooltip: "更多操作",
          hasDropdown: true,
          priority: 90,
          onClick: showMoreDropdown,
          dropdownItems: [
            {
              key: "sort-asc",
              icon: "mdi:sort-alphabetical-ascending",
              text: "字段升序",
              onClick: () => {
                onFieldSort("asc");
                toast.success("字段排序成功");
                setFixedMoreDropdownOpen(false);
              },
            },
            {
              key: "sort-desc",
              icon: "mdi:sort-alphabetical-descending",
              text: "字段降序",
              onClick: () => {
                onFieldSort("desc");
                toast.success("字段排序成功");
                setFixedMoreDropdownOpen(false);
              },
            },
            {
              key: "clear",
              icon: "mynaui:trash",
              text: "清空",
              onClick: () => {
                onClear();
                setFixedMoreDropdownOpen(false);
              },
            },
            {
              key: "escape",
              icon: "solar:link-round-line-duotone",
              text: "转义",
              onClick: () => {
                onEscape();
                setFixedMoreDropdownOpen(false);
              },
            },
            {
              key: "unescape",
              icon: "iconoir:remove-link",
              text: "删除转义",
              onClick: () => handleAction("unescape"),
            },
            {
              key: "del_comment",
              icon: "tabler:notes-off",
              text: "删除注释",
              onClick: () => handleAction("del_comment"),
            },
            {
              key: "save_file",
              icon: "ic:round-save-alt",
              text: "下载文件",
              onClick: () => handleAction("save_file"),
            },
            {
              key: "history",
              icon: "solar:history-linear",
              text: "历史",
              onClick: () => {
                onShowHistory?.();
                setFixedMoreDropdownOpen(false);
              },
            },
          ],
        },
      ],
    },
  ];

  const visibleButtons = actionGroups.flatMap((group) =>
    group.buttons.map((button) => button.key),
  );
  const hiddenButtons: ButtonConfig[] = [];

  // 渲染按钮
  const renderButton = (button: ButtonConfig) => {
    // 检查按钮是否应该可见
    if (!visibleButtons.includes(button.key)) return null;

    // 状态按钮
    if ("isStatusButton" in button && button.isStatusButton) {
      return (
        <Tooltip key={button.key} content={button.tooltip} delay={300}>
          <StatusButton
            icon={button.icon}
            status={button.status}
            successText={button.successText}
            text={button.text}
            onClick={button.onClick}
          />
        </Tooltip>
      );
    }

    // 带下拉菜单的按钮
    if ("hasDropdown" in button && button.hasDropdown) {
      if (button.key === "more") {
        return renderDropdownButton(
          button,
          isFixedMoreDropdownOpen,
          setFixedMoreDropdownOpen,
          showMoreDropdown,
          unShowMoreDropdown,
          clearMoreDropdownTimeout,
        );
      }
    }

    // 普通按钮
    return renderStandardButton(button);
  };

  return (
    <div
      ref={containerRef}
      className="h-7 min-w-0 flex items-center justify-end gap-1"
    >
      {/* AI 按钮 */}
      <div className="flex items-center gap-1">
        {actionGroups[0].buttons.map(renderButton)}
      </div>

      {/* 分隔线 - 只在有AI 按钮可见时显示 */}
      {actionGroups[0].buttons.some((button) =>
        visibleButtons.includes(button.key),
      ) && <div className="h-5 w-px bg-default-200 mx-0.5" />}

      {/* 编辑按钮组 */}
      <div className="flex items-center gap-1">
        {actionGroups[1].buttons.map(renderButton)}
      </div>

      {/* 分隔线 - 只在有编辑按钮和高级按钮都可见时显示 */}
      {actionGroups[1].buttons.some((button) =>
        visibleButtons.includes(button.key),
      ) &&
        actionGroups[2].buttons.some((button) =>
          visibleButtons.includes(button.key),
        ) && <div className="h-5 w-px bg-default-200 mx-0.5" />}

      {/* 高级按钮组 */}
      <div className="flex items-center gap-1">
        {actionGroups[2].buttons.map(renderButton)}

        {/* 更多菜单 */}
        {renderMoreMenu(
          hiddenButtons,
          isOverflowMoreDropdownOpen,
          setOverflowMoreDropdownOpen,
          showOverflowMoreDropdown,
          unShowOverflowMoreDropdown,
          clearOverflowMoreDropdownTimeout
        )}
      </div>
    </div>
  );
};

export default MonacoOperationBar;
