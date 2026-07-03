export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export function parseShortcut(shortcutString: string): ShortcutConfig {
  const parts = shortcutString.split("+").map((p) => p.trim().toLowerCase());
  const config: ShortcutConfig = {
    key: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        config.ctrl = true;
        break;
      case "alt":
        config.alt = true;
        break;
      case "shift":
        config.shift = true;
        break;
      case "cmd":
      case "command":
      case "meta":
        config.meta = true;
        break;
      default:
        if (!config.key) config.key = part;
    }
  }
  return config;
}

export function shortcutToString(config: ShortcutConfig): string {
  const parts: string[] = [];
  if (config.ctrl) parts.push("Ctrl");
  if (config.alt) parts.push("Alt");
  if (config.shift) parts.push("Shift");
  if (config.meta) parts.push("Cmd");
  parts.push(config.key.toUpperCase());
  return parts.join("+");
}

function matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  if (config.ctrl !== event.ctrlKey) return false;
  if (config.alt !== event.altKey) return false;
  if (config.shift !== event.shiftKey) return false;
  if (config.meta !== event.metaKey) return false;
  return event.key.toLowerCase() === config.key.toLowerCase();
}

export class ShortcutListener {
  private listeners = new Map<string, Set<(event: KeyboardEvent) => void>>();
  private globalKeys = new Set<string>();
  private enabled = true;

  addListener(
    shortcut: string,
    callback: (event: KeyboardEvent) => void,
    options?: { global?: boolean },
  ): void {
    if (!this.listeners.has(shortcut)) {
      this.listeners.set(shortcut, new Set());
    }
    this.listeners.get(shortcut)!.add(callback);
    if (options?.global) this.globalKeys.add(shortcut);
  }

  removeListener(
    shortcut: string,
    callback: (event: KeyboardEvent) => void,
    options?: { global?: boolean },
  ): void {
    const cbs = this.listeners.get(shortcut);
    if (cbs) {
      cbs.delete(callback);
      if (cbs.size === 0) this.listeners.delete(shortcut);
    }
    if (options?.global) this.globalKeys.delete(shortcut);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  handleEvent(event: KeyboardEvent): void {
    if (!this.enabled) return;
    const target = event.target as HTMLElement;
    const isEditor =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    for (const [shortcut, cbs] of this.listeners) {
      const config = parseShortcut(shortcut);
      if (!matchesShortcut(event, config)) continue;
      if (isEditor && !this.globalKeys.has(shortcut)) continue;
      event.preventDefault();
      event.stopPropagation();
      cbs.forEach((cb) => {
        try {
          cb(event);
        } catch (e) {
          console.error("Shortcut callback error:", e);
        }
      });
      break;
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const globalShortcutListener = new ShortcutListener();

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (event) => {
    globalShortcutListener.handleEvent(event);
  });
}
