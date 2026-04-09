"use client";

import { useState, useEffect } from "react";
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
import { generateDocumentBlob } from "@/components/ExportDailyBriefingDialog";
import { formatExportFilename } from "@/lib/briefing-docx";
import {
  groupEntriesByRegionAndCountry,
  sortCountryKeys,
} from "@/lib/entry-grouping";
import { toggleDiscussionStatus } from "@/lib/storage";
import { saveAs } from "file-saver";
import labels from "@/lib/labels.json";
import { usePopup } from "@/lib/popup-context";

interface EntriesTableProps {
  entries: MorningMeetingEntry[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onToggleDiscussion?: (entry: MorningMeetingEntry) => void;
  onPostpone?: () => void;
  onSubmit?: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: any) => void;
  showDiscussionColumn?: boolean;
  emptyMessage?: string;
  resultLabel?: string;
  initialDateFilter?: string;
  hideCommentAction?: boolean;
}

export function EntriesTable({
  entries,
  loading = false,
  onDelete,
  onToggleDiscussion,
  onPostpone,
  onSubmit,
  onUpdate,
  showDiscussionColumn = false,
  emptyMessage = labels.entries.empty.noEntries,
  resultLabel = "entries",
  initialDateFilter,
  hideCommentAction = false,
}: EntriesTableProps) {
  const router = useRouter();
  const { error: showError } = usePopup();
  const [selectedEntry, setSelectedEntry] =
    useState<MorningMeetingEntry | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(
    null,
  );
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [exportingDate, setExportingDate] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [collapsedBriefings, setCollapsedBriefings] = useState<Set<string>>(
    new Set(), // All briefings expanded by default
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
      await toggleDiscussionStatus(
        entryId,
        newStatus as "pending" | "discussed",
      );

      // Trigger a refresh via the parent callback rather than mutating props
      if (onToggleDiscussion) {
        const entry = entries.find((e) => e.id === entryId);
        if (entry) onToggleDiscussion(entry);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showError(
        "Update Failed",
        "Failed to update discussion status. Please try again.",
      );
    } finally {
      setUpdatingStatus(null);
      setOpenStatusDropdown(null);
      setDropdownPos(null);
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

      // Trigger refresh to re-fetch entries from the server
      if (onPostpone) {
        onPostpone();
      }
    } catch (error) {
      console.error("Error postponing entry:", error);
      showError(
        "Postpone Failed",
        "Failed to postpone entry. Please try again.",
      );
    } finally {
      setUpdatingStatus(null);
      setOpenStatusDropdown(null);
      setDropdownPos(null);
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
        setDropdownPos(null);
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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      );
    }
    return <ArrowUpDown className="h-3 w-3 opacity-40" />;
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
      entries
        .flatMap((entry) =>
          Array.isArray(entry.country) ? entry.country : [entry.country],
        )
        .filter(Boolean),
    ),
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
                      className="hidden cursor-pointer items-center gap-1 rounded px-1 py-1 whitespace-nowrap hover:bg-slate-100 sm:inline-flex"
                      onClick={() => handleSort("date")}
                    >
                      {labels.entries.columns.date}
                      <SortIcon field="date" />
                    </span>
                    <span
                      className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-1 hover:bg-slate-100 sm:hidden"
                      onClick={() => handleSort("date")}
                    >
                      {labels.entries.columns.date}
                      <SortIcon field="date" />
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
                  {labels.entries.columns.headline}
                </th>
                <th className="hidden px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-1 hover:bg-slate-100"
                      onClick={() => handleSort("region")}
                    >
                      {labels.entries.columns.region}
                      <SortIcon field="region" />
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
                    <span className="inline-flex items-center gap-1 px-1 py-1">
                      {labels.entries.columns.tag}
                    </span>
                    <ColumnFilter
                      columnName={labels.entries.columns.tag}
                      options={availableCountries}
                      selectedValue={filterCountry}
                      onValueChange={setFilterCountry}
                    />
                  </div>
                </th>
                {showDiscussionColumn && (
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
              {loading ? (
                <tr>
                  <td
                    colSpan={showDiscussionColumn ? 7 : 6}
                    className="px-2 py-12 text-center text-slate-400 sm:px-4"
                  >
                    Loading entries…
                  </td>
                </tr>
              ) : sortedEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={showDiscussionColumn ? 7 : 6}
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

                  const prevEntryInSameDay =
                    idx > 0 &&
                    getBriefingDate(sortedEntries[idx - 1].date) ===
                      currentBriefingDate;
                  const showRegionHeader =
                    sortField === "region" &&
                    (!prevEntryInSameDay ||
                      sortedEntries[idx - 1].region !== entry.region);

                  return [
                    showSeparator && (
                      <tr key={`sep-${entry.id}`} className="bg-slate-100">
                        <td
                          colSpan={showDiscussionColumn ? 7 : 6}
                          className="px-2 py-2 sm:px-4"
                        >
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() =>
                                toggleBriefingCollapse(currentBriefingDate)
                              }
                              className="-ml-2 flex items-center gap-2 p-1 text-sm font-semibold text-un-blue transition-colors hover:text-un-blue/80"
                              title={
                                collapsedBriefings.has(currentBriefingDate)
                                  ? "Expand"
                                  : "Collapse"
                              }
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
                                    const entriesForDate = entries.filter((e) =>
                                      isWithinCutoffRange(
                                        e.date,
                                        currentBriefingDate,
                                      ),
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
                                        (e) =>
                                          isWithinCutoffRange(
                                            e.date,
                                            currentBriefingDate,
                                          ),
                                      );
                                      // Generate and download the document
                                      const blob = await generateDocumentBlob(
                                        entriesForDate,
                                        currentBriefingDate,
                                        true, // includeImages
                                      );
                                      saveAs(
                                        blob,
                                        formatExportFilename(
                                          currentBriefingDate,
                                        ),
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Error exporting briefing:",
                                        error,
                                      );
                                      showError(
                                        "Export Failed",
                                        "Failed to export briefing. Please try again.",
                                      );
                                    } finally {
                                      setExportingDate(null);
                                    }
                                  }}
                                  disabled={
                                    exportingDate === currentBriefingDate
                                  }
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
                    showRegionHeader &&
                      !collapsedBriefings.has(currentBriefingDate) && (
                        <tr
                          key={`region-${entry.id}`}
                          className="bg-un-blue/5"
                        >
                          <td
                            colSpan={showDiscussionColumn ? 7 : 6}
                            className="px-2 py-1.5 sm:px-4"
                          >
                            <span className="text-xs font-bold tracking-wide text-un-blue uppercase">
                              {entry.region}
                            </span>
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
                              {formatTime(entry.date)}{" "}
                              <span className="text-slate-400">ET</span>
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
                        <td className="hidden max-w-48 px-2 py-3 sm:table-cell sm:px-3 lg:px-4">
                          <div className="flex gap-1 overflow-hidden">
                            {Array.isArray(entry.country) &&
                            entry.country.length > 0 ? (
                              entry.country.map((country: string) => (
                                <span
                                  key={country}
                                  className="inline-block max-w-24 truncate rounded bg-gray-100 px-2 py-1 text-xs font-medium whitespace-nowrap text-gray-800"
                                  title={country}
                                >
                                  {country}
                                </span>
                              ))
                            ) : entry.country ? (
                              <span
                                className="inline-block max-w-24 truncate rounded bg-gray-100 px-2 py-1 text-xs font-medium whitespace-nowrap text-gray-800"
                                title={entry.country}
                              >
                                {entry.country}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </div>
                        </td>
                        {showDiscussionColumn && (
                          <td
                            className="hidden px-2 py-3 whitespace-nowrap sm:table-cell sm:px-3 lg:px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="status-dropdown-container relative">
                              {(() => {
                                const status =
                                  entry.discussionStatus || "pending";
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
                                      onClick={(e) => {
                                        if (openStatusDropdown === entry.id) {
                                          setOpenStatusDropdown(null);
                                          setDropdownPos(null);
                                        } else {
                                          const rect =
                                            e.currentTarget.getBoundingClientRect();
                                          setDropdownPos({
                                            top: rect.bottom + 6,
                                            left: rect.left,
                                          });
                                          setOpenStatusDropdown(entry.id);
                                        }
                                      }}
                                      disabled={updatingStatus === entry.id}
                                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 ${config.bg} ${config.text} disabled:opacity-50`}
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                      {config.label}
                                    </button>
                                    {openStatusDropdown === entry.id &&
                                      dropdownPos && (
                                        <div
                                          className="fixed z-50 w-max rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                          style={{
                                            top: dropdownPos.top,
                                            left: dropdownPos.left,
                                          }}
                                        >
                                          {["pending", "discussed"]
                                            .filter((s) => s !== status)
                                            .map((statusOption) => {
                                              const statusConfig =
                                                badgeConfig[
                                                  statusOption as keyof typeof badgeConfig
                                                ];
                                              const StatusIcon =
                                                statusConfig.icon;
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
                                              disabled={
                                                updatingStatus === entry.id
                                              }
                                              className="block w-full border-t border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                            >
                                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                                                <FastForward className="h-3.5 w-3.5" />
                                                {
                                                  labels.entries.actions
                                                    .postpone
                                                }
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
                                  handleActionClick(e, () =>
                                    handleSubmitEntry(entry.id),
                                  )
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
                                  onSave={(comment) =>
                                    handleSaveComment(entry.id, comment)
                                  }
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
        onDiscuss={onToggleDiscussion}
        onPostpone={onPostpone}
        onUpdate={onUpdate}
        showDiscussButton={showDiscussionColumn}
        allEntries={sortedEntries}
      />

      {/* Briefing Agenda Dialog */}
      <Dialog open={showAgendaDialog} onOpenChange={setShowAgendaDialog}>
        <DialogContent aria-describedby={undefined} className="flex h-screen max-w-full flex-col p-0 sm:!max-w-[60vw] md:h-auto md:max-h-[40vw]">
          <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-4 py-3 md:px-6">
            <DialogTitle className="text-xl font-semibold text-un-blue">
              Briefing Agenda for{" "}
              {agendaDate && formatDateWithWeekday(agendaDate)}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6">
            {(() => {
              const { grouped: entriesByRegionAndCountry, sortedRegions } =
                groupEntriesByRegionAndCountry(agendaEntries);

              return (
                <div className="space-y-6">
                  {sortedRegions.map((region) => {
                    const countries = sortCountryKeys(
                      Object.keys(entriesByRegionAndCountry[region]),
                    );

                    return (
                      <div key={region}>
                        {/* Region Header */}
                        <h3 className="border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-un-blue">
                          {region}
                        </h3>

                        {/* Region Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-200">
                            <thead className="bg-un-blue text-white">
                              <tr>
                                <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">
                                  Country
                                </th>
                                <th className="border border-slate-300 px-3 py-2 text-left text-sm font-semibold">
                                  Headline
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {countries.map((country) => {
                                const countryEntries =
                                  entriesByRegionAndCountry[region][country];

                                return countryEntries.map((entry, entryIndex) => {
                                  const displayCountry = Array.isArray(
                                    entry.country,
                                  )
                                    ? entry.country.join(" / ")
                                    : entry.country || "(No country specified)";

                                  return (
                                    <tr
                                      key={entry.id}
                                      className="hover:bg-slate-50"
                                    >
                                      {entryIndex === 0 && (
                                        <td
                                          className="border border-slate-200 px-3 py-2 align-top text-sm font-medium break-words whitespace-normal"
                                          rowSpan={countryEntries.length}
                                        >
                                          {displayCountry}
                                        </td>
                                      )}
                                      <td className="border border-slate-200 px-3 py-2 text-sm break-words whitespace-normal">
                                        {entry.headline}
                                      </td>
                                    </tr>
                                  );
                                });
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
