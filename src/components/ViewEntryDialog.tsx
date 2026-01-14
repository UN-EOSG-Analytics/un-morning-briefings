'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MorningMeetingEntry, PRIORITIES } from '@/types/morning-meeting';
import { getPriorityBadgeClass } from '@/lib/useEntriesFilter';
import { Edit, Trash2, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface ViewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: (MorningMeetingEntry & { [key: string]: any }) | null;
  onDelete?: (id: string) => void;
  onApprove?: (entry: any) => void;
  showApproveButton?: boolean;
}

export function ViewEntryDialog({ 
  open, 
  onOpenChange, 
  entry,
  onDelete,
  onApprove,
  showApproveButton = false,
}: ViewEntryDialogProps) {
  const [summary, setSummary] = useState<string[] | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Clear summary when entry changes or dialog closes
  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
  }, [entry?.id, open]);

  const handleGenerateSummary = async () => {
    if (!entry?.entry) return;
    
    setIsGeneratingSummary(true);
    setSummaryError(null);
    
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: entry.entry }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Summary generation error:', error);
      setSummaryError('Failed to generate summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-full sm:w-[95vw] md:w-[85vw] lg:w-[70vw] max-h-[95vh] flex flex-col !pt-6 sm:!pt-8 !pb-4 sm:!pb-6">
        <DialogHeader className="border-b border-slate-200 pb-4 pr-12">
          <div className="flex items-start justify-between gap-4 w-full">
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
            
            {/* AI Summary Button - Right side, with spacing for close button */}
            <Button
              size="sm"
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="bg-[#009edb] hover:bg-[#0080b8] text-white gap-2 shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
            </Button>
          </div>
        </DialogHeader>
        
        {/* AI Summary Box - Below header */}
        {(summary || summaryError) && (
          <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-slate-200">
            {summary && (
              <div className="rounded-lg border-2 border-[#009edb] bg-[#009edb]/5 p-4">
                <div className="text-sm font-semibold text-[#009edb] mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Key Points
                </div>
                <ul className="space-y-2">
                  {summary.map((point, index) => (
                    <li key={index} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-[#009edb] font-bold shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {summaryError && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                <div className="text-sm text-red-700">{summaryError}</div>
              </div>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            ::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {/* Entry metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-3 mb-6 py-4 border-b border-slate-200">
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
        <div className="border-t border-slate-200 pt-3 sm:pt-4 flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-2 px-4 sm:px-6">
          <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
            <Link href={`/form?edit=${entry.id}`} className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            
            {showApproveButton && onApprove && (
              <Button
                variant="outline"
                onClick={() => onApprove(entry)}
                className="gap-2 w-full sm:w-auto"
              >
                {entry.approved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Approved
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
            )}

            {onDelete && entry.id && (
              <Button
                variant="outline"
                onClick={() => onDelete(entry.id!)}
                className="gap-2 w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
