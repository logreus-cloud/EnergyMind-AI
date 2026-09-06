import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const appRoutes = ["/overview", "/floor-plan", "/analytics", "/anomalies", "/recommendations", "/tasks"];

export function middleware(request: NextRequest) {
  if (appRoutes.includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/overview", "/floor-plan", "/analytics", "/anomalies", "/recommendations", "/tasks"],
};
