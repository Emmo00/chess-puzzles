import { NextResponse } from "next/server";

import {
  applyRateLimit,
  isRateLimitExceeded,
} from "@/lib/security/requestProtection";

type LimitRule = {
  scopeSuffix: string;
  key: string;
  maxRequests: number;
  windowMs: number;
};

type EnforceLimitOptions = {
  endpoint: string;
  rules: LimitRule[];
};

export const enforceRateLimitOrResponse = ({
  endpoint,
  rules,
}: EnforceLimitOptions) => {
  const evaluated = rules.map((rule) =>
    applyRateLimit({
      scope: `${endpoint}:${rule.scopeSuffix}`,
      key: rule.key,
      maxRequests: rule.maxRequests,
      windowMs: rule.windowMs,
    })
  );

  const exceeded = isRateLimitExceeded(evaluated);
  if (!exceeded) {
    return null;
  }

  return NextResponse.json(
    {
      message: `Rate limit exceeded (${exceeded.scope}). Please retry later.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(exceeded.retryAfterSeconds),
      },
    }
  );
};
