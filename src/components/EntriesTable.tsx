"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MorningMeetingEntry,
  PRIORITIES,
  REGIONS,
  COUNTRIES,
} from "@/types/morning-meeting";
import {
  formatDateResponsive,
  formatDateDesktop,
  formatDateWithWeekday,
  formatTime,
} from "@/lib/format-date";
import {
  Trash2,
  Edit,
  Clock,
  Check,
  X,
  FastForward,
  FileDown,
  FileText,
  List,
  Send,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewEntryDialog } from "./ViewEntryDialog";
import { SearchBar } from "./SearchBar";
import { ColumnFilter } from "./ColumnFilter";
import { CommentDialog } from "./CommentDialog";
import {
  useEntriesFilter,
  getPriorityBadgeClass,
  getRegionBadgeClass,
  getBriefingDate,
  isWithinCutoffRange,
} from "@/lib/useEntriesFilter";
import {
  generateDocumentBlob,
  formatExportFilename,
  createDocumentHeader,
} from "@/components/ExportDailyBriefingDialog";
import { saveAs } from "file-saver";
import labels from "@/lib/labels.json";

interface EntriesTableProps {
  entries: MorningMeetingEntry[];
  onDelete: (id: string) => void;
  onToggleApproval?: (entry: MorningMeetingEntry) => void;
  onPostpone?: () => void;
  onSubmit?: (id: string) => Promise<void>;
  showApprovedColumn?: boolean;
  emptyMessage?: string;
  resultLabel?: string;
  initialDateFilter?: string;
  hideCommentAction?: boolean;
}

export function EntriesTable({
  entries,
  onDelete,
  onToggleApproval,
  onPostpone,
  onSubmit,
  showApprovedColumn = false,
  emptyMessage = labels.entries.empty.noEntries,
  resultLabel = "entries",
  initialDateFilter,
  hideCommentAction = false,
}: EntriesTableProps) {
  const router = useRouter();
  const [selectedEntry, setSelectedEntry] =
    useState<MorningMeetingEntry | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(
    null,
  );
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [exportingDate, setExportingDate] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [collapsedBriefings, setCollapsedBriefings] = useState<Set<string>>(
    new Set() // All briefings expanded by default
  );
  const [showAgendaDialog, setShowAgendaDialog] = useState(false);
  const [agendaDate, setAgendaDate] = useState<string | null>(null);
  const [agendaEntries, setAgendaEntries] = useState<MorningMeetingEntry[]>([]);

  const {
    searchTerm,
    filterRegion,
    filterPriority,
    filterCountry,
    filterDate,
    sortField,
    sortDirection,
    setSearchTerm,
    setFilterRegion,
    setFilterPriority,
    setFilterCountry,
    setFilterDate,
    setSortField,
    setSortDirection,
    handleSort,
    handleResetFilters,
    sortedEntries,
  } = useEntriesFilter(entries, initialDateFilter);

  const handleRowClick = (entry: MorningMeetingEntry) => {
    setSelectedEntry(entry);
    setShowViewDialog(true);
  };

  const toggleBriefingCollapse = (date: string) => {
    setCollapsedBriefings((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleStatusChange = async (entryId: string, newStatus: string) => {
    setUpdatingStatus(entryId);
    try {
      const response = await fetch(`/api/entries`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: entryId, approvalStatus: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", response.status, errorData);
        throw new Error(`Failed to update status: ${response.status}`);
      }

      // Update the entry in the list
      const updatedEntry = entries.find((e) => e.id === entryId);
      if (updatedEntry) {
        updatedEntry.approvalStatus = newStatus as any;
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(null);
      setOpenStatusDropdown(null);
    }
  };

  const handlePostpone = async (entryId: string) => {
    setUpdatingStatus(entryId);
    try {
      const response = await fetch(`/api/entries`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: entryId, action: "postpone" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", response.status, errorData);
        throw new Error(`Failed to postpone entry: ${response.status}`);
      }

      // Update the entry in the list
      const updatedEntry = entries.find((e) => e.id === entryId);
      if (updatedEntry) {
        // Advance date by 1 day
        const currentDate = new Date(updatedEntry.date);
        currentDate.setDate(currentDate.getDate() + 1);
        updatedEntry.date = currentDate.toISOString();
        updatedEntry.approvalStatus = "pending";
      }

      // Trigger refresh to reorder entries
      if (onPostpone) {
        onPostpone();
      }
    } catch (error) {
      console.error("Error postponing entry:", error);
    } finally {
      setUpdatingStatus(null);
      setOpenStatusDropdown(null);
    }
  };

  const handleSubmitEntry = async (entryId: string) => {
    if (!onSubmit) return;

    setSubmittingId(entryId);
    try {
      await onSubmit(entryId);
    } catch (error) {
      console.error("Error submitting entry:", error);
    } finally {
      setSubmittingId(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Close if clicking outside any dropdown
      if (!target.closest(".status-dropdown-container")) {
        setOpenStatusDropdown(null);
      }
    };

    if (openStatusDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openStatusDropdown]);

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  const handleSaveComment = async (entryId: string, comment: string) => {
    try {
      const response = await fetch("/api/entries/comment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save comment");
      }

      // Force a re-render by triggering a route refresh
      router.refresh();
    } catch (error) {
      console.error("Error saving comment:", error);
      throw error;
    }
  };

  // Extract unique briefing dates from entries
  const uniqueDates = Array.from(
    new Set(entries.map((entry) => getBriefingDate(entry.date))),
  )
    .sort()
    .reverse();

  // Extract unique countries from entries
  const availableCountries = Array.from(
    new Set(
      entries.flatMap((entry) => 
        Array.isArray(entry.country) ? entry.country : [entry.country]
      ).filter(Boolean)
    )
  ).sort();

  return (
    <>
      {/* Search Bar and Reset Button */}
      <div className="flex items-center gap-2">
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        {(searchTerm ||
          filterRegion !== "all" ||
          filterPriority !== "all" ||
          filterCountry !== "all" ||
          filterDate ||
          sortField !== "date" ||
          sortDirection !== "desc") && (
          <button
            onClick={() => {
              handleResetFilters();
              setSortField("date");
              setSortDirection("desc");
            }}
            className="animate-[fadeIn_0.3s_ease-in_forwards] rounded-md bg-slate-100 px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 opacity-0 transition-all duration-200 hover:bg-slate-200"
          >
            {labels.entries.filters.resetFilters}
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-hidden border-slate-200 p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="min-w-12 rounded-tl-xl px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:min-w-26 sm:px-4">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span
                      className="hidden cursor-pointer rounded px-1 py-1 whitespace-nowrap hover:bg-slate-100 sm:inline"
                      onClick={() => handleSort("date")}
                    >
                      {labels.entries.columns.date}{" "}
                      {sortField === "date" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                    <span
                      className="cursor-pointer rounded px-1 py-1 hover:bg-slate-100 sm:hidden"
                      onClick={() => handleSort("date")}
                    >
                      {labels.entries.columns.date}
                    </span>
                    <div className="hidden sm:block">
                      <ColumnFilter
                        columnName={labels.entries.filters.briefingDate}
                        options={uniqueDates.map((date) =>
                          formatDateDesktop(date),
                        )}
                        selectedValue={
                          filterDate ? formatDateDesktop(filterDate) : "all"
                        }
                        onValueChange={(label) => {
                          if (label === "all") {
                            setFilterDate("");
                          } else {
                            // Find the matching date from uniqueDates by comparing formatted strings
                            const matchingDate = uniqueDates.find(
                              (date) => formatDateDesktop(date) === label,
                            );
                            if (matchingDate) {
                              setFilterDate(matchingDate);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </th>
                <th className="px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:px-4">
                  <span
                    className="inline-block cursor-pointer rounded px-1 py-1 hover:bg-slate-100"
                    onClick={() => handleSort("headline")}
                  >
                    {labels.entries.columns.headline}{" "}
                    {sortField === "headline" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </span>
                </th>
                <th className="hidden px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="cursor-pointer rounded px-1 py-1 hover:bg-slate-100"
                      onClick={() => handleSort("region")}
                    >
                      {labels.entries.columns.region}{" "}
                      {sortField === "region" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                    <ColumnFilter
                      columnName={labels.entries.columns.region}
                      options={REGIONS}
                      selectedValue={filterRegion}
                      onValueChange={setFilterRegion}
                    />
                  </div>
                </th>
                <th className="hidden px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="cursor-pointer rounded px-1 py-1 hover:bg-slate-100"
                      onClick={() => handleSort("country")}
                    >
                      {labels.entries.columns.tag}{" "}
                      {sortField === "country" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                    <ColumnFilter
                      columnName={labels.entries.columns.tag}
                      options={availableCountries}
                      selectedValue={filterCountry}
                      onValueChange={setFilterCountry}
                    />
                  </div>
                </th>
                {showApprovedColumn && (
                  <th className="hidden px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                    {labels.entries.columns.status}
                  </th>
                )}
                <th className="hidden rounded-tr-xl px-2 py-3 text-right text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                  {labels.entries.columns.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={showApprovedColumn ? 7 : 6}
                    className="px-2 py-12 text-center text-slate-500 sm:px-4"
                  >
                    {emptyMessage}{" "}
                    <Link href="/form" className="text-un-blue hover:underline">
                      {labels.entries.empty.createFirst}
                    </Link>
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry, idx) => {
                  const currentBriefingDate = getBriefingDate(entry.date);
                  const prevBriefingDate =
                    idx > 0
                      ? getBriefingDate(sortedEntries[idx - 1].date)
                      : null;
                  const showSeparator =
                    !prevBriefingDate ||
                    prevBriefingDate !== currentBriefingDate;

                  return [
                    showSeparator && (
                      <tr key={`sep-${entry.id}`} className="bg-slate-100">
                        <td
                          colSpan={showApprovedColumn ? 7 : 6}
                          className="px-2 py-2 sm:px-4"
                        >
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => toggleBriefingCollapse(currentBriefingDate)}
                              className="flex items-center gap-2 text-sm font-semibold text-un-blue transition-colors hover:text-un-blue/80 -ml-2 p-1"
                              title={collapsedBriefings.has(currentBriefingDate) ? "Expand" : "Collapse"}
                            >
                              {collapsedBriefings.has(currentBriefingDate) ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                              {labels.entries.briefingFor}{" "}
                              {formatDateWithWeekday(currentBriefingDate)}
                            </button>
                            {!onSubmit && (
                              <div
                                className="ml-auto flex gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                    
                                  onClick={() => {
                                    const entriesForDate = entries.filter(
                                      (e) => isWithinCutoffRange(e.date, currentBriefingDate)
                                    );
                                    setAgendaDate(currentBriefingDate);
                                    setAgendaEntries(entriesForDate);
                                    setShowAgendaDialog(true);
                                  }}
                                  className="p-1 text-slate-600 transition-colors hover:text-un-blue"
                                  title="View agenda"
                                >
                                  <List className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/briefing?date=${currentBriefingDate}`,
                                    )
                                  }
                                  className="p-1 text-slate-600 transition-colors hover:text-un-blue"
                                  title="View briefing"
                                >
                                  <FileText className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    setExportingDate(currentBriefingDate);
                                    try {
                                      // Filter entries for this briefing date
                                      const entriesForDate = entries.filter(
                                        (e) => isWithinCutoffRange(e.date, currentBriefingDate)
                                      );
                                      // Generate and download the document
                                      const blob = await generateDocumentBlob(
                                        entriesForDate,
                                        currentBriefingDate,
                                        true, // includeImages
                                        createDocumentHeader
                                      );
                                      saveAs(blob, formatExportFilename(currentBriefingDate));
                                    } catch (error) {
                                      console.error("Error exporting briefing:", error);
                                    } finally {
                                      setExportingDate(null);
                                    }
                                  }}
                                  disabled={exportingDate === currentBriefingDate}
                                  className="p-1 text-slate-600 transition-colors hover:text-un-blue disabled:opacity-50"
                                  title="Export to Word"
                                >
                                  <FileDown className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                    !collapsedBriefings.has(currentBriefingDate) && (
                      <tr
                        key={entry.id}
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                        onClick={() => handleRowClick(entry)}
                      >
                      <td className="px-2 py-3 text-sm whitespace-nowrap text-slate-600 sm:px-4">
                        <div className="flex flex-col gap-1">
                          <span className="hidden sm:inline">
                            {formatDateDesktop(entry.date)}
                          </span>
                          <span className="sm:hidden">
                            {formatDateResponsive(entry.date).mobile}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatTime(entry.date)}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-md px-2 py-3 text-sm sm:px-4">
                        <div className="line-clamp-3 sm:line-clamp-2">
                          {entry.headline}
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 whitespace-nowrap sm:table-cell sm:px-3 lg:px-4">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${getRegionBadgeClass(entry.region)}`}
                        >
                          {entry.region}
                        </span>
                      </td>
                      <td className="hidden px-2 py-3 sm:table-cell sm:px-3 lg:px-4 max-w-48">
                        <div className="flex gap-1 overflow-hidden">
                          {Array.isArray(entry.country) && entry.country.length > 0
                            ? entry.country.map((country: string) => (
                                <span
                                  key={country}
                                  className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 whitespace-nowrap truncate max-w-24"
                                  title={country}
                                >
                                  {country}
                                </span>
                              ))
                            : entry.country ? (
                                <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 whitespace-nowrap truncate max-w-24" title={entry.country}>
                                  {entry.country}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">—</span>
                              )}
                        </div>
                      </td>
                      {showApprovedColumn && (
                        <td
                          className="hidden px-2 py-3 whitespace-nowrap sm:table-cell sm:px-3 lg:px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="status-dropdown-container relative">
                            {(() => {
                              const status = entry.approvalStatus || "pending";
                              const badgeConfig = {
                                pending: {
                                  bg: "bg-amber-50",
                                  text: "text-amber-700",
                                  icon: Clock,
                                  label: labels.entries.status.pending,
                                },
                                discussed: {
                                  bg: "bg-green-50",
                                  text: "text-green-700",
                                  icon: Check,
                                  label: labels.entries.status.discussed,
                                },
                              };
                              const config =
                                badgeConfig[
                                  status as keyof typeof badgeConfig
                                ] || badgeConfig.pending;
                              const Icon = config.icon;
                              return (
                                <>
                                  <button
                                    onClick={() =>
                                      setOpenStatusDropdown(
                                        openStatusDropdown === entry.id
                                          ? null
                                          : entry.id,
                                      )
                                    }
                                    disabled={updatingStatus === entry.id}
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 ${config.bg} ${config.text} disabled:opacity-50`}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    {config.label}
                                  </button>
                                  {openStatusDropdown === entry.id && (
                                    <div className="absolute top-full left-0 z-50 mt-1.5 w-max rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                      {["pending", "discussed"]
                                        .filter((s) => s !== status)
                                        .map((statusOption) => {
                                          const statusConfig =
                                            badgeConfig[
                                              statusOption as keyof typeof badgeConfig
                                            ];
                                          const StatusIcon = statusConfig.icon;
                                          return (
                                            <button
                                              key={statusOption}
                                              onClick={() =>
                                                handleStatusChange(
                                                  entry.id,
                                                  statusOption,
                                                )
                                              }
                                              disabled={
                                                updatingStatus === entry.id
                                              }
                                              className="block px-3 py-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                            >
                                              <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                                              >
                                                <StatusIcon className="h-3.5 w-3.5" />
                                                {statusConfig.label}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      {status !== "discussed" && (
                                        <button
                                          onClick={() =>
                                            handlePostpone(entry.id)
                                          }
                                          disabled={updatingStatus === entry.id}
                                          className="block w-full border-t border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                        >
                                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                                            <FastForward className="h-3.5 w-3.5" />
                                            {labels.entries.actions.postpone}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      )}
                      <td className="hidden px-2 py-3 text-right whitespace-nowrap sm:table-cell sm:px-3 lg:px-4">
                        <div className="flex justify-end gap-0">
                          {onSubmit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-un-blue hover:bg-blue-50 hover:text-un-blue"
                              onClick={(e) =>
                                handleActionClick(e, () => handleSubmitEntry(entry.id))
                              }
                              disabled={submittingId === entry.id}
                              title="Submit entry"
                            >
                              <Send className="h-5 w-5" />
                            </Button>
                          )}
                          {!hideCommentAction && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <CommentDialog
                                entryId={entry.id}
                                initialComment={entry.comment || ""}
                                onSave={(comment) => handleSaveComment(entry.id, comment)}
                              />
                            </div>
                          )}
                          <Link
                            href={`/form?edit=${entry.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
                            >
                              <Edit className="h-5 w-5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={(e) =>
                              handleActionClick(e, () => onDelete(entry.id))
                            }
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    ),
                  ].filter(Boolean);
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Result Count */}
      <div className="mt-2 text-sm text-slate-600">
        {sortedEntries.length}{" "}
        {sortedEntries.length === 1
          ? resultLabel.endsWith("ies")
            ? resultLabel.slice(0, -3) + "y"
            : resultLabel.slice(0, -1)
          : resultLabel}
      </div>

      {/* View Entry Dialog */}
      <ViewEntryDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        entry={selectedEntry}
        onDelete={onDelete}
        onApprove={onToggleApproval}
        onPostpone={onPostpone}
        showApproveButton={showApprovedColumn}
        allEntries={sortedEntries}
      />

      {/* Briefing Agenda Dialog */}
      <Dialog open={showAgendaDialog} onOpenChange={setShowAgendaDialog}>
        <DialogContent className="sm:!max-w-[60vw] max-w-full h-screen md:h-[90vh] flex flex-col p-0">
          <DialogHeader className="border-b border-slate-200 px-4 md:px-6 py-3 flex-shrink-0">
            <DialogTitle className="text-xl font-semibold text-un-blue">
              Briefing Agenda - {agendaDate && formatDateWithWeekday(agendaDate)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-0 overflow-y-auto flex-1 px-4 md:px-6">
            {(() => {
              // Sort entries by priority (SG attention first) and date
              const sortedAgendaEntries = [...agendaEntries].sort((a, b) => {
                if (a.priority === "Secretary-General's Attention" && b.priority !== "Secretary-General's Attention")
                  return -1;
                if (a.priority !== "Secretary-General's Attention" && b.priority === "Secretary-General's Attention")
                  return 1;
                return 0;
              });

              // Group entries by region and country
              const entriesByRegionAndCountry = sortedAgendaEntries.reduce(
                (acc, entry) => {
                  if (!acc[entry.region]) {
                    acc[entry.region] = {};
                  }

                  if (
                    !entry.country ||
                    entry.country === "" ||
                    (Array.isArray(entry.country) && entry.country.length === 0)
                  ) {
                    if (!acc[entry.region][""]) {
                      acc[entry.region][""] = [];
                    }
                    acc[entry.region][""].push(entry);
                  } else {
                    const countries = Array.isArray(entry.country)
                      ? entry.country
                      : [entry.country];
                    const countryKey = countries.join(" / ");
                    if (!acc[entry.region][countryKey]) {
                      acc[entry.region][countryKey] = [];
                    }
                    acc[entry.region][countryKey].push(entry);
                  }
                  return acc;
                },
                {} as Record<string, Record<string, MorningMeetingEntry[]>>,
              );

              const sortedRegions = Object.keys(entriesByRegionAndCountry).sort();

              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-200">
                    <thead className="bg-un-blue text-white">
                      <tr>
                        <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">
                          Region
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">
                          Country
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">
                          Headline
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRegions.map((region) => {
                        const countries = Object.keys(entriesByRegionAndCountry[region]).sort(
                          (a, b) => {
                            if (a === "") return 1;
                            if (b === "") return -1;
                            return a.localeCompare(b);
                          },
                        );

                        // Count total entries in this region for rowspan
                        const regionEntryCount = countries.reduce(
                          (count, country) => count + entriesByRegionAndCountry[region][country].length,
                          0,
                        );

                        let entryIndexInRegion = 0;

                        return countries.map((country) => {
                          const countryEntries = entriesByRegionAndCountry[region][country];
                          let entryIndexInCountry = 0;

                          return countryEntries.map((entry, idx) => {
                            const isFirstInRegion = entryIndexInRegion === 0;
                            const isFirstInCountry = entryIndexInCountry === 0;
                            const displayCountry = Array.isArray(entry.country)
                              ? entry.country.join(" / ")
                              : entry.country || "(No country specified)";

                            const truncatedCountry = displayCountry.length > 100 
                              ? displayCountry.substring(0, 100) + '...' 
                              : displayCountry;

                            const result = (
                              <tr key={entry.id} className="hover:bg-slate-50">
                                {isFirstInRegion && (
                                  <td
                                    className="border border-slate-200 px-3 py-2 text-sm font-medium align-top"
                                    rowSpan={regionEntryCount}
                                  >
                                    {region}
                                  </td>
                                )}
                                {isFirstInCountry && (
                                  <td
                                    className="border border-slate-200 px-3 py-2 text-sm truncate align-top font-medium"
                                    title={displayCountry}
                                    rowSpan={countryEntries.length}
                                  >
                                    {truncatedCountry}
                                  </td>
                                )}
                                <td className="border border-slate-200 px-3 py-2 text-sm truncate" title={entry.headline}>
                                  {entry.headline.length > 100 ? entry.headline.substring(0, 100) + '...' : entry.headline}
                                </td>
                              </tr>
                            );

                            entryIndexInRegion++;
                            entryIndexInCountry++;
                            return result;
                          });
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
