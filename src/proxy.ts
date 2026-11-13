import { NextResponse, type NextRequest } from "next/server";

/**
 * Netlify's own addresses (preview--do-they-charge-app.netlify.app and the like) are for
 * Matt only: they ask for a password (PREVIEW_PASSWORD, any username).
 * Without PREVIEW_PASSWORD set they're closed altogether. The production
 * aliases never get here: next.config redirects them to the real domain.
 * Every other host (the real domain) passes straight through.
 */
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (!/\.netlify\.app$/.test(host)) return NextResponse.next();
  const password = process.env.PREVIEW_PASSWORD;
  if (!password) return new NextResponse("Not found", { status: 404 });
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
    } catch {
      // fall through to the prompt
    }
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Discretionary preview", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$).*)"],
};
