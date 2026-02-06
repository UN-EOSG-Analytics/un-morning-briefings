"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { getDraftEntries, deleteEntry } from "@/lib/storage";
import { FileEdit } from "lucide-react";
import { EntriesTable } from "@/components/EntriesTable";
import { usePopup } from "@/lib/popup-context";
import type { MorningMeetingEntry } from "@/types/morning-meeting";

export default function DraftsPage() {
  const { data: session } = useSession();
  const { confirm: showConfirm, success: showSuccess, error: showError } = usePopup();
  const [entries, setEntries] = useState<MorningMeetingEntry[]>([]);

  // Get current user's email for API filtering
  const userEmail = session?.user?.email || "";

  const loadEntries = useCallback(async () => {
    if (!userEmail) return;
    // API now filters by user email via foreign key join
    const data = await getDraftEntries(userEmail);
    setEntries(data);
  }, [userEmail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, [loadEntries]);

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      "Delete Draft",
      "Are you sure you want to delete this draft? This action cannot be undone.",
    );

    if (confirmed) {
      try {
        await deleteEntry(id);
        showSuccess("Deleted", "Draft deleted successfully");
        await loadEntries();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete draft";
        showSuccess("Error", errorMessage);
      }
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      const response = await fetch(`/api/entries`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: "submitted" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to submit entry"
        );
      }

      showSuccess("Success", "Draft submitted successfully!");
      await loadEntries();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit draft";
      showError("Error", errorMessage);
    }
  };

  return (
    <div className="bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="space-y-4">
          {/* Header */}
          <Card className="border-slate-200 py-0">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-accent">
                  <FileEdit className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">
                    My Drafts
                  </h1>
                  <p className="text-sm text-slate-600">
                    View and manage your unsubmitted draft entries
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Entries Table */}
          <EntriesTable
            entries={entries}
            onDelete={handleDelete}
            onSubmit={handleSubmit}
            showApprovedColumn={false}
            emptyMessage="No drafts found."
            resultLabel="drafts"
          />
        </div>
      </main>
    </div>
  );
}
