'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, List, ArrowRight, FileEdit, PlusCircle, Download } from 'lucide-react';
import { useState } from 'react';
import { ExportDailyBriefingDialog } from '@/components/ExportDailyBriefingDialog';

export default function HomePage() {
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <main className="min-h-[80svh] bg-background flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-2 sm:px-4 py-6 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="text-left px-2 sm:px-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
              Morning Meeting Briefings
            </h1>
            <p className="hidden sm:block text-base sm:text-lg text-slate-600">
              Create and manage daily briefing entries
            </p>
          </div>
          <Button
            onClick={() => setShowExportDialog(true)}
            className="bg-un-blue hover:bg-un-blue/90 w-full sm:w-auto sm:whitespace-nowrap shrink-0 px-2"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Today's Morning Briefing</span>
            <span className="sm:hidden">Export Briefing</span>
          </Button>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
          {/* New Entry Card */}
          <Link href="/form" className="group">
            <Card className="border-slate-200 p-4 sm:p-8 hover:border-un-blue transition-colors h-full cursor-pointer sm:hover:shadow-md">
              <div className="flex flex-col sm:flex-col items-left text-left space-y-0 h-full sm:space-y-4">
                <div className="flex sm:hidden gap-3 items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-un-blue shrink-0">
                    <PlusCircle className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <h2 className="text-lg font-semibold text-foreground">Create New Entry</h2>
                    <p className="text-xs text-slate-600">
                      Submit a new morning meeting briefing entry
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-un-blue shrink-0">
                    <PlusCircle className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-4">Create New Entry</h2>
                  <p className="text-sm sm:text-base text-slate-600 mt-2">
                    Submit a new morning meeting briefing entry with key updates and information
                  </p>
                </div>
                <Button className="hidden sm:flex w-full bg-un-blue hover:bg-un-blue/90 mt-auto" size="lg">
                  Create
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Link>

          {/* View Entries Card */}
          <Link href="/list" className="group">
            <Card className="border-slate-200 p-4 sm:p-8 hover:border-un-blue transition-colors h-full cursor-pointer sm:hover:shadow-md">
              <div className="flex flex-col sm:flex-col items-left text-left space-y-0 h-full sm:space-y-4">
                <div className="flex sm:hidden gap-3 items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 shrink-0">
                    <List className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <h2 className="text-lg font-semibold text-foreground">View Entries</h2>
                    <p className="text-xs text-slate-600">
                      Browse and manage all submitted entries
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 shrink-0">
                    <List className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-4">View Entries</h2>
                  <p className="text-sm sm:text-base text-slate-600 mt-2">
                    Browse, filter, and manage all submitted morning meeting briefing entries
                  </p>
                </div>
                <Button className="hidden sm:flex w-full bg-slate-700" size="lg">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Link>

          {/* My Drafts Card */}
          <Link href="/drafts" className="group">
            <Card className="border-slate-200 p-4 sm:p-8 hover:border-un-blue transition-colors h-full cursor-pointer sm:hover:shadow-md">
              <div className="flex flex-col sm:flex-col items-left text-left space-y-0 h-full sm:space-y-4">
                <div className="flex sm:hidden gap-3 items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent shrink-0">
                    <FileEdit className="h-8 w-8 text-black" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <h2 className="text-lg font-semibold text-foreground">My Drafts</h2>
                    <p className="text-xs text-slate-600">
                      Work on your previously saved drafts
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent shrink-0">
                    <FileEdit className="h-8 w-8 text-black" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-4">My Drafts</h2>
                  <p className="text-sm sm:text-base text-slate-600 mt-2">
                    Work on your previously saved drafts before submitting final entries
                  </p>
                </div>
                <Button variant="outline" className="hidden sm:flex w-full mt-auto" size="lg">
                  View Drafts
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
