import jwt from "jsonwebtoken";
import { z } from "zod";

const TokenPayload = z.object({
  deviceId: z.string().uuid()
});
export type TokenPayload = z.infer<typeof TokenPayload>;

export function signDeviceToken(deviceId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign({ deviceId }, secret, { expiresIn: "90d" });
}

export function verifyDeviceToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  const decoded = jwt.verify(token, secret);
  return TokenPayload.parse(decoded);
}
