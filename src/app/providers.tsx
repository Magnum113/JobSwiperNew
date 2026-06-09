"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { StoreBootstrap } from "@/components/store-bootstrap";
import { AuthCodeBridge } from "@/components/auth-code-bridge";
import { PaywallDialog } from "@/components/paywall/paywall-dialog";
import { LimitReachedDialog } from "@/components/paywall/limit-reached-dialog";
import { GiftDialog } from "@/components/paywall/gift-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        <AuthCodeBridge />
        <StoreBootstrap />
        {children}
        <PaywallDialog />
        <LimitReachedDialog />
        <GiftDialog />
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
