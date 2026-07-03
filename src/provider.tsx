import type { NavigateOptions } from "react-router-dom";

import { HeroUIProvider } from "@heroui/system";
import { useHref, useNavigate } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ToastProvider } from "@heroui/react";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export function Provider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    // TODO 等待 HeroUIProvider 补丁发布
    // eslint-disable-next-line react-compiler/react-compiler
    <HeroUIProvider navigate={navigate} useHref={useHref}>
      <ToastProvider
        aria-hidden="true"
        maxVisibleToasts={2}
        placement="top-center"
        toastOffset={12}
        toastProps={{
          hideCloseButton: true,
          classNames: {
            base: "min-h-0 w-auto min-w-[160px] max-w-[320px] px-3 py-2",
            content: "gap-0",
            title: "text-xs leading-4",
            description: "text-xs leading-4",
            icon: "size-4",
          },
        }}
      />
      <NextThemesProvider attribute="class" defaultTheme="light">
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
