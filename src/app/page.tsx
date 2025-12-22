'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, List, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Morning Meeting Briefings
          </h1>
          <p className="text-lg text-slate-600">
            Create and manage daily briefing entries for the morning meeting
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* New Entry Card */}
          <Card className="border-slate-200 p-8 hover:border-un-blue transition-colors">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-un-blue">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Create New Entry</h2>
              <p className="text-slate-600">
                Submit a new morning meeting briefing entry with details about regional events and developments
              </p>
              <Link href="/form" className="w-full">
                <Button className="w-full" size="lg">
                  Create Entry
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* View Entries Card */}
          <Card className="border-slate-200 p-8 hover:border-un-blue transition-colors">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                <List className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">View Entries</h2>
              <p className="text-slate-600">
                Browse, filter, and manage all submitted morning meeting briefing entries
              </p>
              <Link href="/list" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  View All Entries
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
