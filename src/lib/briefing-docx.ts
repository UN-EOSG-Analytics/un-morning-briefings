/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared DOCX generation logic for morning briefings.
 * Used by both the client-side ExportDailyBriefingDialog and the server-side cron endpoint.
 * All functions are pure — no "use client" directive, no browser-only APIs.
 */

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
  Header,
  ExternalHyperlink,
  WidthType,
  VerticalAlign,
} from "docx";
import { parseHtmlContent } from "@/lib/html-to-docx";
import {
  formatDateLong,
  formatDateFull,
  getCurrentDateTime,
} from "@/lib/format-date";
import type { MorningMeetingEntry } from "@/types/morning-meeting";

export const createSeparator = (
  _length: number = 63,
  spacing: { before?: number; after?: number } = { after: 200 },
): Paragraph =>
  new Paragraph({
    children: [new TextRun("")],
    spacing,
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "333333", space: 1 },
    },
  });

/**
 * Format filename: MM YYMMDD DayOfWeek DD MonthName
 * e.g., "MM 251212 Friday 12 December.docx" for 2025-12-12
 */
export const formatExportFilename = (dateStr: string): string => {
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
 * Build PU Note paragraph with italic formatting and rich text support
 */
const buildPuNoteParagraph = (puNote: string): Paragraph[] => {
  const labelParagraph = new Paragraph({
    children: [
      new TextRun({
        text: "PU Note:",
        bold: true,
        italics: true,
        font: "Roboto",
      }),
    ],
    spacing: { after: 40 },
  });

  const contentParagraphs = parseHtmlContent(puNote, { italics: true });

  return contentParagraphs.length > 0
    ? [labelParagraph, ...contentParagraphs]
    : [labelParagraph, createPlainPuNoteParagraph(puNote)];
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
  entriesByRegionAndCountry: Record<
    string,
    Record<string, MorningMeetingEntry[]>
  >,
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

  // Build per-region header + table
  sortedRegions.forEach((region) => {
    // Region heading paragraph
    tocElements.push(
      new Paragraph({
        spacing: { before: 480, after: 80 },
        keepNext: true,
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: "009edb",
            space: 4,
          },
        },
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

    // Get countries for this region
    const countries = Object.keys(entriesByRegionAndCountry[region]).sort(
      (a, b) => {
        if (a === "") return 1;
        if (b === "") return -1;
        return a.localeCompare(b);
      },
    );

    const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const subtleBorder = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: "D9D9D9",
    };
    const tableRows: TableRow[] = [];

    // Data rows (no header row — region name above already provides context)
    countries.forEach((country) => {
      const countryLabel = country || "(No country specified)";
      const entries = entriesByRegionAndCountry[region][country];

      entries.forEach((entry, entryIndex) => {
        const displayCountry = Array.isArray(entry.country)
          ? entry.country.join("/")
          : entry.country || countryLabel;
        // Only show the country name on the first row for this country group
        const showCountry = entryIndex === 0;

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                  top: noBorder,
                  bottom: subtleBorder,
                  left: noBorder,
                  right: noBorder,
                },
                margins: { top: 40, bottom: 40 },
                children: [
                  new Paragraph({
                    children: showCountry
                      ? [
                          new TextRun({
                            text: displayCountry,
                            bold: true,
                            size: 20,
                            font: "Roboto",
                            color: "009edb",
                          }),
                        ]
                      : [],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 67, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                  top: noBorder,
                  bottom: subtleBorder,
                  left: noBorder,
                  right: noBorder,
                },
                margins: { top: 40, bottom: 40 },
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
            ],
          }),
        );
      });
    });

    tocElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder,
          bottom: noBorder,
          left: noBorder,
          right: noBorder,
          insideHorizontal: noBorder,
          insideVertical: noBorder,
        },
        rows: tableRows,
      }),
    );
  });

  tocElements.push(
    new Paragraph({
      pageBreakBefore: true,
      children: [new TextRun("")],
    }),
  );

  return tocElements;
};

/**
 * Build document children (paragraphs) from entries
 */
export const buildDocumentChildren = (
  entries: MorningMeetingEntry[],
  selectedDate: string,
): Paragraph[] => {
  // Sort by priority (SG Attention first)
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.priority === "SG's attention" && b.priority !== "SG's attention")
      return -1;
    if (a.priority !== "SG's attention" && b.priority === "SG's attention")
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
        acc[entry.region][countryKey].push(entry);
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
        keepNext: true,
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
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: country,
                bold: true,
                size: 24,
                font: "Roboto",
                color: "009edb",
              }),
            ],
            spacing: { before: 300, after: 200 },
            keepNext: true,
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
                  text: `• ${entry.headline}`,
                  bold: true,
                  size: 22,
                  font: "Roboto",
                }),
              ],
              spacing: { after: 40 },
              keepNext: true,
            }),
          );

          // Source Information (right under headline)
          const sourceNameStr = Array.isArray(entry.sourceName)
            ? entry.sourceName.join(", ")
            : entry.sourceName;

          if (sourceNameStr || entry.sourceDate) {
            const sourceChildren: (TextRun | ExternalHyperlink)[] = [
              new TextRun({
                text: "Source: ",
                italics: true,
                font: "Roboto",
                size: 20,
              }),
            ];

            if (sourceNameStr) {
              if (entry.sourceUrl) {
                sourceChildren.push(
                  new ExternalHyperlink({
                    children: [
                      new TextRun({
                        text: sourceNameStr,
                        italics: true,
                        font: "Roboto",
                        size: 20,
                        style: "Hyperlink",
                      }),
                    ],
                    link: entry.sourceUrl,
                  }),
                );
              } else {
                sourceChildren.push(
                  new TextRun({
                    text: sourceNameStr,
                    italics: true,
                    font: "Roboto",
                    size: 20,
                  }),
                );
              }
            }

            if (sourceNameStr && entry.sourceDate) {
              sourceChildren.push(
                new TextRun({
                  text: " | ",
                  italics: true,
                  font: "Roboto",
                  size: 20,
                }),
              );
            }

            if (entry.sourceDate) {
              sourceChildren.push(
                new TextRun({
                  text: formatDateFull(entry.sourceDate),
                  italics: true,
                  font: "Roboto",
                  size: 20,
                }),
              );
            }

            children.push(
              new Paragraph({
                children: sourceChildren,
                spacing: { after: 80 },
              }),
            );
          }

          // Priority
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    entry.priority === "SG's attention"
                      ? "SG's attention"
                      : "Situational Awareness",
                  italics: true,
                  size: 20,
                  font: "Roboto",
                }),
              ],
              spacing: { after: 120 },
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
                    color: "7C7067",
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
 * Build a complete Document object from entries and date.
 * Shared between client (ExportDailyBriefingDialog) and server (cron endpoint).
 */
export async function buildBriefingDocument(
  entries: MorningMeetingEntry[],
  selectedDate: string,
): Promise<Document> {
  const children = buildDocumentChildren(entries, selectedDate);
  const headerTable = await createDocumentHeader();

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter (8.5" × 11") in twips
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1" all sides
          },
        },
        headers: {
          default: new Header({
            children: [headerTable],
          }),
        },
        children,
      },
    ],
  });
}

/**
 * Generate a DOCX buffer for server-side use (cron endpoint, API routes).
 * Entries must already have their images resolved (image-ref:// replaced with data URLs).
 */
export async function generateDocumentBuffer(
  entries: MorningMeetingEntry[],
  selectedDate: string,
): Promise<Buffer> {
  const doc = await buildBriefingDocument(entries, selectedDate);
  return Packer.toBuffer(doc);
}
