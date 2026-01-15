'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MorningMeetingEntry, PRIORITIES } from '@/types/morning-meeting';
import { getPriorityBadgeClass } from '@/lib/useEntriesFilter';
import { usePopup } from '@/lib/popup-context';
import { Edit, Trash2, Check, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

interface ViewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: (MorningMeetingEntry & { [key: string]: any }) | null;
  onDelete?: (id: string) => void;
  onApprove?: (entry: any) => void;
  showApproveButton?: boolean;
  allEntries?: MorningMeetingEntry[];
}

export function ViewEntryDialog({ 
  open, 
  onOpenChange, 
  entry,
  onDelete,
  onApprove,
  showApproveButton = false,
  allEntries = [],
}: ViewEntryDialogProps) {
  const [summary, setSummary] = useState<string[] | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const { warning: showWarning, success: showSuccess } = usePopup();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const handleDelete = useCallback(() => {
    if (entry?.id && onDelete) {
      onDelete(entry.id);
    }
  }, [entry?.id, onDelete]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && allEntries.length > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      // Entry will update automatically through effect
    }
  }, [currentIndex, allEntries.length]);

  const handleNext = useCallback(() => {
    if (currentIndex < allEntries.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      // Entry will update automatically through effect
    }
  }, [currentIndex, allEntries.length]);

  // Update current index when entry changes (from parent)
  useEffect(() => {
    if (entry && allEntries.length > 0) {
      const index = allEntries.findIndex(e => e.id === entry.id);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  // Get the current entry from allEntries if available
  const displayEntry = allEntries.length > 0 ? allEntries[currentIndex] : entry;

  const handleApprove = useCallback(async (status: 'pending' | 'approved' | 'denied') => {
    if (!displayEntry?.id) return;
    
    setIsUpdatingApproval(true);
    try {
      const response = await fetch('/api/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: displayEntry.id, approvalStatus: status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update approval status');
      }

      const statusLabels = {
        approved: 'Approved',
        denied: 'Denied',
        pending: 'Pending'
      };

      showSuccess(
        statusLabels[status],
        `Entry status changed to ${statusLabels[status].toLowerCase()}`
      );

      // Call the onApprove callback to refresh the data
      if (onApprove) {
        onApprove({ ...displayEntry, approvalStatus: status });
      }
    } catch (error) {
      console.error('Approval update error:', error);
      showWarning('Update Failed', 'Failed to update approval status. Please try again.');
    } finally {
      setIsUpdatingApproval(false);
    }
  }, [displayEntry, onApprove, showSuccess, showWarning]);

  // Clear summary when entry changes or dialog closes
  useEffect(() => {
    setSummary(null);
  }, [displayEntry?.id, open]);

  const handleGenerateSummary = async () => {
    if (!displayEntry?.entry) return;
    
    setIsGeneratingSummary(true);
    
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: displayEntry.entry }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to generate summary';
        
        // Check if it's an API key configuration error
        if (errorMessage.includes('GEMINI_API_KEY') || errorMessage.includes('not configured')) {
          showWarning('AI Usage not enabled', 'Please wait for Update');
        } else {
          showWarning('Summary Failed', 'Failed to generate summary. Please try again.');
        }
        return;
      }
      
      const data = await response.json();
      setSummary(data.summary);
      showSuccess('Summary Generated', 'AI summary created successfully.');
    } catch (error) {
      console.error('Summary generation error:', error);
      showWarning('AI Usage not enabled', 'Please wait for Update');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!displayEntry) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-none w-screen h-dvh sm:w-[95vw] sm:h-[90vh] md:w-[85vw] md:h-[90vh] lg:w-[70vw] lg:h-[90vh] flex flex-col !p-0 rounded-none sm:rounded-lg overflow-hidden">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          {displayEntry.headline}
        </DialogTitle>
        
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 py-2 sm:py-3 sm:pt-6 px-3 sm:px-6">
          <h2 className="text-base sm:text-2xl font-bold text-slate-900 mb-0 sm:mb-1 line-clamp-2">
            {displayEntry.headline}
          </h2>
        </div>
        
        {/* Badges and AI Button - Fixed */}
        <div className="flex-shrink-0 px-3 sm:px-6 py-2 border-b border-slate-200 flex gap-2 bg-white">
          <div className="flex gap-2 flex-wrap items-start">
            {/* Date Badge */}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {new Date(displayEntry.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {/* Priority Badge */}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityBadgeClass(displayEntry.priority)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${displayEntry.priority === 'sg-attention' ? 'bg-red-600' : 'bg-blue-600'}`} />
              {PRIORITIES.find(p => p.value === displayEntry.priority)?.label}
            </span>
          </div>
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className="bg-[#009edb] hover:bg-[#0080b8] text-white gap-1 text-xs sm:text-sm px-2 py-0.5 sm:px-3 sm:py-2 h-auto"
            >
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{isGeneratingSummary ? 'Generating...' : 'Create Summary'}</span>
              <span className="sm:hidden">{isGeneratingSummary ? '...' : 'AI'}</span>
            </Button>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            ::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {/* AI Summary Box - Inside scrollable area */}
          {summary && (
            <div className="pt-2 pb-1 border-b border-slate-200 mb-2">
              <div className="rounded-lg border-2 border-[#009edb] bg-[#009edb]/5 p-3">
                <div className="text-xs sm:text-sm font-semibold text-[#009edb] mb-2 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                  Key Points
                </div>
                <ul className="space-y-1">
                  {summary.map((point, index) => (
                    <li key={index} className="text-xs sm:text-sm text-slate-700 flex gap-2">
                      <span className="text-[#009edb] font-bold shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Entry metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 sm:gap-x-4 gap-y-1 mb-2 py-1.5 sm:py-4 border-b border-slate-200">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide">Region</div>
              <div className="text-xs sm:text-base text-slate-900 line-clamp-2">{displayEntry.region}</div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide">Country</div>
              <div className="text-xs sm:text-base text-slate-900 line-clamp-2">{displayEntry.country}</div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide">Category</div>
              <div className="text-xs sm:text-base text-slate-900 line-clamp-2">{displayEntry.category}</div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide">Author</div>
              <div className="text-xs sm:text-base text-slate-900 line-clamp-2">{displayEntry.author || 'N/A'}</div>
            </div>
          </div>

          {/* Entry content */}
          <div className="mb-6">
            <div
              className="entry-content"
              dangerouslySetInnerHTML={{
                __html: displayEntry.entry,
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
          {displayEntry.puNote && (
            <div className="mb-2 pb-2 border-b border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                PU Notes
              </div>
              <div className="text-xs sm:text-sm text-slate-700 break-words whitespace-pre-wrap">
                {displayEntry.puNote}
              </div>
            </div>
          )}

          {/* Source URL */}
          {displayEntry.sourceUrl && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Source URL
              </div>
              <a
                href={displayEntry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue hover:underline break-all text-sm"
              >
                {displayEntry.sourceUrl}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-2 pb-2 sm:pt-4 sm:pb-4 px-3 sm:px-6 flex-shrink-0 bg-white flex flex-col sm:flex-row gap-2">
          {/* Mobile: Navigation buttons */}
          {allEntries.length > 1 && (
            <div className="flex gap-2 justify-center sm:hidden mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="gap-1 h-8 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </Button>
              <span className="flex items-center text-xs text-slate-600">
                {currentIndex + 1} of {allEntries.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex >= allEntries.length - 1}
                className="gap-1 h-8 text-xs"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Approve/Deny buttons - shown above on mobile */}
          {showApproveButton && onApprove && (
            <div className="flex gap-2 w-full sm:hidden mb-2">
              <Button
                variant={displayEntry.approvalStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => handleApprove('approved')}
                disabled={isUpdatingApproval}
                className={`gap-1 flex-1 h-8 text-xs ${
                  displayEntry.approvalStatus === 'approved'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : displayEntry.approvalStatus === 'denied'
                    ? 'opacity-50 text-green-600 hover:opacity-100 hover:bg-green-50 hover:text-green-700'
                    : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <Check className="h-3 w-3" />
                Approve
              </Button>
              
              <Button
                variant={displayEntry.approvalStatus === 'denied' ? 'default' : 'outline'}
                onClick={() => handleApprove('denied')}
                disabled={isUpdatingApproval}
                className={`gap-1 flex-1 h-8 text-xs ${
                  displayEntry.approvalStatus === 'denied'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : displayEntry.approvalStatus === 'approved'
                    ? 'opacity-50 text-red-600 hover:opacity-100 hover:bg-red-50 hover:text-red-700'
                    : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                <X className="h-3 w-3" />
                Deny
              </Button>
            </div>
          )}

          {/* Action buttons - Mobile layout */}
          <div className="flex flex-col gap-2 sm:hidden">
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/form?edit=${displayEntry.id}`}>
                <Button
                  variant="outline"
                  className="gap-2 h-8 text-xs px-3 w-full"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              </Link>
              
              <Button
                onClick={() => handleOpenChange(false)}
                variant="outline"
                className="gap-2 h-8 text-xs px-3"
              >
                <X className="h-3 w-3" />
                Close
              </Button>
            </div>
          </div>

          {/* Action buttons - Desktop layout */}
          <div className="hidden sm:flex gap-2 justify-between items-center w-full">
            {/* Left: Edit/Close */}
            <div className="flex gap-2">
              <Link href={`/form?edit=${displayEntry.id}`}>
                <Button
                  variant="outline"
                  className="gap-2 h-8 text-xs px-3"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              </Link>
              
              <Button
                onClick={() => handleOpenChange(false)}
                variant="outline"
                className="gap-2 h-8 text-xs px-3"
              >
                <X className="h-3 w-3" />
                Close
              </Button>
            </div>

            {/* Middle: Navigation */}
            {allEntries.length > 1 && (
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="gap-1 h-8 text-xs"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Previous
                </Button>
                <span className="text-xs text-slate-600 whitespace-nowrap">
                  {currentIndex + 1} of {allEntries.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex >= allEntries.length - 1}
                  className="gap-1 h-8 text-xs"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Right: Approve/Deny/Delete */}
            <div className="flex gap-2">
              {showApproveButton && onApprove && (
                <>
                  <Button
                    variant={displayEntry.approvalStatus === 'approved' ? 'default' : 'outline'}
                    onClick={() => handleApprove('approved')}
                    disabled={isUpdatingApproval}
                    className={`gap-2 h-8 text-xs ${
                      displayEntry.approvalStatus === 'approved'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : displayEntry.approvalStatus === 'denied'
                        ? 'opacity-50 text-green-600 hover:opacity-100 hover:bg-green-50 hover:text-green-700'
                        : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  
                  <Button
                    variant={displayEntry.approvalStatus === 'denied' ? 'default' : 'outline'}
                    onClick={() => handleApprove('denied')}
                    disabled={isUpdatingApproval}
                    className={`gap-2 h-8 text-xs ${
                      displayEntry.approvalStatus === 'denied'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : displayEntry.approvalStatus === 'approved'
                        ? 'opacity-50 text-red-600 hover:opacity-100 hover:bg-red-50 hover:text-red-700'
                        : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <X className="h-4 w-4" />
                    Deny
                  </Button>
                </>
              )}

              {onDelete && displayEntry.id && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="gap-2 h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
