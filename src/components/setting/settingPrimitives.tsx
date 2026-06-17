import type { ReactNode } from "react";

import { cn } from "@heroui/react";
import { Icon } from "@iconify/react";

/**
 * 设置页视觉原语（Apple 系统风）。
 *
 * 设计语言：浅灰底（default-50）+ 纯白圆角分组卡片 + 彩色圆角图标块 +
 * macOS 胶囊开关 + 小号大写分组标题。所有颜色走 HeroUI 语义色，暗色模式自动适配。
 */

/** 图标圆角块的色调 —— Apple 系统设置风格的彩色方块 */
export type SettingTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "neutral";

const TONE_CLASSES: Record<SettingTone, string> = {
  // 彩色方块（白字图标）—— 仿 macOS 系统设置
  primary: "bg-primary text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  info: "bg-blue-500 text-white",
  violet: "bg-purple-500 text-white",
  neutral: "bg-default-200 text-default-700",
};

interface SectionHeaderProps {
  title: string;
  description?: string;
}

/** 每个 tab 顶部的统一标题（无图标块，纯文字，更克制） */
export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-5 sm:mb-6">
      <h2 className="text-xl font-bold tracking-tight text-default-900 sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 text-sm text-default-500 sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

interface GroupLabelProps {
  children: ReactNode;
}

/** 分组小标题：小号大写灰字，仿 macOS 设置的分组标签 */
export function GroupLabel({ children }: GroupLabelProps) {
  return (
    <h4 className="mb-2 mt-6 px-4 text-xs font-semibold uppercase tracking-wide text-default-400 first:mt-0">
      {children}
    </h4>
  );
}

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  /** 是否以分隔线分隔内部多行（列表式分组） */
  divided?: boolean;
  /** 是否去掉内边距（由内部行自行控制） */
  flush?: boolean;
}

/** 设置分组容器：纯白圆角卡片 + 轻阴影 + 细边框 */
export function SectionCard({
  children,
  className,
  divided = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-default-200/70 bg-background shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:bg-default-50/30",
        divided && "divide-y divide-default-200/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SettingRowProps {
  icon: string;
  title: string;
  description?: ReactNode;
  tone?: SettingTone;
  /** 右侧控件区 */
  children?: ReactNode;
  className?: string;
}

/** 单个设置行：彩色圆角图标 + 标题/描述（左） + 控件（右），窄屏自动换行 */
export function SettingRow({
  icon,
  title,
  description,
  tone = "neutral",
  children,
  className,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-[54px] flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3 transition-colors hover:bg-default-100/40 sm:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px]",
            TONE_CLASSES[tone],
          )}
        >
          <Icon icon={icon} width={18} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-default-900">{title}</p>
          {description ? (
            <p className="mt-0.5 text-[13px] text-default-500">{description}</p>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className="flex flex-shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

interface InfoNoteProps {
  icon?: string;
  title?: string;
  tone?: SettingTone;
  className?: string;
  children: ReactNode;
}

/** 信息提示块（快捷键说明、解码器说明等） */
export function InfoNote({
  icon = "solar:info-circle-bold",
  title,
  tone = "primary",
  className,
  children,
}: InfoNoteProps) {
  return (
    <div
      className={cn(
        "mx-4 my-3 flex items-start gap-3 rounded-xl border p-3.5 sm:mx-5",
        tone === "warning"
          ? "border-warning/20 bg-warning/10"
          : tone === "primary"
            ? "border-primary/20 bg-primary/10"
            : "border-default-200 bg-default-100/50",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 flex-shrink-0",
          tone === "warning"
            ? "text-warning"
            : tone === "primary"
              ? "text-primary"
              : "text-default-500",
        )}
        icon={icon}
        width={18}
      />
      <div className="text-[13px] leading-relaxed text-default-700">
        {title ? (
          <p
            className={cn(
              "mb-1 font-semibold",
              tone === "primary" && "text-primary",
              tone === "warning" && "text-warning",
            )}
          >
            {title}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  /** 右上角勾选徽标 */
  badge?: boolean;
  className?: string;
  children: ReactNode;
}

/** 可视化选择卡片（聊天样式、字体大小等）：选中后紫色描边 + 勾选徽标 */
export function ChoiceCard({
  selected,
  onSelect,
  badge = true,
  className,
  children,
}: ChoiceCardProps) {
  return (
    <div
      aria-pressed={selected}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 p-3.5 transition-all duration-200",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-default-200/70 bg-background hover:border-default-300 hover:bg-default-50/50",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      {badge && selected ? (
        <div className="absolute right-2 top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-white">
          <Icon icon="solar:check-circle-bold" width={14} />
        </div>
      ) : null}
      {children}
    </div>
  );
}
