import type { PersistedTabItem } from "./useTabStore";

import {
  normalizePersistedTabs,
  repairActiveTabKey,
  repairNextTabKey,
} from "./useTabStore";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const createTab = (key: string, kind?: string): PersistedTabItem => ({
  kind,
  key,
  uuid: `uuid-${key}`,
  title: `Tab ${key}`,
  content: "{}",
  monacoVersion: 1,
  closable: true,
  history: [],
  editorSettings: {
    fontSize: 14,
    language: "json",
    indentSize: 2,
  },
});

const createLegacyVanillaTab = (): PersistedTabItem => ({
  ...createTab("5", "json"),
  vanilla: { json: { removed: true } },
  vanillaVersion: 3,
  vanillaMode: "tree",
  history: [
    {
      key: "history-1",
      timestamp: 1,
      title: "Legacy history",
      content: "{}",
      monacoVersion: 1,
      vanilla: { json: { removed: true } },
    },
  ],
});

const mixedTabs = normalizePersistedTabs([
  createTab("1", "json"),
  createTab("2", "toolbox"),
  createTab("3", "tool"),
  createTab("4"),
]);

assert(mixedTabs.length === 2, "legacy toolbox/tool tabs should be removed");
assert(mixedTabs.every((tab) => tab.kind === "json"), "remaining tabs should be json tabs");
assert(mixedTabs[1].key === "4", "legacy tabs without kind should be treated as json");
assert(
  repairActiveTabKey(mixedTabs, "2") === "1",
  "active key pointing at a removed tab should fall back to first retained tab",
);
assert(
  repairActiveTabKey(mixedTabs, "4") === "4",
  "active key pointing at a retained tab should be preserved",
);
assert(
  normalizePersistedTabs([createTab("2", "toolbox"), createTab("3", "tool")])
    .length === 0,
  "all removed legacy tabs should produce an empty migration result",
);
assert(
  repairNextTabKey(mixedTabs, 2) === 5,
  "next key should advance past the highest retained tab key",
);
assert(
  repairNextTabKey(mixedTabs, 9) === 9,
  "valid persisted next key above retained keys should be preserved",
);

const [legacyVanillaTab] = normalizePersistedTabs([createLegacyVanillaTab()]);

assert(!("vanilla" in legacyVanillaTab), "legacy vanilla content should be removed");
assert(
  !("vanillaVersion" in legacyVanillaTab),
  "legacy vanilla version should be removed",
);
assert(
  !("vanillaMode" in legacyVanillaTab),
  "legacy vanilla mode should be removed",
);
assert(
  legacyVanillaTab.history.every((historyItem) => !("vanilla" in historyItem)),
  "legacy vanilla history snapshots should be removed",
);
