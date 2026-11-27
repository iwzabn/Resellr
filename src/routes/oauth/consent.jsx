import { createFileRoute, redirect } from "@tanstack/react-router";

// The MCP consent screen was a Base44 platform feature and is not part of this deployment.
export const Route = createFileRoute("/oauth/consent")({ beforeLoad: () => { throw redirect({ to: "/" }); } });
