"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getSubmittedEntries } from "@/lib/storage";
import { isWithinCutoffRange } from "@/lib/useEntriesFilter";
import { X } from "lucide-react";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  ImageRun,
  Header,
  ExternalHyperlink,
} from "docx";
import { saveAs } from "file-saver";
import { parseHtmlContent } from "@/lib/html-to-docx";
import type { MorningMeetingEntry } from "@/types/morning-meeting";

/**
 * Format a date string (YYYY-MM-DD) to long format without timezone conversion
 * Example: "2026-01-15" → "Wednesday, January 15, 2026"
 */
const formatDateLong = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = dayNames[date.getUTCDay()];

  return `${dayOfWeek}, ${monthNames[month - 1]} ${day}, ${year}`;
};

/**
 * Format a source date (ISO or YYYY-MM-DD format) to readable format
 * Example: "2026-01-20T05:00:00.000Z" or "2026-01-20" → "January 20, 2026"
 */
const formatSourceDate = (dateStr: string): string => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Extract YYYY-MM-DD from ISO format or direct date string
  const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return dateStr;

  const [, year, month, day] = dateMatch;
  const monthNum = parseInt(month, 10) - 1;

  return `${monthNames[monthNum]} ${parseInt(day, 10)}, ${year}`;
};

/**
 * Get current datetime string without timezone conversion
 */
const getCurrentDateTime = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${month}/${day}/${year}, ${displayHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
};

const createSeparator = (
  length: number = 63,
  spacing: { before?: number; after?: number } = { after: 200 },
): Paragraph =>
  new Paragraph({
    text: "─".repeat(length),
    spacing,
  });

/**
 * Create document header with UN logo
 */
const createDocumentHeader = async (): Promise<Table> => {
  let logoParagraphChildren: (ImageRun | TextRun)[] = [];

  try {
    const response = await fetch("/images/UN_Logo_Black.png");
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);

    logoParagraphChildren = [
      new ImageRun({
        data: imageData,
        transformation: {
          width: 43,
          height: 36,
        },
        type: "png",
      }),
    ];
  } catch (error) {
    console.error("Failed to load UN logo:", error);
    logoParagraphChildren = [
      new TextRun({
        text: "[UN Logo]",
        size: 16,
        color: "666666",
        font: "Roboto",
      }),
    ];
  }

  const headerTable = new Table({
    width: { size: 100, type: "pct" },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        height: { value: 720, rule: "atLeast" },
        children: [
          new TableCell({
            width: { size: 50, type: "pct" },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            margins: { top: 100, bottom: 0, left: 0, right: 100 },
            verticalAlign: "top",
            children: [
              new Paragraph({
                children: logoParagraphChildren,
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: "pct" },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            margins: { top: 0, bottom: 0, left: 100, right: 0 },
            verticalAlign: "center",
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "INTERNAL | NOT FOR FURTHER DISTRIBUTION",
                    bold: false,
                    size: 18,
                    color: "000000",
                    font: "Roboto",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return headerTable;
};

/**
 * Build PU Note paragraph
 */
const buildPuNoteParagraph = (puNote: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];

  try {
    const puNoteElements = parseHtmlContent(puNote);
    if (puNoteElements.length > 0) {
      const firstPara = puNoteElements[0];
      const prefixRun = new TextRun({
        text: "PU Note: ",
        bold: true,
        italics: true,
        font: "Roboto",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modifiedChildren = (firstPara as any).root?.[0]?.root || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const italicChildren = modifiedChildren.map((child: any) => {
        if (child.constructor.name === "TextRun") {
          return new TextRun({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...((child as any).root?.[0]?.root || {}),
            italics: true,
          });
        }
        return child;
      });
      paragraphs.push(
        new Paragraph({
          children: [prefixRun, ...italicChildren],
          spacing: { after: 100 },
        }),
      );
      for (let i = 1; i < puNoteElements.length; i++) {
        paragraphs.push(puNoteElements[i]);
      }
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "PU Note: ",
              bold: true,
              italics: true,
              font: "Roboto",
            }),
            new TextRun({
              text: puNote,
              italics: true,
              font: "Roboto",
            }),
          ],
          spacing: { after: 100 },
        }),
      );
    }
  } catch {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PU Note: ",
            bold: true,
            italics: true,
            font: "Roboto",
          }),
          new TextRun({
            text: puNote,
            italics: true,
            font: "Roboto",
          }),
        ],
        spacing: { after: 100 },
      }),
    );
  }

  return paragraphs;
};

/**
 * Generate briefing document blob
 */
const generateBriefingDocument = async (
  entries: MorningMeetingEntry[],
  selectedDate: string,
): Promise<Blob> => {
  // Sort by priority
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.priority === "sg-attention" && b.priority !== "sg-attention")
      return -1;
    if (a.priority !== "sg-attention" && b.priority === "sg-attention")
      return 1;
    return 0;
  });

  // Group by region and country
  const entriesByRegionAndCountry = sortedEntries.reduce(
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
        // Only group by first country to avoid duplicates
        const firstCountry = countries[0];
        if (!acc[entry.region][firstCountry]) {
          acc[entry.region][firstCountry] = [];
        }
        acc[entry.region][firstCountry].push(entry);
      }
      return acc;
    },
    {} as Record<string, Record<string, MorningMeetingEntry[]>>,
  );

  const sortedRegions = Object.keys(entriesByRegionAndCountry).sort();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Morning Meeting Update",
          bold: true,
          size: 32,
          font: "Roboto",
          color: "009edb",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: formatDateLong(selectedDate),
          size: 24,
          font: "Roboto",
          color: "009edb",
        }),
      ],
    }),
    createSeparator(),
  ];

  // Add entries grouped by region and country
  sortedRegions.forEach((region) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: region,
            bold: true,
            size: 24,
            font: "Roboto",
            color: "009edb",
          }),
        ],
      }),
    );

    const countries = Object.keys(entriesByRegionAndCountry[region]).sort(
      (a, b) => {
        if (a === "") return 1;
        if (b === "") return -1;
        return a.localeCompare(b);
      },
    );

    countries.forEach((country) => {
      if (country !== "") {
        // Get all countries for entries in this group
        const entriesInGroup = entriesByRegionAndCountry[region][country];
        const allCountries = entriesInGroup.length > 0 && entriesInGroup[0].country
          ? (Array.isArray(entriesInGroup[0].country) ? entriesInGroup[0].country.join(" / ") : entriesInGroup[0].country)
          : country;
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: allCountries,
                bold: true,
                size: 24,
                font: "Roboto",
              }),
            ],
            spacing: { before: 300, after: 200 },
          }),
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun("")],
          }),
        );
      }

      entriesByRegionAndCountry[region][country].forEach(
        (entry: MorningMeetingEntry, index: number) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: entry.headline,
                  bold: true,
                  size: 22,
                  font: "Roboto",
                }),
              ],
              spacing: { after: 100 },
            }),
          );

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    entry.priority === "sg-attention"
                      ? "SG Attention"
                      : "Situational Awareness",
                  italics: true,
                  size: 20,
                  font: "Roboto",
                }),
                new TextRun({
                  text: ` | ${entry.category}`,
                  italics: true,
                  size: 20,
                  font: "Roboto",
                }),
              ],
              spacing: { after: 150 },
            }),
          );

          if (entry.entry) {
            try {
              const contentElements = parseHtmlContent(entry.entry);
              children.push(...contentElements);
            } catch {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: entry.entry, font: "Roboto" }),
                  ],
                  spacing: { after: 100 },
                }),
              );
            }
          }

          if (entry.sourceName || entry.sourceDate) {
            const sourceChildren: (TextRun | ExternalHyperlink)[] = [
              new TextRun({
                text: "Source: ",
                italics: true,
                font: "Roboto",
              }),
            ];
            
            if (entry.sourceName) {
              if (entry.sourceUrl) {
                sourceChildren.push(
                  new ExternalHyperlink({
                    children: [
                      new TextRun({
                        text: entry.sourceName,
                        italics: true,
                        font: "Roboto",
                        style: "Hyperlink",
                      }),
                    ],
                    link: entry.sourceUrl,
                  })
                );
              } else {
                sourceChildren.push(
                  new TextRun({
                    text: entry.sourceName,
                    italics: true,
                    font: "Roboto",
                  }),
                );
              }
            }
            
            if (entry.sourceName && entry.sourceDate) {
              sourceChildren.push(
                new TextRun({
                  text: " | ",
                  italics: true,
                  font: "Roboto",
                }),
              );
            }
            
            if (entry.sourceDate) {
              sourceChildren.push(
                new TextRun({
                  text: formatSourceDate(entry.sourceDate),
                  italics: true,
                  font: "Roboto",
                }),
              );
            }
            
            children.push(
              new Paragraph({
                children: sourceChildren,
                spacing: { after: 100 },
              }),
            );
          }

          if (entry.puNote) {
            children.push(...buildPuNoteParagraph(entry.puNote));
          }

          const countryEntries = entriesByRegionAndCountry[region][country];
          if (index < countryEntries.length - 1) {
            children.push(createSeparator(40, { before: 200, after: 200 }));
          }
        },
      );

      children.push(createSeparator());
    });
  });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `Exported on ${getCurrentDateTime()}`,
          italics: true,
          font: "Roboto",
        }),
      ],
    }),
  );

  const headerTable = await createDocumentHeader();

  const doc = new Document({
    sections: [
      {
        properties: { page: {} },
        headers: {
          default: new Header({
            children: [headerTable],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
};

function BriefingContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const dateParam =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const [entries, setEntries] = useState<MorningMeetingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("");
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadEntries = async () => {
      if (!session?.user) {
        return;
      }

      setIsLoading(true);
      try {
        const allEntries = await getSubmittedEntries();
        const entriesForDate = allEntries.filter(
          (entry: MorningMeetingEntry) => {
            return isWithinCutoffRange(entry.date, dateParam);
          },
        );
        setEntries(entriesForDate);
      } catch (error) {
        console.error("Error loading entries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [dateParam, session?.user]);

  // Sort by priority (SG Attention first)
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.priority === "sg-attention" && b.priority !== "sg-attention")
      return -1;
    if (a.priority !== "sg-attention" && b.priority === "sg-attention")
      return 1;
    return 0;
  });

  // Group entries by region and country
  const entriesByRegionAndCountry = sortedEntries.reduce(
    (acc, entry) => {
      if (!acc[entry.region]) {
        acc[entry.region] = {};
      }

      // Handle entries without countries
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
        // Handle both single country (string) and multiple countries (array)
        // Group by full country constellation to separate different combinations
        const countries = Array.isArray(entry.country)
          ? entry.country
          : [entry.country];
        const countryKey = countries.join(" / ");
        if (!acc[entry.region][countryKey]) {
          acc[entry.region][countryKey] = [];
        }
        acc[entry.region][countryKey].push(entry)
      }
      return acc;
    },
    {} as Record<string, Record<string, MorningMeetingEntry[]>>,
  );

  const sortedRegions = Object.keys(entriesByRegionAndCountry).sort();

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

    // Observe all region sections
    sortedRegions.forEach((region) => {
      const element = document.getElementById(`region-${region}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sortedRegions]);

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
        className="mx-auto max-w-6xl lg:max-w-4xl xl:max-w-6xl px-8 sm:px-12 lg:ml-80 lg:mr-8 xl:mx-auto py-12 sm:py-16"
      >
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 pb-6 sm:mb-10 sm:flex-row sm:items-start sm:gap-0 sm:pb-8">
          <img
            src="/images/UN_Logo_Black.png"
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
        {sortedRegions.length === 0 ? (
          <p className="text-center text-slate-600">
            No entries found for this date.
          </p>
        ) : (
          <div className="space-y-10">
            {sortedRegions.map((region) => (
              <div
                key={region}
                id={`region-${region}`}
                className="scroll-mt-24 space-y-6"
              >
                {/* Region Header */}
                <h2 className="sticky top-0 z-30 border-b-2 border-un-blue bg-white py-3 text-2xl font-bold tracking-tight text-un-blue print:static print:border-none">
                  {region}
                </h2>

                {/* Countries in Region */}
                {Object.keys(entriesByRegionAndCountry[region])
                  .sort((a, b) => {
                    if (a === "") return 1;
                    if (b === "") return -1;
                    return a.localeCompare(b);
                  })
                  .map((country) => (
                    <div key={country} className="space-y-5">
                      {/* Country Header */}
                      {country !== "" && (
                        <h3 className="sticky top-16 z-20 border-b border-slate-300 bg-white py-2.5 text-xl font-bold tracking-tight text-slate-900 print:static print:border-none">
                          {country}
                        </h3>
                      )}

                      {/* Entries for Country */}
                      <div className="space-y-5">
                        {entriesByRegionAndCountry[region][country].map(
                          (entry, index) => (
                            <div key={entry.id} className="space-y-2.5">
                              {/* Headline */}
                              <h4 className="sticky top-28 z-10 border-b border-slate-200 bg-white py-2 text-lg leading-snug font-bold text-slate-900 print:static print:border-none">
                                {entry.headline}
                              </h4>

                              {/* Priority & Category */}
                              <p className="text-sm leading-relaxed text-slate-700 italic">
                                {entry.priority === "sg-attention"
                                  ? "SG Attention"
                                  : "Situational Awareness"}
                                {" | "}
                                {entry.category}
                              </p>

                              {/* Content */}
                              {entry.entry && (
                                <div
                                  className="text-base leading-relaxed text-slate-900 [&_img]:cursor-pointer [&_img]:transition-opacity [&_img]:hover:opacity-80 [&_strong]:font-semibold [&>blockquote]:my-3 [&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>p]:mb-3 [&>ul]:mb-3 [&>ul]:ml-6 [&>ul>li]:mb-1.5"
                                  dangerouslySetInnerHTML={{
                                    __html: entry.entry,
                                  }}
                                />
                              )}

                              {/* Source Information */}
                              {(entry.sourceName || entry.sourceDate) && (
                                <p className="text-sm leading-relaxed text-slate-600 italic">
                                  Source:{" "}
                                  {entry.sourceName && (
                                    entry.sourceUrl ? (
                                      <a
                                        href={entry.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-un-blue hover:underline"
                                      >
                                        {entry.sourceName}
                                      </a>
                                    ) : (
                                      <span>{entry.sourceName}</span>
                                    )
                                  )}
                                  {entry.sourceName && entry.sourceDate && " | "}
                                  {entry.sourceDate && formatSourceDate(entry.sourceDate)}
                                </p>
                              )}

                              {/* PU Note */}
                              {entry.puNote && (
                                <div className="text-sm leading-relaxed text-slate-800 italic">
                                  <span className="font-bold">PU Note: </span>
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: entry.puNote,
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
