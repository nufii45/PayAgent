import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE, NEW_WORKSPACE_HEADER, guestCookieOptions, isWorkspaceId } from "@/lib/session";

// No accounts: every visitor gets a private guest workspace on first visit.
// The workspace row is created on the server the first time it is used.
export function middleware(req: NextRequest) {
  const current = req.cookies.get(GUEST_COOKIE)?.value;
  const id = isWorkspaceId(current) ? current : crypto.randomUUID();
  const headers = new Headers(req.headers);
  headers.delete(NEW_WORKSPACE_HEADER); // never trust a client-sent value
  if (id !== current) {
    req.cookies.set(GUEST_COOKIE, id);
    headers.set("cookie", req.cookies.toString());
    headers.set(NEW_WORKSPACE_HEADER, "1");
  }
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(GUEST_COOKIE, id, guestCookieOptions());
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
