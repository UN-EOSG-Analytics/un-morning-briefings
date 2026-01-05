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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-left mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-1">
            Morning Meeting Briefings
          </h1>
          <p className="text-lg text-slate-600">
            Create and manage daily briefing entries
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* New Entry Card */}
          <Card className="border-slate-200 p-8 hover:border-un-blue transition-colors">
            <div className="flex flex-col items-left text-left space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-un-blue">
                <PlusCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Create New Entry</h2>
              <p className="text-slate-600">
                Submit a new morning meeting briefing entry with key updates and information
              </p>
              <Link href="/form" className="w-full">
                <Button className="w-full bg-un-blue" size="lg">
                  Create
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* View Entries Card */}
          <Card className="border-slate-200 p-8 hover:border-un-blue transition-colors">
            <div className="flex flex-col items-left text-left space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                <List className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">View Entries</h2>
              <p className="text-slate-600">
                Browse, filter, and manage all submitted morning meeting briefing entries
              </p>
              <Link href="/list" className="w-full">
                <Button className="w-full bg-slate-700" size="lg">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
          {/* View Entries Card */}
          <Card className="border-slate-200 p-8 hover:border-un-blue transition-colors">
            <div className="flex flex-col items-left text-left space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                <FileEdit className="h-8 w-8 text-black" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">View Drafts</h2>
              <p className="text-slate-600">
                Work on your previously saved drafts before submitting final entries
              </p>
              <Link href="/drafts" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  View Drafts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Export Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => setShowExportDialog(true)}
            className="bg-un-blue hover:bg-un-blue/90"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Today's Morning Briefing
          </Button>
        </div>

        <ExportDailyBriefingDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
      </div>
    </main>
  );
}
