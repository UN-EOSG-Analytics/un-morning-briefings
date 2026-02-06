"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewEntryDialog } from "./ViewEntryDialog";
import { SearchBar } from "./SearchBar";
import { ColumnFilter } from "./ColumnFilter";
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
}

export function EntriesTable({
  entries,
  onDelete,
  onToggleApproval,
  onPostpone,
  onSubmit,
  showApprovedColumn = false,
  emptyMessage = "No entries found.",
  resultLabel = "entries",
  initialDateFilter,
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
            Reset Filters
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
                      Date{" "}
                      {sortField === "date" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                    <span
                      className="cursor-pointer rounded px-1 py-1 hover:bg-slate-100 sm:hidden"
                      onClick={() => handleSort("date")}
                    >
                      Date
                    </span>
                    <div className="hidden sm:block">
                      <ColumnFilter
                        columnName="Briefing Date"
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
                    Headline{" "}
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
                      Region{" "}
                      {sortField === "region" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                    <ColumnFilter
                      columnName="Region"
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
                      Country{" "}
                      {sortField === "country" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </span>
                    <ColumnFilter
                      columnName="Country"
                      options={availableCountries}
                      selectedValue={filterCountry}
                      onValueChange={setFilterCountry}
                    />
                  </div>
                </th>
                {showApprovedColumn && (
                  <th className="hidden px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                    Status
                  </th>
                )}
                <th className="hidden rounded-tr-xl px-2 py-3 text-right text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                  Actions
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
                      Create your first entry
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
                            <span className="text-xs font-semibold text-un-blue">
                              ▼ Briefing for{" "}
                              {formatDateWithWeekday(currentBriefingDate)}
                            </span>
                            {!onSubmit && (
                              <div
                                className="ml-auto flex gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                  label: "Pending",
                                },
                                discussed: {
                                  bg: "bg-green-50",
                                  text: "text-green-700",
                                  icon: Check,
                                  label: "Discussed",
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
                                            Postpone
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
                    </tr>,
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
    </>
  );
}
