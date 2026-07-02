import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Slider,
  Switch,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";

import {
  ChoiceCard,
  ControlSlot,
  GroupLabel,
  SectionCard,
  SectionHeader,
  SettingRow,
} from "../settingPrimitives";

import toast from "@/utils/toast";
import { useSettingsStore, type FontSize } from "@/store/useSettingsStore";
import { useTabStore } from "@/store/useTabStore";
import { storage } from "@/lib/indexedDBStore";
import { useOpenAIConfigStore } from "@/store/useOpenAIConfigStore";

const FONT_OPTIONS: Array<{
  value: FontSize;
  label: string;
  desc: string;
  previewSize: string;
}> = [
  { value: "small", label: "小号", desc: "紧凑省空间", previewSize: "13px" },
  { value: "medium", label: "标准", desc: "平衡阅读", previewSize: "16px" },
  { value: "large", label: "大号", desc: "清晰易见", previewSize: "19px" },
];

/**
 * 通用设置（Apple 系统风）：按「外观 / 编辑器 / 数据 / 危险操作」分组。
 */
export function GeneralSettings() {
  const {
    defaultIndentSize,
    fontSize,
    persistentDataEnabled,
    setFontSize,
    setPersistentDataEnabled,
    setDefaultIndentSize,
  } = useSettingsStore();

  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure();
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);

  const handlePersistenceChange = (value: boolean) => {
    if (!value) {
      setPendingValue(value);
      onConfirmOpen();
    } else {
      setPersistentDataEnabled(value);
      toast.success("已开启本地存储，您的数据将被自动保存");
    }
  };

  const handleConfirmDisablePersistence = () => {
    if (pendingValue !== null) {
      setPersistentDataEnabled(pendingValue);
      useTabStore.getState().clearUserData();
      toast.success("已关闭本地存储，所有用户数据已清除");
      setPendingValue(null);
      onConfirmClose();
    }
  };

  const handleIndentChange = (value: number | number) => {
    setDefaultIndentSize(value as number);
    toast.success(`默认缩进大小已设置为 ${value} 个空格`);
  };

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    toast.success("字体大小已更改");
  };

  const removeStore = () => {
    storage.clear();
    useSettingsStore.setState({
      monacoEditorCDN: "local",
      chatStyle: "bubble",
      timestampDecoderEnabled: true,
      base64DecoderEnabled: true,
      unicodeDecoderEnabled: true,
      urlDecoderEnabled: true,
      defaultIndentSize: 4,
      newTabShortcut: "Ctrl+Shift+T",
      closeTabShortcut: "Ctrl+Shift+W",
    });
    useOpenAIConfigStore.getState().resetConfig();
    toast.success("所有设置已重置，请重新加载或刷新页面");
  };

  return (
    <div className="h-full">
      <SectionHeader description="管理编辑器显示、默认格式和本地数据" title="编辑器与数据" />

      <GroupLabel>编辑器</GroupLabel>
      <SectionCard divided>
        <SettingRow
          description="新标签页 JSON 的缩进空格数"
          icon="fluent:text-indent-increase-16-filled"
          title="默认缩进大小"
          tone="warning"
        >
          <ControlSlot className="sm:min-w-[220px]" align="stretch">
            <span className="w-5 text-center text-sm font-medium tabular-nums text-default-600">
              {defaultIndentSize}
            </span>
            <Slider
              aria-label="调整默认缩进大小"
              className="min-w-[140px] flex-1 sm:w-40"
              color="primary"
              maxValue={8}
              minValue={1}
              step={1}
              value={defaultIndentSize}
              onChange={(value) => handleIndentChange(value as number)}
            />
          </ControlSlot>
        </SettingRow>
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-3 sm:p-4">
          {FONT_OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              selected={fontSize === opt.value}
              onSelect={() => handleFontSizeChange(opt.value)}
            >
              <div
                className="mb-2 font-semibold text-default-900"
                style={{ fontSize: opt.previewSize }}
              >
                Aa 示例
              </div>
              <p className="text-[12px] font-semibold text-default-900">
                {opt.label}
              </p>
              <p className="mt-0.5 text-[11px] text-default-500">{opt.desc}</p>
            </ChoiceCard>
          ))}
        </div>
      </SectionCard>

      <GroupLabel>数据</GroupLabel>
      <SectionCard>
        <SettingRow
          description={
            persistentDataEnabled
              ? "已开启，数据自动保存到本地"
              : "当前已关闭，刷新页面后数据将丢失"
          }
          icon="lucide:database"
          title="本地数据持久化"
          tone={persistentDataEnabled ? "success" : "warning"}
        >
          <ControlSlot>
            <Switch
              color="success"
              isSelected={persistentDataEnabled}
              size="lg"
              onValueChange={handlePersistenceChange}
            />
          </ControlSlot>
        </SettingRow>
      </SectionCard>

      <GroupLabel>危险操作</GroupLabel>
      <SectionCard>
        <SettingRow
          description="清除所有本地存储并恢复默认设置"
          icon="solar:restart-bold"
          title="重置应用"
          tone="danger"
        >
          <ControlSlot>
            <Tooltip content="此操作将清除所有本地数据">
              <Button
                color="danger"
                radius="full"
                size="sm"
                startContent={<Icon icon="solar:refresh-bold" width={16} />}
                variant="flat"
                onPress={removeStore}
              >
                重置…
              </Button>
            </Tooltip>
          </ControlSlot>
        </SettingRow>
      </SectionCard>

      {/* 确认关闭本地存储对话框 */}
      <Modal isOpen={isConfirmOpen} onClose={onConfirmClose}>
        <ModalContent>
          <ModalHeader>确认关闭本地存储？</ModalHeader>
          <ModalBody>
            <p>关闭后，您的所有用户数据（标签页、输入内容等）将不再保存。</p>
            <p className="mt-2 text-warning">
              ⚠️ 此操作将立即清除已有数据，且无法恢复。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onConfirmClose}>
              取消
            </Button>
            <Button color="danger" onPress={handleConfirmDisablePersistence}>
              确认关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
