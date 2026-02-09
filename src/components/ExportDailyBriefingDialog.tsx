"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getSubmittedEntries } from "@/lib/storage";
import { isWithinCutoffRange } from "@/lib/useEntriesFilter";
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
  WidthType,
  VerticalAlign,
} from "docx";
import { saveAs } from "file-saver";
import { FileText, Calendar, Mail, Download, Eye } from "lucide-react";
import { parseHtmlContent } from "@/lib/html-to-docx";
import { usePopup } from "@/lib/popup-context";
import { formatDateLong, formatDateFull, getCurrentDateTime } from "@/lib/format-date";
import type { MorningMeetingEntry } from "@/types/morning-meeting";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// formatDateLong, formatDateFull (replaces formatSourceDate), getCurrentDateTime
// are now imported from @/lib/format-date

const createSeparator = (
  length: number = 63,
  spacing: { before?: number; after?: number } = { after: 200 },
): Paragraph =>
  new Paragraph({
    text: "─".repeat(length),
    spacing,
  });

/**
 * Format filename: MM YYMMDD DayOfWeek DD MonthName
 * e.g., "MM 251212 Friday 12 December.docx" for 2025-12-12
 */
const formatExportFilename = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
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
  const dayOfWeek = dayNames[date.getUTCDay()];
  const monthName = monthNames[month - 1];
  const yymmdd = `${String(year).slice(2)}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  return `MM ${yymmdd} ${dayOfWeek} ${day} ${monthName}.docx`;
};

/**
 * Process images in entries - downloads from blob storage and converts to data URLs
 */
const processEntriesImages = async (
  entries: MorningMeetingEntry[],
  includeImages: boolean,
): Promise<MorningMeetingEntry[]> => {
  const processedEntries = [...entries];

  for (const entry of processedEntries) {
    let html = entry.entry;

    // Skip image processing if includeImages is false
    if (!includeImages) {
      html = html.replace(/<img[^>]*>/gi, "");
      entry.entry = html;
      continue;
    }

    // Process tracked images (uploaded via the editor)
    if (entry.images && entry.images.length > 0) {
      for (const img of entry.images) {
        try {
          if (img.position === null || img.position === undefined) {
            continue;
          }

          const ref = `image-ref://img-${img.position}`;

          if (!html.includes(ref)) {
            continue;
          }

          const response = await fetch(`/api/images/${img.id}`);
          if (!response.ok) {
            html = html.replace(
              new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, "gi"),
              "",
            );
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const base64Data = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              "",
            ),
          );
          const dataUrl = `data:${img.mimeType};base64,${base64Data}`;

          const searchPattern = new RegExp(
            `src=["']${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
            "gi",
          );
          html = html.replace(searchPattern, `src="${dataUrl}"`);
        } catch (error) {
          console.error(`Error downloading image ${img.id}:`, error);
          const ref = `image-ref://img-${img.position}`;
          html = html.replace(
            new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, "gi"),
            "",
          );
        }
      }
    }

    // Download and convert external image URLs to data URLs
    const externalImgRegex =
      /<img[^>]*src=["']?(https?:\/\/[^"'\s>]+)["']?([^>]*)>/gi;
    let match;
    const replacements: Array<{ from: string; to: string }> = [];

    while ((match = externalImgRegex.exec(html)) !== null) {
      const fullTag = match[0];
      const imageUrl = match[1];
      const restOfTag = match[2];

      try {
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) {
          continue;
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64Data = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );

        const mimeType =
          blob.type || response.headers.get("content-type") || "image/png";
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        const newTag = `<img src="${dataUrl}"${restOfTag}>`;
        replacements.push({ from: fullTag, to: newTag });
      } catch (error) {
        console.error("Error downloading external image:", imageUrl, error);
      }
    }

    for (const { from, to } of replacements) {
      html = html.replace(from, to);
    }

    entry.entry = html;
  }

  return processedEntries;
};

/**
 * Build PU Note paragraph with italic formatting and rich text support
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
      const modifiedChildren = (firstPara as any).root?.[0]?.root || [];
      const italicChildren = modifiedChildren.map((child: any) => {
        if (child.constructor.name === "TextRun") {
          return new TextRun({
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
      paragraphs.push(createPlainPuNoteParagraph(puNote));
    }
  } catch {
    paragraphs.push(createPlainPuNoteParagraph(puNote));
  }

  return paragraphs;
};

const createPlainPuNoteParagraph = (puNote: string): Paragraph =>
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
  });

/**
 * Build table of contents from the structured entries as an actual table
 */
const buildTableOfContents = (
  entriesByRegionAndCountry: Record<string, Record<string, MorningMeetingEntry[]>>,
  sortedRegions: string[],
): (Paragraph | Table)[] => {
  const tocElements: (Paragraph | Table)[] = [
    // TOC Title
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 300 },
      children: [
        new TextRun({
          text: "TABLE OF CONTENTS",
          bold: true,
          size: 24,
          font: "Roboto",
          color: "009edb",
        }),
      ],
    }),
  ];

  // Collect all rows for the table
  const tableRows: TableRow[] = [];

  // Header row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: "009edb" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Region",
                  bold: true,
                  color: "FFFFFF",
                  size: 20,
                  font: "Roboto",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: "009edb" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Country",
                  bold: true,
                  color: "FFFFFF",
                  size: 20,
                  font: "Roboto",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: "009edb" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Headline",
                  bold: true,
                  color: "FFFFFF",
                  size: 20,
                  font: "Roboto",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: "009edb" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Category",
                  bold: true,
                  color: "FFFFFF",
                  size: 20,
                  font: "Roboto",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: "009edb" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Priority",
                  bold: true,
                  color: "FFFFFF",
                  size: 20,
                  font: "Roboto",
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // Data rows
  sortedRegions.forEach((region) => {
    // Get countries for this region
    const countries = Object.keys(entriesByRegionAndCountry[region]).sort(
      (a, b) => {
        if (a === "") return 1;
        if (b === "") return -1;
        return a.localeCompare(b);
      },
    );

    countries.forEach((country) => {
      const countryLabel = country || "(No country specified)";
      const entries = entriesByRegionAndCountry[region][country];

      entries.forEach((entry) => {
        // Format country from array if needed
        const displayCountry = Array.isArray(entry.country)
          ? entry.country.join("/")
          : entry.country || countryLabel;

        // Determine priority display
        const priorityText = entry.priority === "Secretary-General's Attention"
          ? "Secretary-General's attention"
          : entry.priority === "Situational Awareness"
          ? "Situational awareness"
          : "";

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: region,
                        size: 20,
                        font: "Roboto",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: displayCountry,
                        size: 20,
                        font: "Roboto",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: entry.headline,
                        size: 20,
                        font: "Roboto",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: entry.category || "",
                        size: 20,
                        font: "Roboto",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: priorityText,
                        size: 20,
                        font: "Roboto",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        );
      });
    });
  });

  // Create the table
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    rows: tableRows,
  });

  tocElements.push(table);

  tocElements.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun("")],
    }),
    createSeparator(),
  );

  return tocElements;
};

/**
 * Build document children (paragraphs) from entries
 */
const buildDocumentChildren = (
  entries: MorningMeetingEntry[],
  selectedDate: string,
): Paragraph[] => {
  // Sort by priority (SG Attention first)
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.priority === "Secretary-General's Attention" && b.priority !== "Secretary-General's Attention")
      return -1;
    if (a.priority !== "Secretary-General's Attention" && b.priority === "Secretary-General's Attention")
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
        // Store entries without countries under empty string key
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

  // Build document children
  const children: any[] = [
    // Title
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
    // Date
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
    // Separator
    createSeparator(),
    // Add Table of Contents
    ...buildTableOfContents(entriesByRegionAndCountry, sortedRegions),
  ];

  // Add entries grouped by region and country
  sortedRegions.forEach((region) => {
    // Add region header
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

    // Get countries for this region and sort them (put empty country last)
    const countries = Object.keys(entriesByRegionAndCountry[region]).sort(
      (a, b) => {
        if (a === "") return 1;
        if (b === "") return -1;
        return a.localeCompare(b);
      },
    );

    // Add entries grouped by country
    countries.forEach((country) => {
      // Add country header only if country is not empty
      if (country !== "") {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: country,
                bold: true,
                size: 24,
                font: "Roboto",
              }),
            ],
            spacing: { before: 300, after: 200 },
          }),
        );
      } else {
        // Add spacing before entries without country
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun("")],
          }),
        );
      }

      // Add all entries for this country
      entriesByRegionAndCountry[region][country].forEach(
        (entry: MorningMeetingEntry, index: number) => {
          // Headline
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

          // Priority and Category
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    entry.priority === "Secretary-General's Attention"
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

          // Content
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

          // Source Information (Name with optional hyperlink, Date)
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
                // Create hyperlink for source name if URL is available
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
                // Plain text if no URL
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
                  text: formatDateFull(entry.sourceDate),
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

          // PU Note
          if (entry.puNote) {
            children.push(...buildPuNoteParagraph(entry.puNote));
          }

          // Separator between entries (but not after the last entry in the country)
          const countryEntries = entriesByRegionAndCountry[region][country];
          if (index < countryEntries.length - 1) {
            children.push(createSeparator(40, { before: 200, after: 200 }));
          }
        },
      );

      // Separator after country section
      children.push(createSeparator());
    });
  });

  // Footer
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

  return children;
};

/**
 * Generate the complete document blob
 */
const generateDocumentBlob = async (
  entries: MorningMeetingEntry[],
  selectedDate: string,
  includeImages: boolean,
  createDocumentHeader: () => Promise<Table>,
): Promise<Blob> => {
  // Process images in entries
  const processedEntries = await processEntriesImages(entries, includeImages);

  // Build document content
  const children = buildDocumentChildren(processedEntries, selectedDate);

  // Create header
  const headerTable = await createDocumentHeader();

  // Create document
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

/**
 * Create a header section with classification text only (UN logo removed)
 */
export const createDocumentHeader = async (): Promise<Table> => {
  // Create a table-based header with classification text
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
        height: { value: 400, rule: "atLeast" },
        children: [
          // Full-width cell with classification text
          new TableCell({
            width: { size: 100, type: "pct" },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
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

// Export the document generation function for use in other components
export { generateDocumentBlob, formatExportFilename };

export function ExportDailyBriefingDialog({
  open,
  onOpenChange,
}: ExportDialogProps) {
  const { data: session } = useSession();
  const { info: showInfo, success: showSuccess, error: showError } = usePopup();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );
  const [approvedEntries, setApprovedEntries] = useState<MorningMeetingEntry[]>(
    [],
  );
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  // Unified function to get all entries for a date using 8AM cutoff (regardless of approval status)
  const getApprovedEntriesForDate = useCallback(
    async (dateStr: string): Promise<MorningMeetingEntry[]> => {
      const allEntries = await getSubmittedEntries();
      return allEntries.filter((entry: MorningMeetingEntry) => {
        return isWithinCutoffRange(entry.date, dateStr);
      });
    },
    [],
  );

  // Blur the date input when dialog opens to prevent auto-focus
  useEffect(() => {
    if (open && dateInputRef.current) {
      // Use setTimeout to ensure it happens after the dialog fully opens
      const timer = setTimeout(() => {
        dateInputRef.current?.blur();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const loadEntriesForDate = async () => {
      if (!session?.user) return;

      setIsLoadingEntries(true);
      try {
        const entriesForDate = await getApprovedEntriesForDate(selectedDate);
        setApprovedEntries(entriesForDate);
        // Initialize all entries as selected (checked)
        const allEntryIds = new Set(entriesForDate.map((e) => e.id).filter((id): id is string => Boolean(id)));
        setSelectedEntryIds(allEntryIds);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error loading entries:", errorMessage);
        showError("Failed to Load Entries", errorMessage);
        setApprovedEntries([]);
        setSelectedEntryIds(new Set());
      } finally {
        setIsLoadingEntries(false);
      }
    };

    if (open) {
      loadEntriesForDate();
    }
  }, [selectedDate, open, session?.user, showError, getApprovedEntriesForDate]);

  const handleExport = async () => {
    if (selectedEntryIds.size === 0) {
      showInfo(
        "No Entries Selected",
        "Please select at least one entry to export.",
      );
      return;
    }

    setIsExporting(true);
    try {
      const entriesForDate = await getApprovedEntriesForDate(selectedDate);
      const selectedEntries = entriesForDate.filter(
        (entry) => entry.id && selectedEntryIds.has(entry.id),
      );

      if (selectedEntries.length === 0) {
        showInfo(
          "No Entries Selected",
          "Please select at least one entry to export.",
        );
        setIsExporting(false);
        return;
      }

      // Generate document blob using shared function
      const blob = await generateDocumentBlob(
        selectedEntries,
        selectedDate,
        includeImages,
        createDocumentHeader,
      );

      // Save file with formatted filename
      saveAs(blob, formatExportFilename(selectedDate));

      showSuccess("Export Successful", "Daily briefing exported successfully!");
      handleOpenChange(false);
    } catch (error) {
      console.error("Error exporting briefing:", error);
      showError(
        "Export Failed",
        "Failed to export daily briefing. Please try again.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendViaEmail = async () => {
    if (!session?.user?.email) {
      showError("Not Authenticated", "You must be logged in to send emails.");
      return;
    }

    if (selectedEntryIds.size === 0) {
      showError(
        "No Entries Selected",
        "Please select at least one entry to send.",
      );
      return;
    }

    setIsSendingEmail(true);
    try {
      const entriesForDate = await getApprovedEntriesForDate(selectedDate);
      const selectedEntries = entriesForDate.filter(
        (entry) => entry.id && selectedEntryIds.has(entry.id),
      );

      if (selectedEntries.length === 0) {
        showError(
          "No Entries Selected",
          "Please select at least one entry to send.",
        );
        setIsSendingEmail(false);
        return;
      }

      // Generate document blob using shared function
      const blob = await generateDocumentBlob(
        selectedEntries,
        selectedDate,
        includeImages,
        createDocumentHeader,
      );

      // Convert blob to base64 for API
      const arrayBuffer = await blob.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      const docxBlob = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`;

      // Send via API with formatted filename
      const response = await fetch("/api/send-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docxBlob,
          fileName: formatExportFilename(selectedDate),
          briefingDate: selectedDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send email");
      }

      showSuccess(
        "Email Sent",
        `Briefing sent successfully to ${session.user.email}`,
      );
      handleOpenChange(false);
    } catch (error) {
      console.error("Error sending briefing via email:", error);
      showError(
        "Send Failed",
        error instanceof Error
          ? error.message
          : "Failed to send briefing via email.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-dvh w-screen !max-w-none flex-col rounded-none !p-0 sm:h-auto sm:!max-w-lg sm:rounded-lg sm:!p-6">
        <DialogHeader className="border-b border-slate-200 px-4 py-4 sm:border-0 sm:px-0 sm:py-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-un-blue" />
            Daily Briefing
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            Select entries to include, then view the briefing, export to Word, or send via email. 
            Entries are from the previous day at 8:00 AM until the selected day at 8:00 AM.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-1 flex-col space-y-4 overflow-y-auto px-4 py-4 sm:px-0">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select Date
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                autoFocus={false}
                className="h-10 w-full appearance-none rounded border border-slate-300 bg-white pr-3 pl-10 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-images"
              checked={includeImages}
              onCheckedChange={(checked) =>
                setIncludeImages(checked as boolean)
              }
            />
            <label
              htmlFor="include-images"
              className="cursor-pointer text-sm font-medium text-foreground"
            >
              Include images in export
            </label>
          </div>

          <div className="flex max-h-80 min-h-0 flex-1 flex-col space-y-2">
            <label className="text-sm font-medium text-foreground">
              Entries ({selectedEntryIds.size}/{approvedEntries.length})
            </label>
            <div className="flex-1 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
              {isLoadingEntries ? (
                <p className="text-xs text-slate-500">Loading entries...</p>
              ) : approvedEntries.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No entries for this date
                </p>
              ) : (
                <ul className="space-y-2">
                  {approvedEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Checkbox
                        id={`entry-${entry.id}`}
                        checked={selectedEntryIds.has(entry.id || "")}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedEntryIds);
                          if (checked) {
                            newSelected.add(entry.id || "");
                          } else {
                            newSelected.delete(entry.id || "");
                          }
                          setSelectedEntryIds(newSelected);
                        }}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`entry-${entry.id}`}
                        className="flex-1 cursor-pointer line-clamp-2 text-slate-700"
                      >
                        {entry.headline}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex w-full flex-shrink-0 flex-col gap-3 px-4 pb-4 sm:flex-row sm:px-0 sm:pb-0">
          <Link href={`/briefing?date=${selectedDate}`} className="flex-1">
            <Button
              className="flex-1 gap-2"
              onClick={() => handleOpenChange(false)}
            >
              <Eye className="h-4 w-4" />
              View Briefing
            </Button>
          </Link>
          <Button
            onClick={handleExport}
            disabled={isExporting || isSendingEmail}
            className="flex-1 gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Word"}
          </Button>
          <Button
            onClick={handleSendViaEmail}
            disabled={isSendingEmail || isExporting}
            className="flex-1 gap-2"
          >
            <Mail className="h-4 w-4" />
            {isSendingEmail ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
