import { type SidebarItem } from "./Sidebar.tsx";

export enum SidebarKeys {
  textView = "textView",
  treeView = "treeView",
  diffView = "diffView",
  tableView = "tableView",
  history = "history",
  toolbox = "toolbox",
  settings = "settings",
}

export const editorModeItems: SidebarItem[] = [
  { key: SidebarKeys.textView, icon: "solar:code-square-linear", title: "文本视图" },
  { key: SidebarKeys.treeView, icon: "solar:widget-2-linear", title: "树形视图" },
  { key: SidebarKeys.diffView, icon: "solar:checklist-minimalistic-linear", title: "DIFF视图" },
  { key: SidebarKeys.tableView, icon: "solar:bill-list-linear", title: "表格视图" },
];

export const railItems: SidebarItem[] = [
  { key: "editor", icon: "solar:code-square-linear", route: "./", title: "编辑器" },
  { key: SidebarKeys.history, icon: "solar:history-2-linear", route: "./", title: "历史" },
  { key: SidebarKeys.toolbox, icon: "solar:box-linear", route: "./toolbox", title: "工具箱" },
  { key: SidebarKeys.settings, icon: "solar:settings-linear", route: "./settings", title: "设置" },
];

export const items: SidebarItem[] = [...editorModeItems, ...railItems.filter((item) => item.key !== "editor")];
