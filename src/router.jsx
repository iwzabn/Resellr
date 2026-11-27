import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { createQueryClient } from "@/lib/query-client";

export function getRouter() {
  const queryClient = createQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // A page rendered on the server keeps its loader data for a moment instead of
    // being reloaded the instant the browser takes over, which would make the
    // route render empty for a frame and break hydration.
    defaultStaleTime: 30_000,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
  });
  // Provides QueryClientProvider and ships queries fetched during SSR to the browser cache.
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}