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

  // Debug: Log entry content
  console.log('ViewEntryDialog: Rendering entry with HTML length:', entry.entry?.length);
  console.log('ViewEntryDialog: HTML preview:', entry.entry?.substring(0, 500));
  console.log('ViewEntryDialog: Images array:', entry.images);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[50vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {entry.headline}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {/* Entry metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 mb-6 py-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</div>
              <div className="text-sm text-slate-900">
                {new Date(entry.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Region</div>
              <div className="text-sm text-slate-900">{entry.region}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</div>
              <div className="text-sm text-slate-900">{entry.country}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</div>
              <div className="text-sm text-slate-900">{entry.priority === 'sg-attention' ? 'SG Attention' : 'Regular'}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</div>
              <div className="text-sm text-slate-900">{entry.category}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</div>
              <div className="text-sm text-slate-900">{entry.source || 'N/A'}</div>
            </div>
          </div>

          {/* Entry content */}
          <div className="mb-6">
            <div
              className="text-slate-700 space-y-4 break-words whitespace-pre-wrap entry-content"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              dangerouslySetInnerHTML={{
                __html: entry.entry,
              }}
            />
            <style jsx>{`
              .entry-content :global(img) {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 1rem 0;
              }
            `}</style>
          </div>

          {/* PU notes */}
          {(entry.puNote || entry.pu_notes) && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                PU Notes
              </div>
              <div className="text-sm text-slate-700 break-words whitespace-pre-wrap">
                {entry.puNote || entry.pu_notes}
              </div>
            </div>
          )}

          {/* Source URL */}
          {(entry.sourceUrl || entry.source_url) && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Source URL
              </div>
              <a
                href={entry.sourceUrl || entry.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue hover:underline break-all text-sm"
              >
                {entry.sourceUrl || entry.source_url}
              </a>
            </div>
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
