"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteEntry, getSubmittedEntries } from "@/lib/storage";
import { Download, FileDown, FileText, List, RefreshCw } from "lucide-react";
import { ExportDailyBriefingDialog } from "./ExportDailyBriefingDialog";
import { BriefingModeDialog } from "./BriefingModeDialog";
import { EntriesTable } from "./EntriesTable";
import { usePopup } from "@/lib/popup-context";
import type { MorningMeetingEntry } from "@/types/morning-meeting";

export function MorningMeetingList({
  initialDateFilter,
}: { initialDateFilter?: string } = {}) {
  const {
    confirm: showConfirm,
    success: showSuccess,
    info: showInfo,
  } = usePopup();
  const [entries, setEntries] = useState<MorningMeetingEntry[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBriefingDialog, setShowBriefingDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEntries = async () => {
    const data = await getSubmittedEntries();
    setEntries(data);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadEntries();
      showSuccess("Refreshed", "Table data refreshed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to refresh data";
      showInfo("Error", errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
    );

    if (confirmed) {
      try {
        await deleteEntry(id);
        showSuccess("Deleted", "Entry deleted successfully");
        await loadEntries();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete entry";
        showInfo("Error", errorMessage);
      }
    }
  };

  const handleToggleApproval = async (entry: MorningMeetingEntry) => {
    try {
      if (!entry.id) {
        showInfo("Error", "Cannot update entry without ID");
        return;
      }

      // Just refresh the data - the dialog has already updated the status via API
      loadEntries();
    } catch {
      showSuccess("Error", "Failed to update approval status");
    }
  };

  const handlePostpone = async () => {
    // Refresh the data to reorder entries
    await loadEntries();
  };

  const exportToJSON = () => {
    const entriesToExport = entries;
    if (entriesToExport.length === 0) {
      showInfo("No Entries", "There are no entries to export.");
      return;
    }
    const dataStr = JSON.stringify(entriesToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `morning-meetings-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      {/* Header */}
      <Card className="border-slate-200 py-0 ">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-700">
              <List className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                Morning Meeting Entries
              </h1>
              <p className="text-xs text-slate-600 sm:text-sm">
                View and manage submitted entries
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="hidden lg:flex w-full justify-center sm:h-10 sm:w-auto sm:px-6"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBriefingDialog(true)}
              className="w-full justify-center sm:h-10 sm:w-auto sm:px-6"
            >
              <FileText className="h-4 w-4" />
              <span className="sm:inline">View Briefing</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="w-full justify-center sm:h-10 sm:w-auto sm:px-6"
            >
              <FileDown className="h-4 w-4" />
              <span className="sm:inline">Export Daily Briefing</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToJSON}
              className="hidden w-full justify-center sm:h-10 sm:w-auto sm:px-6"
            >
              <Download className="h-4 w-4" />
              <span className="sm:inline">Export JSON</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Entries Table */}
      <EntriesTable
        entries={entries}
        onDelete={handleDelete}
        onToggleApproval={handleToggleApproval}
        onPostpone={handlePostpone}
        showApprovedColumn={true}
        emptyMessage="No entries found."
        resultLabel="entries"
        initialDateFilter={initialDateFilter}
      />

      {/* Briefing Mode Dialog */}
      <BriefingModeDialog
        open={showBriefingDialog}
        onOpenChange={setShowBriefingDialog}
      />

      {/* Export Dialog */}
      <ExportDailyBriefingDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
}
