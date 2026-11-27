import { createMiddleware } from "@tanstack/react-start";

// Error reporting to Base44 is gone; errors are logged to the server console by the host.
export const errorCaptureFunctionMiddleware = createMiddleware({ type: "function" }).server(({ next }) => next());
export const errorCaptureRequestMiddleware = createMiddleware({ type: "request" }).server(({ next }) => next());
