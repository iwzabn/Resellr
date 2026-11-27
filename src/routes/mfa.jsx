import { createFileRoute, redirect } from "@tanstack/react-router";

// Two-step verification was a Base44 platform feature and is not part of this deployment.
export const Route = createFileRoute("/mfa")({ beforeLoad: () => { throw redirect({ to: "/login" }); } });
