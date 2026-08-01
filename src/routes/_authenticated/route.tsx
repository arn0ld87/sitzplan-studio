import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { StoreProvider } from "@/store/app";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/signin" });
    return { user: data.user };
  },
  component: AuthedLayout,
  errorComponent: ({ error }) => (
    <div className="p-8">
      <p className="eyebrow">Fehler</p>
      <h1 className="page-title mt-2">Die Ansicht konnte nicht geladen werden</h1>
      <p className="mt-2 text-[14px] text-ink-2">{error.message}</p>
    </div>
  ),
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const [email, setEmail] = useState(user.email ?? "");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? "");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <StoreProvider userId={user.id}>
      <AppShell email={email}>
        <Outlet />
      </AppShell>
      <Toaster />
    </StoreProvider>
  );
}
