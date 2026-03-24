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
    <div className="bg-background h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 flex flex-col gap-6 h-full">

        {/* Header — matches analytics page */}
        <Card className="border-slate-200 py-0 shrink-0">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                <Activity className="h-5 w-5 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                  System Health
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
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
        <Card className="border-slate-200 py-0 shrink-0">
          <div className="divide-y divide-slate-100">
            {rows.map(([key, check]) => {
              const meta = CHECK_META[key] ?? { label: key, description: "" };
              return (
                <div key={key} className="flex items-center gap-4 px-6 py-4">
                  {check.ok ? (
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {meta.label}
                    </p>
                    {check.ok ? (
                      <p className="text-xs text-slate-500">{meta.description}</p>
                    ) : (
                      <p className="text-xs text-red-500 mt-0.5 wrap-break-word">
                        {check.error}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
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

        <p className="text-xs text-slate-400 shrink-0">
          Only accessible to authenticated users.
        </p>
      </main>
    </div>
  );
}
