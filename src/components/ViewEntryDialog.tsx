'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { MorningMeetingEntry, PRIORITIES } from '@/types/morning-meeting';
import { getPriorityBadgeClass } from '@/lib/useEntriesFilter';

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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-3">
                {entry.headline}
              </DialogTitle>
              <div className="flex gap-2 flex-wrap">
                {/* Date Badge */}
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {/* Priority Badge */}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityBadgeClass(entry.priority)}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${entry.priority === 'sg-attention' ? 'bg-red-600' : 'bg-blue-600'}`} />
                  {PRIORITIES.find(p => p.value === entry.priority)?.label}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {/* Entry metadata */}
          <div className="grid grid-cols-4 gap-x-6 gap-y-3 mb-6 py-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Region</div>
              <div className="text-sm text-slate-900">{entry.region}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</div>
              <div className="text-sm text-slate-900">{entry.country}</div>
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
              className="entry-content"
              dangerouslySetInnerHTML={{
                __html: entry.entry,
              }}
            />
            <style jsx global>{`
              .entry-content {
                color: #1f2937;
                line-height: 1.6;
              }
              .entry-content p {
                margin-bottom: 1rem;
              }
              .entry-content h1,
              .entry-content h2,
              .entry-content h3,
              .entry-content h4,
              .entry-content h5,
              .entry-content h6 {
                margin-top: 1.25rem;
                margin-bottom: 0.75rem;
                font-weight: 600;
                line-height: 1.3;
              }
              .entry-content h1 {
                font-size: 1.875rem;
              }
              .entry-content h2 {
                font-size: 1.5rem;
              }
              .entry-content h3 {
                font-size: 1.25rem;
              }
              .entry-content h4 {
                font-size: 1.125rem;
              }
              .entry-content strong,
              .entry-content b {
                font-weight: 700;
              }
              .entry-content em,
              .entry-content i {
                font-style: italic;
              }
              .entry-content a {
                color: #2563eb;
                text-decoration: underline;
              }
              .entry-content a:hover {
                color: #1d4ed8;
              }
              .entry-content blockquote {
                border-left: 3px solid #009edb !important;
                padding-left: 1rem !important;
                margin: 0.5rem 0 !important;
                color: #495057 !important;
                font-style: italic !important;
              }
              .entry-content code {
                background-color: #f1f5f9;
                padding: 0.125rem 0.375rem;
                border-radius: 0.25rem;
                font-family: monospace;
                font-size: 0.875em;
              }
              .entry-content pre {
                background-color: #1e293b;
                color: #e2e8f0;
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin: 1rem 0;
                font-family: monospace;
                font-size: 0.875rem;
                line-height: 1.5;
              }
              .entry-content pre code {
                background-color: transparent;
                padding: 0;
                color: inherit;
              }
              .entry-content ul,
              .entry-content ol {
                margin: 1rem 0 1rem 1.5rem;
              }
              .entry-content li {
                margin-bottom: 0.5rem;
              }
              .entry-content ul li {
                list-style-type: disc;
              }
              .entry-content ol li {
                list-style-type: decimal;
              }
              .entry-content img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 1rem 0;
                border-radius: 0.375rem;
              }
              .entry-content hr {
                border: none;
                border-top: 2px solid #dee2e6;
                margin: 1rem 0;
              }
              .entry-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 1rem 0;
              }
              .entry-content th,
              .entry-content td {
                border: 1px solid #e2e8f0;
                padding: 0.75rem;
                text-align: left;
              }
              .entry-content th {
                background-color: #f8fafc;
                font-weight: 600;
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
