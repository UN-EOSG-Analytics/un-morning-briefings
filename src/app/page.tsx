"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PlusCircle,
  FileText,
  Archive,
  ArrowRight,
  Download,
  FileDown,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ExportDailyBriefingDialog } from "@/components/ExportDailyBriefingDialog";
import { getCurrentBriefingDate } from "@/lib/useEntriesFilter";
import { formatDateDesktop } from "@/lib/format-date";
import labels from "@/lib/labels.json";

export default function HomePage() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { data: session } = useSession();

  // Get current briefing date based on 8AM ET cutoff
  const currentBriefingDate = getCurrentBriefingDate();

  return (
    <main className="flex flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-2 py-6 sm:px-4 sm:py-16">
        <div className="mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="px-2 text-left sm:px-0">
            <h1 className="mb-1 text-3xl font-bold text-foreground sm:text-4xl">
                {labels.home.greeting.replace("{name}", session?.user?.name?.split(" ")[0] || "...")}
            </h1>
            <p className="hidden text-base text-slate-600 sm:block sm:text-lg">
              {labels.home.subtitle}
            </p>
          </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="w-full justify-center sm:h-10 sm:w-auto sm:px-6"
            >
              <FileDown className="h-4 w-4" />
              <span className="sm:inline">{labels.entries.actions.exportBriefing}</span>
            </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {/* Enter Form Card */}
          <Link href="/form" className="group">
            <Card className="h-full cursor-pointer border-slate-200 p-4 transition-colors hover:border-un-blue sm:p-8 sm:hover:shadow-md">
              <div className="items-left flex h-full flex-col space-y-0 text-left sm:flex-col sm:space-y-4">
                <div className="flex items-center gap-3 sm:hidden">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-un-blue">
                    <PlusCircle className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-lg font-semibold text-foreground">
                      {labels.home.cards.create.title}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {labels.home.cards.create.descriptionShort}
                    </p>
                  </div>
                </div>
                <div className="hidden flex-col sm:flex">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-un-blue">
                    <PlusCircle className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
                    {labels.home.cards.create.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    {labels.home.cards.create.descriptionLong}
                  </p>
                </div>
                <Button
                  className="mt-auto hidden w-full bg-un-blue hover:bg-un-blue/90 sm:flex"
                  size="lg"
                >
                  {labels.home.cards.create.button}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Link>

          {/* Current Briefing Card */}
          <Link href={`/list?date=${currentBriefingDate}`} className="group">
            <Card className="h-full cursor-pointer border-slate-200 p-4 transition-colors hover:border-un-blue sm:p-8 sm:hover:shadow-md">
              <div className="items-left flex h-full flex-col space-y-0 text-left sm:flex-col sm:space-y-4">
                <div className="flex items-center gap-3 sm:hidden">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-700">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-lg font-semibold text-foreground">
                      {labels.home.cards.currentBriefing.title}{" "}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {labels.home.cards.currentBriefing.descriptionShort.replace("{date}", formatDateDesktop(currentBriefingDate))}
                    </p>
                  </div>
                </div>
                <div className="hidden flex-col sm:flex">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-700">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
                    {labels.home.cards.currentBriefing.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    {labels.home.cards.currentBriefing.descriptionLong.replace("{date}", "")}
                    <span className="font-semibold">
                      {formatDateDesktop(currentBriefingDate)}
                    </span>.
                  </p>
                </div>
                <Button
                  className="mt-auto hidden w-full bg-slate-700 hover:bg-slate-700/90 sm:flex"
                  size="lg"
                >
                  {labels.home.cards.currentBriefing.button}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Link>

          {/* Archive Card */}
          <Link href="/list" className="group">
            <Card className="h-full cursor-pointer border-slate-200 p-4 transition-colors hover:border-un-blue sm:p-8 sm:hover:shadow-md">
              <div className="items-left flex h-full flex-col space-y-0 text-left sm:flex-col sm:space-y-4">
                <div className="flex items-center gap-3 sm:hidden">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <Archive className="h-8 w-8 text-slate-700" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-lg font-semibold text-foreground">
                      {labels.home.cards.archive.title}
                    </h2>
                    <p className="text-xs text-slate-600">{labels.home.cards.archive.descriptionShort}</p>
                  </div>
                </div>
                <div className="hidden flex-col sm:flex">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <Archive className="h-8 w-8 text-slate-700" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
                    {labels.home.cards.archive.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    {labels.home.cards.archive.descriptionLong}
                  </p>
                </div>
                <Button
                  className="mt-auto hidden w-full bg-slate-200 text-slate-700 hover:bg-slate-300 sm:flex"
                  size="lg"
                >
                  {labels.home.cards.archive.button}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Link>
        </div>

        <ExportDailyBriefingDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
      </div>
    </main>
  );
}
