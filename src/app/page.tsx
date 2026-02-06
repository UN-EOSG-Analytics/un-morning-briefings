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
                Hello, {session?.user?.name?.split(" ")[0] || "Officer"}!
            </h1>
            <p className="hidden text-base text-slate-600 sm:block sm:text-lg">
              Create and manage Morning Meeting Update entries
            </p>
          </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="w-full justify-center sm:h-10 sm:w-auto sm:px-6"
            >
              <FileDown className="h-4 w-4" />
              <span className="sm:inline">Export Daily Briefing</span>
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
                      Create Entry
                    </h2>
                    <p className="text-xs text-slate-600">
                      Submit a new morning meeting briefing entry
                    </p>
                  </div>
                </div>
                <div className="hidden flex-col sm:flex">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-un-blue">
                    <PlusCircle className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
                    Create Entry
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    Submit a new morning meeting briefing entry with key updates
                    and information
                  </p>
                </div>
                <Button
                  className="mt-auto hidden w-full bg-un-blue hover:bg-un-blue/90 sm:flex"
                  size="lg"
                >
                  Create
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
                      Current Briefing{" "}
                    </h2>
                    <p className="text-xs text-slate-600">
                      View briefing entries for{" "}
                      {formatDateDesktop(currentBriefingDate)}
                    </p>
                  </div>
                </div>
                <div className="hidden flex-col sm:flex">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-700">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
                    Current Briefing
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    View briefing entries for the Morning Meeting on{" "}
                    <span className="font-semibold">
                      {formatDateDesktop(currentBriefingDate)}
                    </span>
                    .
                  </p>
                </div>
                <Button
                  className="mt-auto hidden w-full bg-slate-700 hover:bg-slate-700/90 sm:flex"
                  size="lg"
                >
                  View
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
                      Archive
                    </h2>
                    <p className="text-xs text-slate-600">Browse all entries</p>
                  </div>
                </div>
                <div className="hidden flex-col sm:flex">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <Archive className="h-8 w-8 text-slate-700" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
                    Archive
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    Browse, filter, and manage all submitted morning meeting
                    briefing entries
                  </p>
                </div>
                <Button
                  className="mt-auto hidden w-full bg-slate-200 text-slate-700 hover:bg-slate-300 sm:flex"
                  size="lg"
                >
                  View All
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
