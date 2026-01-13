'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { deleteEntry, getSubmittedEntries, toggleApproval } from '@/lib/storage';
import { Download, FileDown, List } from 'lucide-react';
import Link from 'next/link';
import { ExportDailyBriefingDialog } from './ExportDailyBriefingDialog';
import { EntriesTable } from './EntriesTable';
import { usePopup } from '@/lib/popup-context';

export function MorningMeetingList({ initialDateFilter }: { initialDateFilter?: string } = {}) {
  const { confirm: showConfirm, success: showSuccess, info: showInfo } = usePopup();
  const [entries, setEntries] = useState<any[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const data = await getSubmittedEntries();
    setEntries(data);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await deleteEntry(id);
        showSuccess('Deleted', 'Entry deleted successfully');
        await loadEntries();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete entry';
        showInfo('Error', errorMessage);
      }
    }
  };

  const handleToggleApproval = async (entry: any) => {
    try {
      await toggleApproval(entry.id, !entry.approved);
      showSuccess(
        entry.approved ? 'Unapproved' : 'Approved',
        `Entry has been ${!entry.approved ? 'approved' : 'unapproved'}`
      );
      loadEntries();
    } catch (error) {
      showSuccess('Error', 'Failed to update approval status');
    }
  };

  const exportToJSON = () => {
    const approvedEntries = entries.filter((entry) => entry.approved);
    if (approvedEntries.length === 0) {
      showInfo('No Approved Entries', 'There are no approved entries to export.');
      return;
    }
    const dataStr = JSON.stringify(approvedEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `morning-meetings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    
    <div className="space-y-4 mx-auto w-full max-w-6xl">
      {/* Header */}
      <Card className="border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-700">
             <List className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Morning Meeting Entries</h1>
              <p className="text-xs sm:text-sm text-slate-600">View and manage submitted entries</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)} className="w-full sm:w-auto justify-center">
              <FileDown className="h-4 w-4" />
              <span className="sm:inline">Export Daily Briefing</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToJSON} className="w-full sm:w-auto justify-center">
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
        showApprovedColumn={true}
        emptyMessage="No entries found."
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
