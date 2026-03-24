"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MorningMeetingEntry, PRIORITIES } from "@/types/morning-meeting";
import { getPriorityBadgeClass } from "@/lib/useEntriesFilter";
import { usePopup } from "@/lib/popup-context";
import labels from "@/lib/labels.json";
import { formatDateResponsive, formatDateFull } from "@/lib/format-date";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  Edit,
  Trash2,
  Check,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FastForward,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

interface ViewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: (MorningMeetingEntry & { [key: string]: any }) | null;
  onDelete?: (id: string) => void;
  onApprove?: (entry: any) => void;
  onPostpone?: () => void;
  onUpdate?: (id: string, updates: any) => void;
  showApproveButton?: boolean;
  allEntries?: MorningMeetingEntry[];
}

export function ViewEntryDialog({
  open,
  onOpenChange,
  entry,
  onDelete,
  onApprove,
  onPostpone,
  onUpdate,
  showApproveButton = false,
  allEntries = [],
}: ViewEntryDialogProps) {
  const [summary, setSummary] = useState<string[] | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const [isEditingHeadline, setIsEditingHeadline] = useState(false);
  const [headlineValue, setHeadlineValue] = useState("");
  const { warning: showWarning, success: showSuccess } = usePopup();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );

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

  // Update current index and headline when entry changes (from parent)
  useEffect(() => {
    if (entry && allEntries.length > 0) {
      const index = allEntries.findIndex((e) => e.id === entry.id);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  // Get the current entry from allEntries if available
  const displayEntry = allEntries.length > 0 ? allEntries[currentIndex] : entry;

  // Initialize headline value when entry changes
  useEffect(() => {
    if (displayEntry?.headline) {
      setHeadlineValue(displayEntry.headline);
      setIsEditingHeadline(false);
    }
  }, [displayEntry?.headline, displayEntry?.id]);

  // Find previous entry - use useMemo instead of useCallback, depends on displayEntry
  const previousEntry = useMemo(() => {
    if (displayEntry?.previousEntryId && allEntries.length > 0) {
      return allEntries.find((e) => e.id === displayEntry.previousEntryId);
    }
    return undefined;
  }, [displayEntry?.previousEntryId, allEntries]);

  // Find follow-up entries (entries that reference this entry as previous) - use useMemo
  const followUpEntries = useMemo(() => {
    if (displayEntry?.id && allEntries.length > 0) {
      return allEntries.filter((e) => e.previousEntryId === displayEntry.id);
    }
    return [];
  }, [displayEntry?.id, allEntries]);

  // Reset scroll position when entry changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [displayEntry?.id]);

  const handleApprove = useCallback(
    async (status: "pending" | "discussed") => {
      if (!displayEntry?.id) return;

      setIsUpdatingApproval(true);
      try {
        const response = await fetch("/api/entries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: displayEntry.id, approvalStatus: status }),
        });

        if (!response.ok) {
          throw new Error("Failed to update approval status");
        }

        const statusLabels = {
          discussed: labels.entries.status.discussed,
          pending: labels.entries.status.pending,
        };

        showSuccess(
          statusLabels[status],
          `Entry status changed to ${statusLabels[status].toLowerCase()}`,
        );

        // Call the onApprove callback to refresh the data
        if (onApprove) {
          onApprove({ ...displayEntry, approvalStatus: status });
        }
      } catch (error) {
        console.error("Approval update error:", error);
        showWarning(
          labels.viewEntry.approval.updateFailed,
          labels.viewEntry.approval.updateFailedMessage,
        );
      } finally {
        setIsUpdatingApproval(false);
      }
    },
    [displayEntry, onApprove, showSuccess, showWarning],
  );

  const handlePostpone = useCallback(async () => {
    if (!displayEntry?.id) return;

    setIsUpdatingApproval(true);
    try {
      const response = await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: displayEntry.id, action: "postpone" }),
      });

      if (!response.ok) {
        throw new Error("Failed to postpone entry");
      }

      showSuccess(
        labels.viewEntry.approval.postponed,
        labels.viewEntry.approval.postponedMessage,
      );

      // Update the entry with new date and status
      if (onApprove) {
        const newDate = new Date(displayEntry.date);
        newDate.setDate(newDate.getDate() + 1);
        onApprove({
          ...displayEntry,
          date: newDate.toISOString(),
          approvalStatus: "pending",
        });
      }

      // Trigger refresh to reorder entries
      if (onPostpone) {
        onPostpone();
      }
    } catch (error) {
      console.error("Postpone error:", error);
      showWarning(
        labels.viewEntry.approval.postponeFailed,
        labels.viewEntry.approval.postponeFailedMessage,
      );
    } finally {
      setIsUpdatingApproval(false);
    }
  }, [displayEntry, onApprove, onPostpone, showSuccess, showWarning]);

  // Load saved AI summary when entry changes
  useEffect(() => {
    if (displayEntry?.aiSummary) {
      try {
        // Handle both string (JSON) and array formats
        const summary =
          typeof displayEntry.aiSummary === "string"
            ? JSON.parse(displayEntry.aiSummary)
            : displayEntry.aiSummary;

        if (Array.isArray(summary)) {
          setSummary(summary);
        } else {
          setSummary(null);
        }
      } catch (error) {
        console.error("Error parsing AI summary:", error);
        setSummary(null);
      }
    } else {
      setSummary(null);
    }
  }, [displayEntry?.id, open]);

  const handleGenerateSummary = async () => {
    if (!displayEntry?.entry || !displayEntry?.id) return;

    setIsGeneratingSummary(true);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: displayEntry.entry }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to generate summary";

        // Check if it's an API key configuration error
        if (
          errorMessage.includes("GEMINI_API_KEY") ||
          errorMessage.includes("not configured")
        ) {
          showWarning(
            labels.form.popups.aiDisabled,
            labels.form.popups.aiDisabledMessage,
          );
        } else {
          showWarning(
            labels.viewEntry.summary.failed,
            labels.viewEntry.summary.failedMessage,
          );
        }
        return;
      }

      const data = await response.json();
      setSummary(data.summary);

      // Save summary to backend
      try {
        await fetch("/api/entries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: displayEntry.id,
            aiSummary: data.summary,
          }),
        });
      } catch (error) {
        console.error("Error saving summary to backend:", error);
        // Don't show error to user - summary was still generated, just not saved
      }

      showSuccess(
        labels.viewEntry.summary.success,
        labels.viewEntry.summary.successMessage,
      );
    } catch (error) {
      console.error("Summary generation error:", error);
      showWarning(
        labels.form.popups.aiDisabled,
        labels.form.popups.aiDisabledMessage,
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleHeadlineSave = useCallback(async () => {
    if (!displayEntry?.id || !headlineValue.trim()) return;

    const newHeadline = headlineValue.trim();
    if (newHeadline === displayEntry.headline) {
      setIsEditingHeadline(false);
      return;
    }

    try {
      // Update backend
      const response = await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: displayEntry.id,
          headline: newHeadline,
        }),
      });

      if (!response.ok) {
        showWarning("Update failed", "Could not update headline");
        setHeadlineValue(displayEntry.headline);
        return;
      }

      // Call parent callback to update UI
      if (onUpdate) {
        onUpdate(displayEntry.id, { headline: newHeadline });
      }

      setIsEditingHeadline(false);
      showSuccess("Headline updated", "");
    } catch (error) {
      console.error("Error updating headline:", error);
      showWarning("Update failed", "Could not update headline");
      setHeadlineValue(displayEntry.headline);
    }
  }, [
    displayEntry?.id,
    displayEntry?.headline,
    headlineValue,
    onUpdate,
    showWarning,
    showSuccess,
  ]);

  if (!displayEntry) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-dvh w-screen !max-w-280 flex-col gap-0 overflow-hidden rounded-none !p-0 sm:h-[90vh] sm:w-[95vw] sm:rounded-lg md:h-[90vh] md:w-[85vw] lg:h-[90vh] lg:w-[70vw]">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">{displayEntry.headline}</DialogTitle>

        {/* Header - Fixed at top */}
        <div className="mt-2 flex-shrink-0 border-b border-slate-200 bg-white px-3 py-2 sm:px-6 sm:py-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            {isEditingHeadline ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={headlineValue}
                  onChange={(e) => setHeadlineValue(e.target.value)}
                  onBlur={handleHeadlineSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleHeadlineSave();
                    if (e.key === "Escape") {
                      setHeadlineValue(displayEntry.headline);
                      setIsEditingHeadline(false);
                    }
                  }}
                  autoFocus
                  maxLength={300}
                  className="flex-1 rounded border border-un-blue bg-white px-2 py-1 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-un-blue focus:outline-none sm:text-2xl"
                />
                <span className="text-xs whitespace-nowrap text-slate-500">
                  {headlineValue.length}/300
                </span>
              </div>
            ) : (
              <h2
                onClick={() => setIsEditingHeadline(true)}
                className="mb-0 line-clamp-2 flex-1 cursor-pointer text-lg font-bold text-slate-900 transition-colors hover:text-un-blue sm:text-2xl"
                title="Click to edit"
              >
                {displayEntry.headline}
              </h2>
            )}
          </div>
        </div>

        {/* Badges and AI Button - Fixed */}
        <div className="flex flex-shrink-0 items-stretch gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:gap-3 sm:px-6 sm:py-3">
          <div className="flex flex-1 flex-wrap items-center gap-1 sm:gap-2">
            {/* Date Badge */}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 sm:px-2.5 sm:py-1.5 sm:text-sm">
              <span className="hidden sm:inline">
                {formatDateResponsive(displayEntry.date).desktop}
              </span>
              <span className="sm:hidden">
                {formatDateResponsive(displayEntry.date).mobile}
              </span>
            </span>
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium sm:px-2.5 sm:py-1.5 sm:text-sm ${getPriorityBadgeClass(displayEntry.priority)}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${displayEntry.priority === "SG's attention" ? "bg-red-600" : "bg-blue-600"}`}
              />
              {PRIORITIES.find((p) => p.value === displayEntry.priority)?.label}
            </span>
            {/* Region Badge */}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 sm:px-2.5 sm:py-1.5 sm:text-sm">
              {displayEntry.region}
            </span>
            {/* Country Badge(s) */}
            {(() => {
              const countries = Array.isArray(displayEntry.country)
                ? displayEntry.country
                : displayEntry.country
                  ? [displayEntry.country]
                  : [];
              return countries.map((country, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 sm:px-2.5 sm:py-1.5 sm:text-sm"
                >
                  {country}
                </span>
              ));
            })()}
            {/* Category Badge */}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 sm:px-2.5 sm:py-1.5 sm:text-sm">
              {displayEntry.category}
            </span>
            {/* Author Badge */}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 sm:px-2.5 sm:py-1.5 sm:text-sm">
              {displayEntry.author || labels.viewEntry.notAvailable}
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className={`flex h-full shrink-0 items-center justify-center gap-1 bg-un-blue px-2.5 text-xs text-white hover:bg-un-blue/80 sm:px-3 sm:text-sm ${summary ? "opacity-50" : ""}`}
          >
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">
              {isGeneratingSummary
                ? labels.viewEntry.generating
                : labels.viewEntry.createSummary}
            </span>
            <span className="sm:hidden">
              {isGeneratingSummary ? "..." : labels.viewEntry.ai}
            </span>
          </Button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-3 py-1 sm:px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`
            ::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {/* AI Summary Box - Inside scrollable area */}
          {summary && (
            <div className="mb-2 border-b border-slate-200 pt-2 pb-1">
              <div className="rounded-lg border-2 border-un-blue bg-un-blue/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-un-blue sm:text-sm">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                  {labels.viewEntry.keyPoints}
                </div>
                <ul className="space-y-1">
                  {summary.map((point, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-xs text-slate-700 sm:text-sm"
                    >
                      <span className="shrink-0 font-bold text-un-blue">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Entry metadata - REMOVED, now in badges */}

          {/* Entry content */}
          <div className="mb-0">
            <div
              className="entry-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(displayEntry.entry),
              }}
            />
          </div>

          {/* PU notes */}
          {displayEntry.puNote && (
            <div className="mb-2 border-b border-slate-200 pb-2">
              <div className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {labels.viewEntry.puNotes}
              </div>
              <div
                className="entry-content text-xs break-words text-slate-700 sm:text-sm"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(displayEntry.puNote),
                }}
              />
            </div>
          )}

          {/* Source Information */}
          {(displayEntry.sourceName ||
            displayEntry.sourceUrl ||
            displayEntry.sourceDate) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              {displayEntry.sourceName &&
                (displayEntry.sourceUrl ? (
                  <a
                    href={displayEntry.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-un-blue hover:underline"
                  >
                    {displayEntry.sourceName}
                  </a>
                ) : (
                  <span className="font-medium">{displayEntry.sourceName}</span>
                ))}
              {displayEntry.sourceName && displayEntry.sourceDate && (
                <span className="text-slate-400">|</span>
              )}
              {displayEntry.sourceDate && (
                <span>{formatDateFull(displayEntry.sourceDate)}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 flex-col gap-1 border-t border-slate-200 bg-white px-3 pt-1 pb-2 sm:px-6 sm:pt-4 sm:pb-4">
          {/* Navigation buttons - Show on iPad and smaller (not on desktop) */}
          {allEntries.length > 1 && (
            <div className="flex justify-center gap-2 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                {labels.entries.actions.previous}
              </Button>
              <span className="flex items-center text-xs text-slate-600">
                {currentIndex + 1} {labels.entries.xOfY.split(" ")[1] || "of"}{" "}
                {allEntries.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex >= allEntries.length - 1}
                className="h-8 gap-1 text-xs"
              >
                {labels.entries.actions.next}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Approve/Deny buttons - shown on mobile and small screens */}
          {showApproveButton && onApprove && (
            <div className="mb-0 flex w-full gap-2 lg:hidden">
              <Button
                variant={
                  displayEntry.approvalStatus === "discussed"
                    ? "default"
                    : "outline"
                }
                onClick={() => handleApprove("discussed")}
                disabled={isUpdatingApproval}
                className={`h-8 flex-1 gap-1 text-xs ${
                  displayEntry.approvalStatus === "discussed"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "text-green-600 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                <Check className="h-3 w-3" />
                {labels.entries.actions.discussed}
              </Button>

              {displayEntry.approvalStatus !== "discussed" && (
                <Button
                  variant="outline"
                  onClick={() => handlePostpone()}
                  disabled={isUpdatingApproval}
                  className="h-8 flex-1 gap-1 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FastForward className="h-3 w-3" />
                  {labels.entries.actions.postpone}
                </Button>
              )}
            </div>
          )}

          {/* Action buttons - Mobile/tablet layout */}
          <div className="flex flex-col gap-2 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/form?edit=${displayEntry.id}`}>
                <Button
                  variant="outline"
                  className="h-8 w-full gap-2 px-3 text-xs"
                >
                  <Edit className="h-3 w-3" />
                  {labels.entries.actions.edit}
                </Button>
              </Link>

              <Button
                onClick={() => handleOpenChange(false)}
                variant="outline"
                className="h-8 gap-2 px-3 text-xs"
              >
                <X className="h-3 w-3" />
                {labels.entries.actions.close}
              </Button>
            </div>
          </div>

          {/* Action buttons - Desktop layout */}
          <div className="hidden w-full items-center justify-between gap-2 lg:flex">
            {/* Left: Edit/Close */}
            <div className="flex gap-2">
              <Link href={`/form?edit=${displayEntry.id}`}>
                <Button variant="outline" className="h-8 gap-2 px-3 text-xs">
                  <Edit className="h-3 w-3" />
                  {labels.entries.actions.edit}
                </Button>
              </Link>

              <Button
                onClick={() => handleOpenChange(false)}
                variant="outline"
                className="h-8 gap-2 px-3 text-xs"
              >
                <X className="h-3 w-3" />
                {labels.entries.actions.close}
              </Button>
            </div>

            {/* Middle: Navigation and Related Entries */}
            <div className="flex items-center gap-2">
              {/* Previous/Follow-up buttons */}
              {(previousEntry || followUpEntries.length > 0) && (
                <div className="flex items-center gap-2">
                  {previousEntry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prevIdx = allEntries.findIndex(
                          (e) => e.id === previousEntry?.id,
                        );
                        if (prevIdx >= 0) setCurrentIndex(prevIdx);
                      }}
                      className="h-8 gap-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <ArrowUp className="h-3 w-3" />
                      {labels.entries.actions.previous}
                    </Button>
                  )}

                  {followUpEntries.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextIdx = allEntries.findIndex(
                          (e) => e.id === followUpEntries[0].id,
                        );
                        if (nextIdx >= 0) setCurrentIndex(nextIdx);
                      }}
                      className="h-8 gap-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      {labels.entries.actions.followUp}
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Entry navigation */}
              {allEntries.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    {labels.entries.actions.previous}
                  </Button>
                  <span className="text-xs whitespace-nowrap text-slate-600">
                    {currentIndex + 1}{" "}
                    {labels.entries.xOfY.split(" ")[1] || "of"}{" "}
                    {allEntries.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex >= allEntries.length - 1}
                    className="h-8 gap-1 text-xs"
                  >
                    {labels.entries.actions.next}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Approve/Deny/Delete */}
            <div className="flex gap-2">
              {showApproveButton && onApprove && (
                <>
                  <Button
                    variant={
                      displayEntry.approvalStatus === "discussed"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleApprove("discussed")}
                    disabled={isUpdatingApproval}
                    className={`h-8 gap-2 text-xs ${
                      displayEntry.approvalStatus === "discussed"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "text-green-600 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {labels.entries.actions.discussed}
                  </Button>

                  {displayEntry.approvalStatus !== "discussed" && (
                    <Button
                      variant="outline"
                      onClick={() => handlePostpone()}
                      disabled={isUpdatingApproval}
                      className="h-8 gap-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FastForward className="h-4 w-4" />
                      {labels.entries.actions.postpone}
                    </Button>
                  )}
                </>
              )}

              {onDelete && displayEntry.id && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="h-8 gap-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {labels.entries.actions.delete}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
