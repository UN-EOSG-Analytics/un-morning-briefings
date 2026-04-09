"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteEntry, getSubmittedEntries } from "@/lib/storage";
import { Eye, FileDown, List } from "lucide-react";
import Link from "next/link";
import { ExportDailyBriefingDialog } from "./ExportDailyBriefingDialog";
import { getCurrentBriefingDate } from "@/lib/useEntriesFilter";
import { EntriesTable } from "./EntriesTable";
import { usePopup } from "@/lib/popup-context";
import type { MorningMeetingEntry } from "@/types/morning-meeting";
import labels from "@/lib/labels.json";

export function MorningMeetingList({
  initialDateFilter,
}: { initialDateFilter?: string } = {}) {
  const {
    confirm: showConfirm,
    success: showSuccess,
    info: showInfo,
  } = usePopup();
  const [entries, setEntries] = useState<MorningMeetingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const loadEntries = useCallback(async () => {
    const data = await getSubmittedEntries();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const interval = setInterval(loadEntries, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadEntries();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadEntries]);

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      labels.entries.confirm.deleteTitle,
      labels.entries.confirm.deleteMessage,
    );

    if (confirmed) {
      try {
        await deleteEntry(id);
        showSuccess(
          labels.entries.success.deleted,
          labels.entries.success.deletedMessage,
        );
        await loadEntries();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete entry";
        showInfo("Error", errorMessage);
      }
    }
  };

  const handleToggleDiscussion = async (entry: MorningMeetingEntry) => {
    try {
      if (!entry.id) {
        showInfo("Error", labels.entries.errors.idRequired);
        return;
      }

      // Just refresh the data - the dialog has already updated the status via API
      loadEntries();
    } catch {
      showSuccess("Error", labels.viewEntry.discussion.updateFailedMessage);
    }
  };

  const handlePostpone = async () => {
    // Refresh the data to reorder entries
    await loadEntries();
  };

  const handleUpdateEntry = async (id: string, updates: any) => {
    // Update local state immediately for responsiveness
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry,
      ),
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      {/* Header */}
      <Card className="border-slate-200 px-4 sm:p-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-700">
              <List className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                {labels.entries.title}
              </h1>
              <p className="text-xs text-slate-600 sm:text-sm">
                {labels.entries.subtitle}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
            <Link href={`/briefing?date=${getCurrentBriefingDate()}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center sm:h-10 sm:w-auto sm:px-6"
              >
                <Eye className="h-4 w-4" />
                <span className="sm:inline">View Briefing</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="w-full justify-center bg-un-blue hover:bg-un-blue/90 sm:h-10 sm:w-auto sm:px-6"
            >
              <FileDown className="h-4 w-4" />
              <span className="sm:inline">
                {labels.entries.actions.exportBriefing}
              </span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Entries Table */}
      <EntriesTable
        entries={entries}
        loading={loading}
        onDelete={handleDelete}
        onToggleDiscussion={handleToggleDiscussion}
        onPostpone={handlePostpone}
        onUpdate={handleUpdateEntry}
        showDiscussionColumn={true}
        emptyMessage={labels.entries.empty.noEntries}
        resultLabel="entries"
        initialDateFilter={initialDateFilter}
      />

      {/* Export Dialog */}
      <ExportDailyBriefingDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
}
