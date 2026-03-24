import { CheckCircle, XCircle, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { query } from "@/lib/db";
import { generateText } from "ai";
import { createAzure } from "@ai-sdk/azure";

type Check = { ok: boolean; error?: string };

async function runChecks(): Promise<Record<string, Check>> {
  const checks: Record<string, Check> = {};

  // Database
  try {
    await query("SELECT 1");
    checks.database = { ok: true };
  } catch (e) {
    checks.database = {
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }

  // Azure OpenAI / AI Foundry
  try {
    const azure = createAzure({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      resourceName: process.env.AZURE_OPENAI_ENDPOINT?.match(
        /https?:\/\/([^.]+)\.openai\.azure\.com/,
      )?.[1],
    });
    await generateText({
      model: azure("gpt-4o"),
      prompt: "Reply with the single word: ok",
      maxOutputTokens: 16,
    });
    checks.ai = { ok: true };
  } catch (e) {
    checks.ai = {
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }

  return checks;
}

const CHECK_META: Record<string, { label: string; description: string }> = {
  database: {
    label: "Database",
    description: "PostgreSQL connection via PgBouncer",
  },
  ai: {
    label: "AI (Azure Foundry)",
    description: "GPT-4o via Azure OpenAI Foundry",
  },
};

export default async function HealthPage() {
  const checks = await runChecks();
  const allOk = Object.values(checks).every((c) => c.ok);
  const rows = Object.entries(checks);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      <main className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Header — matches analytics page */}
        <Card className="shrink-0 border-slate-200 py-0">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                <Activity className="h-5 w-5 text-black" />
              </div>
              <div>
                <h1 className="flex items-center gap-3 text-2xl font-semibold text-foreground">
                  System Health
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      allOk
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {allOk ? "all systems operational" : "degraded"}
                  </span>
                </h1>
                <p className="text-sm text-slate-600">
                  Live status of core infrastructure services
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Checks */}
        <Card className="shrink-0 border-slate-200 py-0">
          <div className="divide-y divide-slate-100">
            {rows.map(([key, check]) => {
              const meta = CHECK_META[key] ?? { label: key, description: "" };
              return (
                <div key={key} className="flex items-center gap-4 px-6 py-4">
                  {check.ok ? (
                    <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {meta.label}
                    </p>
                    {check.ok ? (
                      <p className="text-xs text-slate-500">
                        {meta.description}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs wrap-break-word text-red-500">
                        {check.error}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      check.ok
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {check.ok ? "ok" : "fail"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <p className="shrink-0 text-xs text-slate-400">
          Only accessible to authenticated users.
        </p>
      </main>
    </div>
  );
}
