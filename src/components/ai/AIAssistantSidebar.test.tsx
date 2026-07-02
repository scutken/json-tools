import AIAssistantSidebar from "@/components/ai/AIAssistantSidebar";

const messages = [
  {
    role: "user" as const,
    content: "检查这个 JSON",
    timestamp: 1,
  },
];

export const normalSidebarExample = (
  <AIAssistantSidebar
    editorContent="{}"
    isOpen={true}
    messages={messages}
    prompt=""
    quickPrompts={[]}
    onApplyCode={() => undefined}
    onClose={() => undefined}
    onPromptChange={() => undefined}
    onQuickPromptClick={() => undefined}
    onSubmit={() => undefined}
  />
);

export const diffSidebarExample = (
  <AIAssistantSidebar
    editorContent="left\nright"
    isDiffEditor={true}
    isOpen={true}
    messages={messages}
    prompt=""
    quickPrompts={[]}
    onApplyCodeToLeft={() => undefined}
    onApplyCodeToRight={() => undefined}
    onClose={() => undefined}
    onPromptChange={() => undefined}
    onQuickPromptClick={() => undefined}
    onSubmit={() => undefined}
  />
);
