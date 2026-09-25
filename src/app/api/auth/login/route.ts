import { NextResponse } from "next/server";
import { createSessionCookieValue, isCorrectPassword, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(req: Request) {
  if (!process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "APP_PASSWORD belum di-set di server" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || !isCorrectPassword(password)) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
