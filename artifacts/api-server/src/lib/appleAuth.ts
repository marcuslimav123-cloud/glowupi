import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");
const APPLE_ISSUER = "https://appleid.apple.com";

const APPLE_AUDIENCES = [
  process.env.APPLE_BUNDLE_ID || "com.glowupi.pro",
];

const jwks = createRemoteJWKSet(APPLE_JWKS_URL, {
  cooldownDuration: 30_000,
  cacheMaxAge: 10 * 60_000,
});

export interface AppleTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  aud: string;
  iss: string;
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
  if (!identityToken) {
    throw new Error("Identity token ausente");
  }

  const { payload } = await jwtVerify(identityToken, jwks, {
    issuer: APPLE_ISSUER,
    audience: APPLE_AUDIENCES,
  });

  if (!payload.sub) {
    throw new Error("Token Apple inválido: sub ausente");
  }

  return payload as unknown as AppleTokenPayload;
}
