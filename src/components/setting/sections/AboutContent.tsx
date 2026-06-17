import { Icon } from "@iconify/react";

import { GroupLabel, SectionCard, SectionHeader } from "../settingPrimitives";

import ExternalLink from "@/components/ExternalLink";
import pkg from "@/../package.json";

const APP_VERSION = `v${pkg.version}`;

const FEATURES = [
  { label: "JSON 格式化与验证", icon: "solar:check-circle-bold" },
  { label: "智能 AI 辅助修复", icon: "solar:check-circle-bold" },
  { label: "数据格式转换", icon: "solar:check-circle-bold" },
];

const LINKS = [
  {
    href: "https://github.com/fevrax/json-tools",
    icon: "mdi:github",
    label: "GitHub 仓库",
  },
  {
    href: "https://github.com/fevrax/json-tools/issues",
    icon: "solar:chat-square-code-bold",
    label: "问题反馈",
  },
  {
    href: "https://github.com/fevrax/json-tools",
    icon: "solar:document-bold",
    label: "使用文档",
  },
];

/**
 * 关于页（Apple 系统风 · 居中 Hero + 双列）。
 * 放宽宽度限制：根容器 max-w-5xl，内容用 grid 充分利用横向空间。
 */
export function AboutContent() {
  return (
    <div className="h-full">
      <SectionHeader
        description="了解更多关于应用的信息"
        title="关于 JSON Tools"
      />

      {/* Hero 品牌卡片 */}
      <SectionCard className="mb-5 overflow-visible">
        <div className="relative flex flex-col items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-purple-500/5 px-6 py-10 text-center">
          {/* 装饰光晕 */}
          <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-gradient-to-br from-primary to-purple-500 shadow-[0_8px_24px_rgba(99,102,241,0.35)]">
            <img
              alt="JSON Tools Logo"
              className="h-12 w-12 drop-shadow"
              src="./logo.png"
            />
          </div>
          <h3 className="relative text-2xl font-bold tracking-tight text-default-900">
            JSON Tools
          </h3>
          <div className="relative mt-2.5 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary">
              {APP_VERSION}
            </span>
            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[12px] font-semibold text-purple-500">
              专业版
            </span>
          </div>
          <p className="relative mt-3 max-w-md text-[14px] text-default-500">
            强大的 JSON 处理工具集，一站式 JSON 开发者工具箱
          </p>
        </div>
      </SectionCard>

      {/* 双列：功能特点 + 技术支持 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <GroupLabel>功能特点</GroupLabel>
          <SectionCard divided>
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px] bg-success text-white">
                  <Icon icon={f.icon} width={18} />
                </div>
                <span className="text-[14px] font-medium text-default-900">
                  {f.label}
                </span>
              </div>
            ))}
          </SectionCard>
        </div>

        <div>
          <GroupLabel>技术支持</GroupLabel>
          <SectionCard divided>
            {LINKS.map((l) => (
              <ExternalLink
                key={l.label}
                showUrl
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-default-100/40 sm:px-5"
                href={l.href}
              >
                <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px] bg-default-200 text-default-700">
                  <Icon icon={l.icon} width={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-default-900">
                    {l.label}
                  </span>
                </div>
                <Icon
                  className="flex-shrink-0 text-default-400"
                  icon="solar:arrow-right-linear"
                  width={16}
                />
              </ExternalLink>
            ))}
          </SectionCard>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-default-400">
        © {new Date().getFullYear()} JSON Tools · 基于 React、TypeScript 和
        HeroUI 构建
      </p>
    </div>
  );
}
