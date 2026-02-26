export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/projects/:path*",
    "/create/:path*",
    "/project/:path*",
    "/channels/:path*",
    "/settings/:path*",
    "/debug-db",
  ],
};
