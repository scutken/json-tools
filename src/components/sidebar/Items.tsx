import { type SidebarItem } from "./Sidebar.tsx";

export enum SidebarKeys {
  textView = "textView",
  diffView = "diffView",
  tableView = "tableView",
}

export const editorModeItems: SidebarItem[] = [
  { key: SidebarKeys.textView, icon: "solar:code-square-linear", title: "文本视图" },
  { key: SidebarKeys.diffView, icon: "solar:checklist-minimalistic-linear", title: "DIFF视图" },
  { key: SidebarKeys.tableView, icon: "solar:bill-list-linear", title: "表格视图" },
];
