'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { MorningMeetingEntry } from '@/types/morning-meeting';

interface ViewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: (MorningMeetingEntry & { [key: string]: any }) | null;
}

export function ViewEntryDialog({ open, onOpenChange, entry }: ViewEntryDialogProps) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {entry.headline}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Entry metadata */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <Card className="border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Date
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {new Date(entry.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </Card>

            <Card className="border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Region
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {entry.region}
              </div>
            </Card>

            <Card className="border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Country
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {entry.country}
              </div>
            </Card>

            <Card className="border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Priority
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {entry.priority === 'sg-attention' ? 'SG Attention' : 'Regular'}
              </div>
            </Card>

            <Card className="border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Category
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {entry.category}
              </div>
            </Card>

            <Card className="border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Source
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {entry.source || 'N/A'}
              </div>
            </Card>
          </div>

          {/* Entry content */}
          <Card className="border-slate-200 p-6 mb-6">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Content
            </div>
            <div className="prose prose-sm max-w-none">
              <div
                className="text-slate-700 space-y-4"
                dangerouslySetInnerHTML={{
                  __html: entry.entry,
                }}
              />
            </div>
          </Card>

          {/* PU notes */}
          {(entry.puNote || entry.pu_notes) && (
            <Card className="border-slate-200 p-6 mb-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                PU Notes
              </div>
              <div className="text-sm text-slate-700">
                {entry.puNote || entry.pu_notes}
              </div>
            </Card>
          )}

          {/* Source URL */}
          {(entry.sourceUrl || entry.source_url) && (
            <Card className="border-slate-200 p-6 mb-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Source URL
              </div>
              <a
                href={entry.sourceUrl || entry.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue hover:underline break-all"
              >
                {entry.sourceUrl || entry.source_url}
              </a>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
