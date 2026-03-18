import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const confirmUrl = new URL("/auth/confirm", requestUrl.origin);

  requestUrl.searchParams.forEach((value, key) => {
    confirmUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(confirmUrl);
}