import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { InstallProvider } from "@/components/apiary/install-app";
import { TutorialProvider } from "@/components/apiary/tutorial";
import { BackupReminder, UpdatePrompt } from "@/components/pwa/update-prompt";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <InstallProvider>
        <TutorialProvider>
          {children}
          <UpdatePrompt />
          <BackupReminder />
          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast: "font-sans bg-card text-foreground border-border shadow-[var(--shadow-border)]",
              },
            }}
          />
        </TutorialProvider>
      </InstallProvider>
    </QueryClientProvider>
  );
}
