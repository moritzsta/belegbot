import { type NextRequest, NextResponse } from "next/server";

/** Better-Auth Session-Cookies (HTTPS nutzt __Secure-Prefix). */
const SESSION_COOKIES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
];

// /api/ingest hat eigene Secret-Auth (n8n) → an der Session-Middleware vorbei.
const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/ingest"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    // Eingeloggt auf /login → zur App
    const hasSession = SESSION_COOKIES.some((n) => request.cookies.get(n)?.value);
    if (pathname.startsWith("/login") && hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Cookie-Gate (echte Validierung passiert serverseitig in getBelegbotUser)
  const hasSession = SESSION_COOKIES.some((n) => request.cookies.get(n)?.value);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
