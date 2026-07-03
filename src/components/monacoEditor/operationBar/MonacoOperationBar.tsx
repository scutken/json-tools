import React, { useRef, useState } from "react";
import { Button, cn } from "@heroui/react";

import {
  ButtonConfig,
  ButtonGroup as BarButtonGroup,
  IconStatus,
  renderDropdownButton,
  renderStandardButton,
} from "@/components/monacoEditor/operationBar/OperationBarBase.tsx";
import { useDropdownTimeout } from "@/components/monacoEditor/operationBar/useDropdownTimeout";

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
  onShowHistory?: () => void;
  onToggleFilter?: () => void;
  isValidationEnabled: boolean;
  onToggleValidation: (enabled: boolean) => void;
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
  onShowHistory,
  onToggleFilter,
  isValidationEnabled,
  onToggleValidation,
}) => {
  const [isFixedMoreDropdownOpen, setFixedMoreDropdownOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<IconStatus>(IconStatus.Default);
  const [formatStatus, setFormatStatus] = useState<IconStatus>(
    IconStatus.Default,
  );
  const [compressStatus, setCompressStatus] = useState<IconStatus>(
    IconStatus.Default,
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const { clearTimeoutByKey } = useDropdownTimeout();

  const toastTopCenter = (
    type: "success" | "error" | "warning" | "default",
    title: string,
  ) => {
    const options = { placement: "top-center" as const };

    switch (type) {
      case "success":
        toast.success(title, undefined, options as any);
        break;
      case "error":
        toast.error(title, undefined, options as any);
        break;
      case "warning":
        toast.warning(title, undefined, options as any);
        break;
      default:
        toast.default(title, undefined, options as any);
        break;
    }
  };

  const handleClear = () => {
    if (onClear()) {
      toastTopCenter("success", "清空成功");
    } else {
      toastTopCenter("error", "清空失败");
    }
    setFixedMoreDropdownOpen(false);
  };

  const handleEscape = () => {
    if (onEscape()) {
      toastTopCenter("success", "转义成功");
      onToggleValidation(false);
    } else {
      toastTopCenter("error", "转义失败");
    }
    setFixedMoreDropdownOpen(false);
  };

  const handleSort = (type: "asc" | "desc") => {
    const ok = onFieldSort(type);
    toastTopCenter(
      ok ? "success" : "error",
      type === "asc"
        ? ok
          ? "字段升序成功"
          : "字段升序失败"
        : ok
          ? "字段降序成功"
          : "字段降序失败",
    );
    setFixedMoreDropdownOpen(false);
  };

  const handleMoreAction = (key: "unescape" | "del_comment" | "save_file") => {
    switch (key) {
      case "unescape": {
        const ok = onMore("unescape");
        toastTopCenter(ok ? "success" : "error", ok ? "删除转义成功" : "删除转义失败");
        if (ok) {
          onToggleValidation(true);
        }
        break;
      }
      case "del_comment": {
        const ok = onMore("del_comment");
        toastTopCenter(ok ? "success" : "error", ok ? "删除注释成功" : "删除注释失败");
        break;
      }
      case "save_file":
        if (!onSaveFile()) {
          toastTopCenter("error", "下载文件到本地失败");
        }
        break;
    }
    setFixedMoreDropdownOpen(false);
  };

  const actionGroups: BarButtonGroup[] = [
    {
      key: "primary",
      buttons: [
        {
          key: "format",
          isStatusButton: true,
          icon: "ph:magic-wand-light",
          text: "格式化",
          tooltip: "",
          status: formatStatus,
          priority: 20,
          onClick: () => {
            setTimeout(() => setFormatStatus(IconStatus.Default), 2000);
            setFormatStatus(onFormat() ? IconStatus.Success : IconStatus.Error);
          },
        },
        {
          key: "compress",
          isStatusButton: true,
          icon: "f7:rectangle-compress-vertical",
          text: "压缩",
          tooltip: "",
          status: compressStatus,
          priority: 30,
          onClick: () => {
            setTimeout(() => setCompressStatus(IconStatus.Default), 1000);
            setCompressStatus(onCompress() ? IconStatus.Success : IconStatus.Error);
          },
        },
        {
          key: "copy",
          isStatusButton: true,
          icon: "si:copy-line",
          text: "复制",
          tooltip: "",
          status: copyStatus,
          successText: "已复制",
          priority: 40,
          onClick: () => {
            setTimeout(() => setCopyStatus(IconStatus.Default), 1000);
            setCopyStatus(onCopy() ? IconStatus.Success : IconStatus.Error);
          },
        },
        ...(onToggleFilter
          ? [
              {
                key: "filter",
                icon: "mdi:filter-outline",
                text: "筛选",
                tooltip: "",
                onClick: onToggleFilter,
                priority: 50,
              },
            ]
          : []),
      ],
    },
    {
      key: "more-group",
      buttons: [
        {
          key: "more",
          icon: "mingcute:more-2-fill",
          text: "更多",
          tooltip: "更多操作",
          hasDropdown: true,
          priority: 90,
          onClick: () => setFixedMoreDropdownOpen(true),
          dropdownItems: [
            {
              key: "sort-asc",
              icon: "mdi:sort-alphabetical-ascending",
              text: "字段升序",
              onClick: () => handleSort("asc"),
            },
            {
              key: "sort-desc",
              icon: "mdi:sort-alphabetical-descending",
              text: "字段降序",
              onClick: () => handleSort("desc"),
            },
            {
              key: "clear",
              icon: "mynaui:trash",
              text: "清空",
              onClick: handleClear,
            },
            {
              key: "escape",
              icon: "solar:link-round-line-duotone",
              text: "转义",
              onClick: handleEscape,
            },
            {
              key: "unescape",
              icon: "iconoir:remove-link",
              text: "删除转义",
              onClick: () => handleMoreAction("unescape"),
            },
            {
              key: "del_comment",
              icon: "tabler:notes-off",
              text: "删除注释",
              onClick: () => handleMoreAction("del_comment"),
            },
            {
              key: "save_file",
              icon: "ic:round-save-alt",
              text: "下载文件",
              onClick: () => handleMoreAction("save_file"),
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

  const renderButton = (button: ButtonConfig) => {
    if (button.key === "more") {
      return renderDropdownButton(
        button as any,
        isFixedMoreDropdownOpen,
        setFixedMoreDropdownOpen,
        undefined,
        undefined,
        () => clearTimeoutByKey("more"),
      );
    }

    if ("isStatusButton" in button && button.isStatusButton) {
      return (
        <StatusButton
          key={button.key}
          icon={button.icon}
          status={button.status}
          successText={button.successText}
          text={button.text}
          onClick={button.onClick}
        />
      );
    }

    return renderStandardButton(button);
  };

  return (
    <div
      ref={containerRef}
      className="h-7 min-w-0 flex items-center justify-end gap-1"
    >
      <div className="flex items-center gap-1">
        <Button
          aria-label="校验"
          aria-pressed={isValidationEnabled}
          className={cn(
            "workbench-focus-ring h-7 min-w-7 rounded-md px-1.5 text-xs",
            isValidationEnabled
              ? "text-primary hover:bg-primary/10"
              : "text-default-400 hover:bg-default-100 hover:text-default-600",
          )}
          endContent={
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                isValidationEnabled ? "bg-primary" : "bg-default-300",
              )}
            />
          }
          size="sm"
          variant="light"
          onPress={() => onToggleValidation(!isValidationEnabled)}
        >
          校验
        </Button>
        {actionGroups[0].buttons.map(renderButton)}
        <div className="h-5 w-px bg-default-200 mx-0.5" />
        {actionGroups[1].buttons.map(renderButton)}
      </div>
    </div>
  );
};

export default MonacoOperationBar;
