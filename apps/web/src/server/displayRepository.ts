import { createHash } from "node:crypto";
import type { Display, DisplayToken } from "@/domain/models";

export type DisplayResolution =
  | { status: "valid"; display: Display }
  | { status: "revoked" | "expired" | "invalid" };

export interface DisplayRepository {
  resolveToken(rawToken: string, now?: Date): Promise<DisplayResolution>;
}

type EnvironmentDisplay = {
  id: string;
  token: string;
  siteId: string;
  venueName?: string;
  preferredLines?: string[];
  refreshSeconds?: number;
  createdAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  active?: boolean;
};

const tokenHash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

export class EnvironmentDisplayRepository implements DisplayRepository {
  private readonly records: Array<{ display: Display; token: DisplayToken }>;

  constructor(rawConfig = process.env.DISPLAY_CONFIGS_JSON ?? "[]") {
    let configured: EnvironmentDisplay[] = [];
    try {
      const parsed = JSON.parse(rawConfig) as EnvironmentDisplay[];
      configured = Array.isArray(parsed) ? parsed : [];
    } catch {
      configured = [];
    }

    this.records = configured
      .filter((item) => item.id && item.token && /^\d+$/.test(item.siteId))
      .map((item) => ({
        display: {
          id: item.id,
          siteId: item.siteId,
          venueName: item.venueName,
          preferredLines: item.preferredLines ?? [],
          refreshSeconds: Math.max(10, Math.min(120, item.refreshSeconds ?? 20)),
          tokenId: `${item.id}:v1`,
          active: item.active !== false
        },
        token: {
          id: `${item.id}:v1`,
          displayId: item.id,
          tokenHash: tokenHash(item.token),
          createdAt: item.createdAt ?? new Date(0).toISOString(),
          expiresAt: item.expiresAt,
          revokedAt: item.revokedAt
        }
      }));
  }

  async resolveToken(rawToken: string, now = new Date()): Promise<DisplayResolution> {
    const hash = tokenHash(rawToken);
    const record = this.records.find((item) => item.token.tokenHash === hash);
    if (!record) return { status: "invalid" };
    if (record.token.revokedAt || !record.display.active) return { status: "revoked" };
    if (record.token.expiresAt && new Date(record.token.expiresAt).getTime() <= now.getTime()) {
      return { status: "expired" };
    }
    return { status: "valid", display: record.display };
  }
}

export const displayRepository: DisplayRepository = new EnvironmentDisplayRepository();
