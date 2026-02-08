"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, TrendingUp, RefreshCw, Clock, Check, Send, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePopup } from "@/lib/popup-context";
import type { MorningMeetingEntry } from "@/types/morning-meeting";
import { ViewEntryDialog } from "./ViewEntryDialog";
import { SearchBar } from "./SearchBar";
import { ColumnFilter } from "./ColumnFilter";
import { REGIONS } from "@/types/morning-meeting";
import {
  formatDateDesktop,
  formatDateResponsive,
} from "@/lib/format-date";
import {
  getRegionBadgeClass,
} from "@/lib/useEntriesFilter";

export function ProfileEntries() {
  const { data: session, status } = useSession();
  const { info: showInfo, success: showSuccess } = usePopup();
  const router = useRouter();
  const [entries, setEntries] = useState<MorningMeetingEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedEntry, setSelectedEntry] = useState<MorningMeetingEntry | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const userName =
    session?.user?.firstName && session?.user?.lastName
      ? `${session.user.firstName} ${session.user.lastName}`
      : session?.user?.name || "User";

  const userEmail = session?.user?.email || "";

  const loadEntries = async () => {
    if (!userEmail) {
      console.log("No user email, skipping fetch");
      return;
    }

    console.log("Fetching entries for:", userEmail);
    try {
      const response = await fetch(`/api/entries?author=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error("Failed to fetch entries");
      
      const data = await response.json();
      console.log("Fetched entries:", data.length);
      setEntries(data);
    } catch (error) {
      console.error("Error loading entries:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load entries";
      showInfo("Error", errorMessage);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadEntries();
      showSuccess("Refreshed", "Profile data refreshed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to refresh data";
      showInfo("Error", errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && userEmail) {
      loadEntries();
    }
  }, [status, userEmail]);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries.filter((entry) => {
      const matchesSearch =
        searchTerm === "" ||
        entry.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.entry.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion =
        filterRegion === "all" || entry.region === filterRegion;

      return matchesSearch && matchesRegion;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "headline":
          aValue = a.headline.toLowerCase();
          bValue = b.headline.toLowerCase();
          break;
        case "region":
          aValue = a.region.toLowerCase();
          bValue = b.region.toLowerCase();
          break;
        case "status":
          aValue = a.approvalStatus || "";
          bValue = b.approvalStatus || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [entries, searchTerm, filterRegion, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = entries.length;
    const discussed = entries.filter(e => e.approvalStatus === "discussed").length;
    const pending = entries.filter(e => e.approvalStatus === "pending").length;
    const drafts = entries.filter(e => e.status === "draft").length;
    const submitted = entries.filter(e => e.status === "submitted").length;
    
    return { total, discussed, pending, drafts, submitted };
  }, [entries]);

  // Get discussed entries with comments (sorted by date, newest first)
  // Get entries with comments that have been followed up on (are referenced as previousEntryId)
  const addressedFollowUps = useMemo(() => {
    const entriesWithFollowUps = entries
      .filter(e => (e.approvalStatus === "discussed" || e.approvalStatus === "pending") && e.comment && entries.some(other => other.previousEntryId === e.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entriesWithFollowUps;
  }, [entries]);

  // Get entries with comments that haven't been followed up on yet (discussed or pending)
  const discussedEntriesWithComments = useMemo(() => {
    const addressedIds = new Set(addressedFollowUps.map(e => e.id));
    return entries
      .filter(e => (e.approvalStatus === "discussed" || e.approvalStatus === "pending") && e.comment && !addressedIds.has(e.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, addressedFollowUps]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      {/* Header with Statistics */}
      <Card className="border-slate-200 sm:p-0 px-4">
        <div className="flex flex-col gap-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-un-blue">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                  {userName}
                </h1>
                <p className="text-xs text-slate-600 sm:text-sm">
                  Officer • {userEmail}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full justify-center sm:h-10 sm:w-auto sm:px-6"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="sm:inline">Refresh</span>
            </Button>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-600" />
                <p className="text-xs font-medium text-slate-600">Total Entries</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>

                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-900">Submitted</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-900">{stats.submitted}</p>
            </div>
            
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <p className="text-xs font-medium text-green-900">Discussed</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-green-900">{stats.discussed}</p>
            </div>
            
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <p className="text-xs font-medium text-yellow-900">Pending</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            
          </div>
        </div>
      </Card>

      {/* Discussed Entries with Comments */}
      {discussedEntriesWithComments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2 sm:px-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Entries with Feedback
            </h2>
            <span className="inline-flex items-center justify-center rounded-full bg-green-100 h-6 w-6 text-xs font-bold text-green-700">
              {discussedEntriesWithComments.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discussedEntriesWithComments.map((entry) => {
              const isPending = entry.approvalStatus === "pending";
              const borderColor = isPending ? "border-yellow-200" : "border-green-200";
              const bgColor = isPending ? "bg-yellow-50" : "bg-green-50";
              const hoverColor = isPending ? "hover:border-yellow-400" : "hover:border-green-400";
              const textColor = isPending ? "text-yellow-700" : "text-green-700";
              const textDarkColor = isPending ? "text-yellow-900" : "text-green-900";
              const buttonBorderColor = isPending ? "border-yellow-300" : "border-green-300";
              const buttonBgColor = isPending ? "hover:bg-yellow-100" : "hover:bg-green-100";
              
              return (
                <Card
                  key={entry.id}
                  className={`${borderColor} ${bgColor} p-4 ${hoverColor} transition-colors cursor-pointer`}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setShowViewDialog(true);
                  }}
                >
                  <div className="space-y-3">
                    <div>
                      <p className={`text-xs font-semibold ${textColor} uppercase tracking-wide`}>
                        {formatDateDesktop(entry.date)}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                        {entry.headline}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getRegionBadgeClass(entry.region)}`}>
                        {entry.region}
                      </span>
                      {entry.country && (
                        <span className="inline-block rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">
                          {Array.isArray(entry.country) ? entry.country.join(", ") : entry.country}
                        </span>
                      )}
                    </div>
                    <div className={`border-t ${borderColor} pt-3`}>
                      <p className={`text-xs font-medium ${textDarkColor}`}>Feedback:</p>
                      <p className="mt-1 line-clamp-3 text-sm text-slate-700">
                        {entry.comment}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`w-full ${buttonBorderColor} ${textColor} ${buttonBgColor}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/form?followUp=${entry.id}`);
                      }}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      Follow Up
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Addressed Follow-Ups */}
      {addressedFollowUps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2 sm:px-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Addressed Feedback
            </h2>
            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 h-6 w-6 text-xs font-bold text-blue-700">
              {addressedFollowUps.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addressedFollowUps.map((entry) => (
              <Card
                key={entry.id}
                className="border-blue-200 bg-blue-50 p-4 hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedEntry(entry);
                  setShowViewDialog(true);
                }}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      {formatDateDesktop(entry.date)}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                      {entry.headline}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getRegionBadgeClass(entry.region)}`}>
                      {entry.region}
                    </span>
                    {entry.country && (
                      <span className="inline-block rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">
                        {Array.isArray(entry.country) ? entry.country.join(", ") : entry.country}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-blue-200 pt-3">
                    <p className="text-xs font-medium text-blue-900">Feedback:</p>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-700">
                      {entry.comment}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <Card className="border-slate-200 p-3">
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-slate-200 p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="min-w-12 rounded-tl-xl px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:min-w-26 sm:px-4">
                  <span
                    className="inline-block cursor-pointer rounded px-1 py-1 hover:bg-slate-100"
                    onClick={() => handleSort("date")}
                  >
                    Date{" "}
                    {sortField === "date" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </span>
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
                  <span
                    className="cursor-pointer rounded px-1 py-1 hover:bg-slate-100"
                    onClick={() => handleSort("status")}
                  >
                    Status{" "}
                    {sortField === "status" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </span>
                </th>
                <th className="hidden rounded-tr-xl px-2 py-3 text-left text-xs font-semibold tracking-wide text-slate-700 uppercase sm:table-cell sm:px-3 lg:px-4">
                  Comment
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-2 py-12 text-center text-slate-500 sm:px-4"
                  >
                    {entries.length === 0
                      ? "No entries found."
                      : "No entries match your filters."}
                  </td>
                </tr>
              ) : (
                filteredAndSortedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-3 text-sm whitespace-nowrap text-slate-600 sm:px-4">
                      <div className="flex flex-col gap-1">
                        <span className="hidden sm:inline">
                          {formatDateDesktop(entry.date)}
                        </span>
                        <span className="sm:hidden">
                          {formatDateResponsive(entry.date).mobile}
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
                    <td className="hidden px-2 py-3 whitespace-nowrap sm:table-cell sm:px-3 lg:px-4">
                      {(() => {
                        const status = entry.approvalStatus || "pending";
                        if (status === "discussed") {
                          return (
                            <div className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium bg-green-50 text-green-700">
                              <Check className="h-3 w-3" />
                              <span>Discussed</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700">
                              <Clock className="h-3 w-3" />
                              <span>Pending</span>
                            </div>
                          );
                        }
                      })()}
                    </td>
                    <td className="hidden px-2 py-3 text-sm text-slate-600 sm:table-cell sm:px-3 lg:px-4">
                      <div className="max-w-xs truncate">
                        {entry.comment || "—"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Result Count */}
      <div className="text-sm text-slate-600">
        Showing {filteredAndSortedEntries.length} of {entries.length} entries
      </div>

      {/* View Entry Dialog */}
      <ViewEntryDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        entry={selectedEntry}
      />
    </div>
  );
}
