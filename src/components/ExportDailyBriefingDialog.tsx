"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getSubmittedEntries } from "@/lib/storage";
import {
  isWithinCutoffRange,
  getCurrentBriefingDate,
} from "@/lib/useEntriesFilter";
import { Packer } from "docx";
import { saveAs } from "file-saver";
import { FileText, Calendar, Mail, Download } from "lucide-react";
import { usePopup } from "@/lib/popup-context";
import {
  formatExportFilename,
  buildBriefingDocument,
} from "@/lib/briefing-docx";
import type { MorningMeetingEntry } from "@/types/morning-meeting";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Process images in entries - downloads from blob storage and converts to data URLs
 */
const processEntriesImages = async (
  entries: MorningMeetingEntry[],
  includeImages: boolean,
): Promise<MorningMeetingEntry[]> => {
  const processedEntries = entries.map((e) => ({ ...e }));

  for (const entry of processedEntries) {
    let html = entry.entry;

    // Skip image processing if includeImages is false
    if (!includeImages) {
      html = html.replace(/<img[^>]*>/gi, "");
      entry.entry = html;
      continue;
    }

    // Process tracked images (uploaded via the editor)
    if (entry.images && entry.images.length > 0) {
      for (const img of entry.images) {
        try {
          if (img.position === null || img.position === undefined) {
            continue;
          }

          const ref = `image-ref://img-${img.position}`;

          if (!html.includes(ref)) {
            continue;
          }

          const response = await fetch(`/api/images/${img.id}`);
          if (!response.ok) {
            html = html.replace(
              new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, "gi"),
              "",
            );
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const base64Data = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              "",
            ),
          );
          const dataUrl = `data:${img.mimeType};base64,${base64Data}`;

          const searchPattern = new RegExp(
            `src=["']${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
            "gi",
          );
          html = html.replace(searchPattern, `src="${dataUrl}"`);
        } catch (error) {
          console.error(`Error downloading image ${img.id}:`, error);
          const ref = `image-ref://img-${img.position}`;
          html = html.replace(
            new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, "gi"),
            "",
          );
        }
      }
    }

    // Download and convert external image URLs to data URLs
    const externalImgRegex =
      /<img[^>]*src=["']?(https?:\/\/[^"'\s>]+)["']?([^>]*)>/gi;
    let match;
    const replacements: Array<{ from: string; to: string }> = [];

    while ((match = externalImgRegex.exec(html)) !== null) {
      const fullTag = match[0];
      const imageUrl = match[1];
      const restOfTag = match[2];

      try {
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) {
          continue;
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64Data = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );

        const mimeType =
          blob.type || response.headers.get("content-type") || "image/png";
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        const newTag = `<img src="${dataUrl}"${restOfTag}>`;
        replacements.push({ from: fullTag, to: newTag });
      } catch (error) {
        console.error("Error downloading external image:", imageUrl, error);
      }
    }

    for (const { from, to } of replacements) {
      html = html.replace(from, to);
    }

    entry.entry = html;
  }

  return processedEntries;
};

/**
 * Generate the complete document blob (client-side, uses browser APIs)
 */
export const generateDocumentBlob = async (
  entries: MorningMeetingEntry[],
  selectedDate: string,
  includeImages: boolean,
): Promise<Blob> => {
  // Process images in entries (client-only: uses fetch + btoa)
  const processedEntries = await processEntriesImages(entries, includeImages);

  // Build document using shared module
  const doc = await buildBriefingDocument(processedEntries, selectedDate);

  return Packer.toBlob(doc);
};

export function ExportDailyBriefingDialog({
  open,
  onOpenChange,
}: ExportDialogProps) {
  const { data: session } = useSession();
  const { info: showInfo, success: showSuccess, error: showError } = usePopup();
  const [selectedDate, setSelectedDate] = useState<string>(
    getCurrentBriefingDate(),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );
  const [briefingEntries, setBriefingEntries] = useState<MorningMeetingEntry[]>(
    [],
  );
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(
    new Set(),
  );

  // Unified function to get all entries for a date using 8AM cutoff (regardless of discussion status)
  const getEntriesForDate = useCallback(
    async (dateStr: string): Promise<MorningMeetingEntry[]> => {
      const allEntries = await getSubmittedEntries();
      return allEntries.filter((entry: MorningMeetingEntry) => {
        return isWithinCutoffRange(entry.date, dateStr);
      });
    },
    [],
  );

  // Blur the date input when dialog opens to prevent auto-focus
  useEffect(() => {
    if (open && dateInputRef.current) {
      // Use setTimeout to ensure it happens after the dialog fully opens
      const timer = setTimeout(() => {
        dateInputRef.current?.blur();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const loadEntriesForDate = async () => {
      if (!session?.user) return;

      setIsLoadingEntries(true);
      try {
        const entriesForDate = await getEntriesForDate(selectedDate);
        setBriefingEntries(entriesForDate);
        // Initialize all entries as selected (checked)
        const allEntryIds = new Set(
          entriesForDate
            .map((e) => e.id)
            .filter((id): id is string => Boolean(id)),
        );
        setSelectedEntryIds(allEntryIds);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error loading entries:", errorMessage);
        showError("Failed to Load Entries", errorMessage);
        setBriefingEntries([]);
        setSelectedEntryIds(new Set());
      } finally {
        setIsLoadingEntries(false);
      }
    };

    if (open) {
      loadEntriesForDate();
    }
  }, [selectedDate, open, session?.user, showError, getEntriesForDate]);

  const handleExport = async () => {
    if (selectedEntryIds.size === 0) {
      showInfo(
        "No Entries Selected",
        "Please select at least one entry to export.",
      );
      return;
    }

    setIsExporting(true);
    try {
      const entriesForDate = await getEntriesForDate(selectedDate);
      const selectedEntries = entriesForDate.filter(
        (entry) => entry.id && selectedEntryIds.has(entry.id),
      );

      if (selectedEntries.length === 0) {
        showInfo(
          "No Entries Selected",
          "Please select at least one entry to export.",
        );
        setIsExporting(false);
        return;
      }

      // Generate document blob using shared function
      const blob = await generateDocumentBlob(
        selectedEntries,
        selectedDate,
        includeImages,
      );

      // Save file with formatted filename
      saveAs(blob, formatExportFilename(selectedDate));

      showSuccess("Export Successful", "Daily briefing exported successfully!");
      handleOpenChange(false);
    } catch (error) {
      console.error("Error exporting briefing:", error);
      showError(
        "Export Failed",
        "Failed to export daily briefing. Please try again.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendViaEmail = async (sendToSelf: boolean) => {
    if (!session?.user?.email) {
      showError("Not Authenticated", "You must be logged in to send emails.");
      return;
    }

    if (selectedEntryIds.size === 0) {
      showError(
        "No Entries Selected",
        "Please select at least one entry to send.",
      );
      return;
    }

    setShowSendConfirm(false);
    setIsSendingEmail(true);
    try {
      const entriesForDate = await getEntriesForDate(selectedDate);
      const selectedEntries = entriesForDate.filter(
        (entry) => entry.id && selectedEntryIds.has(entry.id),
      );

      if (selectedEntries.length === 0) {
        showError(
          "No Entries Selected",
          "Please select at least one entry to send.",
        );
        setIsSendingEmail(false);
        return;
      }

      // Generate document blob using shared function
      const blob = await generateDocumentBlob(
        selectedEntries,
        selectedDate,
        includeImages,
      );

      // Convert blob to base64 for API
      const arrayBuffer = await blob.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      const docxBlob = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`;

      // Send via API with formatted filename
      const response = await fetch("/api/send-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docxBlob,
          fileName: formatExportFilename(selectedDate),
          briefingDate: selectedDate,
          sendToSelf,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send email");
      }

      showSuccess(
        "Email Sent",
        sendToSelf
          ? `Briefing sent to ${session.user.email}`
          : "Briefing sent to the distribution list.",
      );
      handleOpenChange(false);
    } catch (error) {
      console.error("Error sending briefing via email:", error);
      showError(
        "Send Failed",
        error instanceof Error
          ? error.message
          : "Failed to send briefing via email.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-dvh w-screen max-w-none! flex-col rounded-none p-0! sm:h-auto sm:max-w-lg! sm:rounded-lg sm:p-6!">
          <DialogHeader className="border-b border-slate-200 px-4 py-4 sm:border-0 sm:px-0 sm:py-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-un-blue" />
              Daily Briefing
            </DialogTitle>
            <DialogDescription className="pt-2 text-left">
              Select entries to include, then view the briefing, export to Word,
              or send via email. Entries are from the previous day at 8:00 AM
              until the selected day at 8:00 AM.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-1 flex-col space-y-4 overflow-y-auto px-4 py-4 sm:px-0">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Select Date
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  autoFocus={false}
                  className="h-10 w-full appearance-none rounded border border-slate-300 bg-white pr-3 pl-10 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-images"
                checked={includeImages}
                onCheckedChange={(checked) =>
                  setIncludeImages(checked as boolean)
                }
              />
              <label
                htmlFor="include-images"
                className="cursor-pointer text-sm font-medium text-foreground"
              >
                Include images in export
              </label>
            </div>

            <div className="flex max-h-80 min-h-0 flex-1 flex-col space-y-2">
              <label className="text-sm font-medium text-foreground">
                Entries ({selectedEntryIds.size}/{briefingEntries.length})
              </label>
              <div className="flex-1 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
                {isLoadingEntries ? (
                  <p className="text-xs text-slate-500">Loading entries...</p>
                ) : briefingEntries.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No entries for this date
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {briefingEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Checkbox
                          id={`entry-${entry.id}`}
                          checked={selectedEntryIds.has(entry.id || "")}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedEntryIds);
                            if (checked) {
                              newSelected.add(entry.id || "");
                            } else {
                              newSelected.delete(entry.id || "");
                            }
                            setSelectedEntryIds(newSelected);
                          }}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`entry-${entry.id}`}
                          className="line-clamp-2 flex-1 cursor-pointer text-slate-700"
                        >
                          {entry.headline}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex w-full shrink-0 flex-col gap-3 px-4 pb-4 sm:flex-row sm:px-0 sm:pb-0">
            <Button
              onClick={handleExport}
              disabled={isExporting || isSendingEmail}
              className="flex-1 gap-2 bg-un-blue hover:bg-un-blue/90"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Word"}
            </Button>
            <Button
              onClick={() => setShowSendConfirm(true)}
              disabled={isSendingEmail || isExporting}
              className="flex-1 gap-2 bg-un-blue hover:bg-un-blue/90"
            >
              <Mail className="h-4 w-4" />
              {isSendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send confirmation dialog */}
      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-un-blue" />
              Send Briefing
            </DialogTitle>
            <DialogDescription className="pt-2 text-left">
              Are you sure you want to send this briefing (
              {selectedEntryIds.size}{" "}
              {selectedEntryIds.size === 1 ? "entry" : "entries"}) via email?
              Choose who should receive it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => handleSendViaEmail(true)}
              className="w-full justify-start gap-2 bg-un-blue hover:bg-un-blue/90"
            >
              <Mail className="h-4 w-4" />
              Send to myself only
              <span className="ml-auto text-xs opacity-75">
                {session?.user?.email}
              </span>
            </Button>
            <Button
              onClick={() => handleSendViaEmail(false)}
              className="w-full justify-start gap-2 bg-un-blue hover:bg-un-blue/90"
            >
              <Mail className="h-4 w-4" />
              Send to distribution list
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSendConfirm(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
