import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "ubepari-session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionClaims = {
  userId: string;
  phone: string;
  email: string | null;
};

type EncodedSession = {
  accessToken: string;
  claims: SessionClaims;
};

function jwtSecretKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET missing");
  return new TextEncoder().encode(secret);
}

export async function mintAccessToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({
    sub: claims.userId,
    aud: "authenticated",
    role: "authenticated",
    email: claims.email ?? undefined,
    phone: claims.phone,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(jwtSecretKey());
}

export async function verifyAccessToken(token: string): Promise<EncodedSession | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey(), {
      audience: "authenticated",
    });
    if (typeof payload.sub !== "string" || typeof payload.phone !== "string") {
      return null;
    }
    return {
      accessToken: token,
      claims: {
        userId: payload.sub,
        phone: payload.phone,
        email: typeof payload.email === "string" ? payload.email : null,
      },
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(accessToken: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<EncodedSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
