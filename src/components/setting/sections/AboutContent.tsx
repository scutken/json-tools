import { Icon } from "@iconify/react";

import { SectionHeader } from "../settingPrimitives";

import ExternalLink from "@/components/ExternalLink";
import pkg from "@/../package.json";

const APP_VERSION = `v${pkg.version}`;

const FEATURES = [
  {
    label: "JSON 格式化与验证",
    icon: "solar:check-circle-bold",
    note: "稳定输出 · 快速校验",
    tone: "from-primary/10 via-primary/5 to-background border-primary/20 text-primary",
  },
  {
    label: "AI 修复",
    icon: "solar:magic-stick-3-bold",
    note: "自动补全 · 降低返工",
    tone: "from-success/10 via-success/5 to-background border-success/20 text-success",
  },
  {
    label: "格式转换",
    icon: "solar:shuffle-bold",
    note: "类型互转 · 结构整理",
    tone: "from-warning/10 via-warning/5 to-background border-warning/20 text-warning",
  },
];

const LINKS = [
  {
    href: "https://github.com/scutken/json-tools",
    icon: "mdi:github",
    label: "项目仓库",
    note: "scutken/json-tools",
  },
  {
    href: "https://github.com/scutken/json-tools/issues",
    icon: "solar:chat-square-code-bold",
    label: "问题反馈",
    note: "提交问题与建议",
  },
  {
    href: "https://github.com/scutken/json-tools#readme",
    icon: "solar:document-bold",
    label: "项目文档",
    note: "查看 README",
  },
];

export function AboutContent() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="h-full space-y-4">
      <SectionHeader
        description="轻量、专注的 JSON 工作台"
        title="关于 合社JSON"
      />

      <section className="workbench-surface overflow-hidden rounded-lg border border-default-200/70 px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:bg-default-50/30 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-default-200 bg-default-100 shadow-sm dark:border-default-700/60 dark:bg-default-200/30">
              <img alt="合社JSON Logo" className="h-9 w-9" src="./logo.png" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-semibold leading-6 text-default-900">
                  合社JSON
                </h3>
                <span className="rounded-full border border-default-200 bg-default-50 px-2.5 py-0.5 text-[11px] font-medium text-default-600 dark:border-default-700 dark:bg-default-100/40 dark:text-default-500">
                  {APP_VERSION}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-[13px] leading-5 text-default-500">
                面向 JSON 校验、修复与转换的轻量工具页，保留专注的工作台手感。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="rounded-lg border border-default-200/70 bg-background p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-default-700/60 dark:bg-default-50/30"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br ${feature.tone}`}
              >
                <Icon icon={feature.icon} width={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-default-900">
                  {feature.label}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-default-500">
                  {feature.note}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {LINKS.map((link) => (
          <ExternalLink
            key={link.label}
            className="group rounded-lg border border-default-200/70 bg-background p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-default-300 hover:bg-default-50/70 dark:border-default-700/60 dark:bg-default-50/30 dark:hover:border-default-600"
            href={link.href}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-default-200 bg-default-100 text-default-700 dark:border-default-700 dark:bg-default-100/50 dark:text-default-200">
                <Icon icon={link.icon} width={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-default-900">
                  {link.label}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-default-500">
                  {link.note}
                </p>
              </div>
              <Icon
                className="mt-0.5 flex-shrink-0 text-default-400 transition-transform group-hover:translate-x-0.5"
                icon="solar:arrow-right-linear"
                width={16}
              />
            </div>
          </ExternalLink>
        ))}
      </section>

      <footer className="pt-1 text-[11.5px] leading-5 text-default-400">
        <p>© {currentYear} 合社JSON · fork 自 fevrax/json-tools</p>
      </footer>
    </div>
  );
}
