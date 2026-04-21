"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getSubmittedEntries } from "@/lib/storage";
import { isWithinCutoffRange, getCurrentBriefingDate } from "@/lib/useEntriesFilter";
import { X } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  formatDateLong,
  formatDateFull,
  getCurrentDateTime,
} from "@/lib/format-date";
import type { MorningMeetingEntry } from "@/types/morning-meeting";
import {
  groupEntriesByRegionAndCountry,
  sortCountryKeys,
} from "@/lib/entry-grouping";

function BriefingContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const dateParam =
    searchParams.get("date") || getCurrentBriefingDate();
  const [entries, setEntries] = useState<MorningMeetingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("");
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const loadEntries = useCallback(
    async (showLoader = false) => {
      if (!session?.user) return;
      if (showLoader) setIsLoading(true);
      try {
        const allEntries = await getSubmittedEntries();
        const entriesForDate = allEntries.filter(
          (entry: MorningMeetingEntry) => isWithinCutoffRange(entry.date, dateParam),
        );
        setEntries(entriesForDate);
      } catch (error) {
        console.error("Error loading entries:", error);
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [dateParam, session?.user],
  );

  useEffect(() => {
    loadEntries(true);
  }, [loadEntries]);

  useEffect(() => {
    const interval = setInterval(() => loadEntries(), 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadEntries();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadEntries]);

  const weeklyOutlookEntries = entries.filter(
    (e) => e.category === "Weekly Outlook" || e.region === "Weekly Outlook",
  );
  const regularEntries = entries.filter(
    (e) => e.category !== "Weekly Outlook" && e.region !== "Weekly Outlook",
  );

  const { grouped: entriesByRegionAndCountry, sortedRegions } =
    groupEntriesByRegionAndCountry(regularEntries);

  // Count entries per region
  const entriesPerRegion = sortedRegions.reduce(
    (acc, region) => {
      const countries = entriesByRegionAndCountry[region];
      const count = Object.values(countries).flat().length;
      acc[region] = count;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Set up intersection observer to track active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      },
    );

    // Observe Weekly Outlook section and all region sections
    const weeklyEl = document.getElementById("region-weekly-outlook");
    if (weeklyEl) observer.observe(weeklyEl);
    sortedRegions.forEach((region) => {
      const element = document.getElementById(`region-${region}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sortedRegions, weeklyOutlookEntries]);

  // Track scroll position for percentage display
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent =
        docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      setScrollPercentage(scrollPercent);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Add click handlers to images for full screen view
  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        setFullScreenImage(img.src);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener("click", handleImageClick);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener("click", handleImageClick);
      }
    };
  }, [entries]);

  const scrollToSection = (regionId: string) => {
    const element = document.getElementById(regionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-slate-600">Loading briefing...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-slate-600">Please log in to view briefings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Full Screen Image Lightbox */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 print:hidden"
          onClick={() => setFullScreenImage(null)}
        >
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 text-white transition-colors hover:text-slate-300"
            aria-label="Close full screen image"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={fullScreenImage}
            alt="Full screen view"
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Agenda Sidebar - Hidden on mobile and when printing */}
      <div className="fixed top-20 left-4 hidden w-56 lg:block print:hidden">
        <div className="sticky top-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold tracking-wide text-slate-900 uppercase">
              Contents{" "}
              <span className="text-xs opacity-75">({scrollPercentage}%)</span>
            </h3>
            <nav className="space-y-1">
              {weeklyOutlookEntries.length > 0 && (
                <button
                  onClick={() => scrollToSection("region-weekly-outlook")}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    activeSection === "region-weekly-outlook"
                      ? "bg-un-blue font-semibold text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>Weekly Outlook</span>
                </button>
              )}
              {sortedRegions.map((region) => {
                const regionId = `region-${region}`;
                const isActive = activeSection === regionId;
                const count = entriesPerRegion[region] || 0;
                return (
                  <button
                    key={region}
                    onClick={() => scrollToSection(regionId)}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-un-blue font-semibold text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span>{region}</span>
                    <span className="ml-1 text-xs opacity-75">({count})</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Progress Bar - Visible on smaller screens when sidebar is hidden */}
      <div className="fixed top-16 bottom-0 left-0 z-40 w-1.5 bg-slate-200 lg:hidden print:hidden">
        <div
          className="w-full bg-un-blue transition-all duration-300"
          style={{ height: `${scrollPercentage}%` }}
        />
      </div>

      {/* Document Container */}
      <div
        ref={contentRef}
        className="mx-auto max-w-6xl px-8 py-12 sm:px-12 sm:py-16 lg:pr-8 lg:pl-[8rem] xl:pl-[12rem]"
      >
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 pb-6 sm:mb-10 sm:flex-row sm:items-start sm:gap-0 sm:pb-8">
          <img
            src="/images/un-logo-black.png"
            alt="UN Logo"
            className="h-8 sm:h-10"
          />
          <p className="text-left text-xs tracking-wide text-slate-700 sm:text-right">
            INTERNAL | NOT FOR FURTHER DISTRIBUTION
          </p>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-center text-4xl font-bold tracking-tight text-un-blue">
          Morning Meeting Update
        </h1>
        <p className="mb-10 text-center text-2xl text-un-blue">
          {formatDateLong(dateParam)}
        </p>

        <div className="mb-10 border-t border-slate-400"></div>

        {/* Content */}
        {sortedRegions.length === 0 && weeklyOutlookEntries.length === 0 ? (
          <p className="text-center text-slate-600">
            No entries found for this date.
          </p>
        ) : (
          <div className="space-y-10">
            {weeklyOutlookEntries.map((entry) => (
              <div
                key={entry.id}
                id="region-weekly-outlook"
                className="scroll-mt-24 space-y-6"
              >
                <h2 className="sticky top-0 z-30 border-b-2 border-un-blue bg-white py-3 text-center text-2xl font-bold tracking-tight text-un-blue print:static print:border-none">
                  Weekly Outlook
                </h2>
                {entry.entry && (
                  <div
                    className="text-base leading-relaxed text-slate-900 [&_a]:text-un-blue [&_a]:underline [&_a]:hover:opacity-80 [&_b]:font-semibold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-un-blue [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&>ul]:mb-3"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(entry.entry),
                    }}
                  />
                )}
              </div>
            ))}
            {sortedRegions.map((region) => (
              <div
                key={region}
                id={`region-${region}`}
                className="scroll-mt-24 space-y-6"
              >
                {/* Region Header */}
                <h2 className="sticky top-0 z-30 border-b-2 border-un-blue bg-white py-3 text-center text-2xl font-bold tracking-tight text-un-blue print:static print:border-none">
                  {region}
                </h2>

                {/* Countries in Region */}
                {sortCountryKeys(
                  Object.keys(entriesByRegionAndCountry[region]),
                ).map((country) => (
                    <div key={country} className="space-y-5">
                      {/* Country Header */}
                      {country !== "" && (
                        <h3 className="sticky top-16 z-20 border-b border-slate-300 bg-white py-2.5 text-xl font-bold tracking-tight text-un-blue print:static print:border-none">
                          {country}
                        </h3>
                      )}

                      {/* Entries for Country */}
                      <div className="space-y-5">
                        {entriesByRegionAndCountry[region][country].map(
                          (entry, index) => (
                            <div key={entry.id} className="space-y-4">
                              {/* Headline + Source */}
                              <div>
                                <h4 className="sticky top-28 z-10 border-b border-slate-200 bg-white py-2 text-lg leading-snug font-bold text-slate-900 print:static print:border-none">
                                  • {entry.headline}
                                </h4>
                                {entry.sources && entry.sources.length > 0 ? (
                                    <p className="mt-1 text-sm text-slate-600 italic">
                                      Source:{" "}
                                      {entry.sources.map((src: { name?: string; url?: string; date?: string }, idx: number) => (
                                        <span key={idx}>
                                          {idx > 0 && " | "}
                                          {src.name && (src.url ? (
                                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-un-blue hover:underline">{src.name}</a>
                                          ) : (
                                            <span>{src.name}</span>
                                          ))}
                                          {src.name && src.date && " "}
                                          {src.date && `(${formatDateFull(src.date)})`}
                                        </span>
                                      ))}
                                    </p>
                                ) : (() => {
                                  const sn = Array.isArray(entry.sourceName)
                                    ? entry.sourceName.join(", ")
                                    : entry.sourceName;
                                  return sn || entry.sourceDate ? (
                                    <p className="mt-1 text-sm text-slate-600 italic">
                                      Source:{" "}
                                      {sn &&
                                        (entry.sourceUrl ? (
                                          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-un-blue hover:underline">{sn}</a>
                                        ) : (
                                          <span>{sn}</span>
                                        ))}
                                      {sn && entry.sourceDate && " | "}
                                      {entry.sourceDate && formatDateFull(entry.sourceDate)}
                                    </p>
                                  ) : null;
                                })()}
                              </div>

                              {/* Priority */}
                              <p className="text-sm text-slate-700 italic">
                                {entry.priority === "SG's attention"
                                  ? "SG's attention"
                                  : "Situational Awareness"}
                              </p>

                              {/* Content */}
                              {entry.entry && (
                                <div
                                  className="text-base leading-relaxed text-slate-900 [&_a]:text-un-blue [&_a]:underline [&_a]:hover:opacity-80 [&_b]:font-semibold [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm [&_del]:line-through [&_img]:max-w-full [&_img]:cursor-pointer [&_img]:transition-opacity [&_img]:hover:opacity-80 [&_li]:mb-1 [&_mark]:bg-yellow-200 [&_ol]:list-decimal [&_ol]:pl-5 [&_s]:line-through [&_strong]:font-semibold [&_sub]:align-sub [&_sub]:text-xs [&_sup]:align-super [&_sup]:text-xs [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&>blockquote]:my-3 [&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>h1]:my-3 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:my-2 [&>h2]:text-xl [&>h2]:font-bold [&>h3]:my-2 [&>h3]:text-lg [&>h3]:font-semibold [&>hr]:my-4 [&>hr]:border-slate-300 [&>ol]:mb-3 [&>p]:mb-3 [&>pre]:mb-3 [&>pre]:overflow-x-auto [&>pre]:rounded [&>pre]:bg-slate-100 [&>pre]:p-3 [&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>ul]:mb-3"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(entry.entry),
                                  }}
                                />
                              )}

                              {/* PU Note */}
                              {entry.puNote && (
                                <div className="text-sm text-slate-800 italic">
                                  <span className="font-bold">PU Note: </span>
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHtml(entry.puNote),
                                    }}
                                  />
                                </div>
                              )}

                              {/* Separator between entries */}
                              {index <
                                entriesByRegionAndCountry[region][country]
                                  .length -
                                  1 && (
                                <div className="my-4 h-px bg-slate-200"></div>
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      {/* Country separator */}
                      <div className="mt-6 h-px bg-slate-400"></div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 text-center">
          <p className="text-sm text-slate-600 italic">
            Generated on {getCurrentDateTime()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BriefingPage() {
  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-white">
            <p className="text-slate-600">Loading...</p>
          </div>
        }
      >
        <BriefingContent />
      </Suspense>
    </>
  );
}
