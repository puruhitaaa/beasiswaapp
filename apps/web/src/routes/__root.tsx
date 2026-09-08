import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { useUserProfile } from "@/hooks/use-auth-queries";

import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "beasiswaapp",
      },
      {
        name: "description",
        content: "beasiswaapp is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  // Silently re-validates and syncs user profile on session boot / page refresh
  useUserProfile();

  return (
    <>
      <HeadContent />
      <div className="min-vh-100 d-flex flex-column bg-light text-dark">
        <Outlet />
      </div>
      <Toaster richColors position="top-right" />
    </>
  );
}

