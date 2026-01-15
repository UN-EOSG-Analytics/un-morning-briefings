'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getSubmittedEntries } from '@/lib/storage';
import { isWithinCutoffRange } from '@/lib/useEntriesFilter';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, Table, TableRow, TableCell, BorderStyle, ImageRun, Header } from 'docx';
import { saveAs } from 'file-saver';
import { FileText, Calendar, CheckCircle2, Mail, Download} from 'lucide-react';
import { parseHtmlContent } from '@/lib/html-to-docx';
import { usePopup } from '@/lib/popup-context';
import type { MorningMeetingEntry } from '@/types/morning-meeting';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Format a date string (YYYY-MM-DD) to long format without timezone conversion
 * Example: "2026-01-15" → "Wednesday, January 15, 2026"
 */
const formatDateLong = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Create date object without timezone issues (use UTC components)
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = dayNames[date.getUTCDay()];
  
  return `${dayOfWeek}, ${monthNames[month - 1]} ${day}, ${year}`;
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
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${month}/${day}/${year}, ${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const createSeparator = (
  length: number = 63,
  spacing: { before?: number; after?: number } = { after: 200 }
): Paragraph =>
  new Paragraph({
    text: '─'.repeat(length),
    spacing,
  });

export function ExportDailyBriefingDialog({ open, onOpenChange }: ExportDialogProps) {
  const { data: session } = useSession();
  const { info: showInfo, success: showSuccess, error: showError } = usePopup();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen);
  }, [onOpenChange]);
  const [approvedEntries, setApprovedEntries] = useState<MorningMeetingEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);

  // Unified function to get approved entries for a date using 8AM cutoff
  const getApprovedEntriesForDate = useCallback(async (dateStr: string): Promise<MorningMeetingEntry[]> => {
    const allEntries = await getSubmittedEntries();
    return allEntries.filter((entry: MorningMeetingEntry) => {
      return isWithinCutoffRange(entry.date, dateStr) && entry.approvalStatus === 'approved';
    });
  }, []);

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
      // Don't load entries if session is not ready
      if (!session?.user) {
        console.log('ExportDailyBriefingDialog: Session not ready, skipping load');
        return;
      }

      setIsLoadingEntries(true);
      try {
        const entriesForDate = await getApprovedEntriesForDate(selectedDate);
        setApprovedEntries(entriesForDate);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error loading entries:', errorMessage);
        showError('Failed to Load Entries', errorMessage);
        setApprovedEntries([]);
      } finally {
        setIsLoadingEntries(false);
      }
    };

    if (open) {
      loadEntriesForDate();
    }
  }, [selectedDate, open, session?.user, showError, getApprovedEntriesForDate]);

  /**
   * Create a header section with UN logo and classification text
   */
  const createDocumentHeader = async (): Promise<Table> => {
    // Load UN logo from public folder
    let logoParagraphChildren: (ImageRun | TextRun)[] = [];
    
    try {
      const response = await fetch('/images/UN_Logo_Black.png');
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
          type: 'png',
        }),
      ];
    } catch (error) {
      console.error('Failed to load UN logo:', error);
      // Fallback to text if image fails to load
      logoParagraphChildren = [
        new TextRun({
          text: '[UN Logo]',
          size: 16,
          color: '666666',
          font: 'Roboto',
        }),
      ];
    }

    // Create a table-based header with logo on left and classification on right
    const headerTable = new Table({
      width: { size: 100, type: 'pct' },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          height: { value: 720, rule: 'atLeast' },
          children: [
            // Left cell with logo
            new TableCell({
              width: { size: 50, type: 'pct' },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
              margins: { top: 100, bottom: 0, left: 0, right: 100 },
              verticalAlign: 'top',
              children: [
                new Paragraph({
                  children: logoParagraphChildren,
                }),
              ],
            }),
            // Right cell with classification
            new TableCell({
              width: { size: 50, type: 'pct' },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
              margins: { top: 0, bottom: 0, left: 100, right: 0 },
              verticalAlign: 'center',
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: 'INTERNAL | NOT FOR FURTHER DISTRIBUTION',
                      bold: false,
                      size: 18,
                      color: '000000',
                      font: 'Roboto',
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const entriesForDate = await getApprovedEntriesForDate(selectedDate);

      if (entriesForDate.length === 0) {
        showInfo('No Approved Entries', 'No approved entries found for the selected date.');
        setIsExporting(false);
        return;
      }

      // Get header
      await createDocumentHeader();

      // Restore images in HTML for each entry by downloading from blob storage
      for (const entry of entriesForDate) {
        let html = entry.entry;
        
        // Skip image processing if includeImages is false
        if (!includeImages) {
          // Remove all image tags from HTML
          html = html.replace(/<img[^>]*>/gi, '');
          entry.entry = html;
          continue;
        }
        
        console.log('Processing entry:', entry.id, 'with', entry.images?.length || 0, 'tracked images');
        
        // Only process if there are tracked images (uploaded via the editor)
        // External URLs will remain as-is in the HTML
        if (entry.images && entry.images.length > 0) {
          console.log('HTML before image processing:', html.substring(0, 500));
          
          for (const img of entry.images) {
            try {
              // Skip if position is null (shouldn't happen with properly uploaded images)
              if (img.position === null || img.position === undefined) {
                console.warn(`Image ${img.id} has null position, skipping`);
                continue;
              }
              
              const ref = `image-ref://img-${img.position}`;
              
              if (!html.includes(ref)) {
                console.warn(`Reference ${ref} not found in HTML`);
                continue;
              }
              
              // Download image from blob storage via API endpoint
              const response = await fetch(`/api/images/${img.id}`);
              if (!response.ok) {
                console.error(`Failed to fetch image ${img.id} from API, status:`, response.status);
                html = html.replace(new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, 'gi'), '');
                continue;
              }
              
              const arrayBuffer = await response.arrayBuffer();
              const base64Data = btoa(
                new Uint8Array(arrayBuffer).reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  ''
                )
              );
              const dataUrl = `data:${img.mimeType};base64,${base64Data}`;
              
              console.log('Created data URL for image', img.position, 'length:', dataUrl.length, 'mimeType:', img.mimeType);
              
              // Replace the src attribute in img tags - handles both single and double quotes
              const searchPattern = new RegExp(`src=["']${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi');
              const beforeLength = html.length;
              html = html.replace(searchPattern, `src="${dataUrl}"`);
              const afterLength = html.length;
              
              console.log('Replacement made:', beforeLength !== afterLength);
            } catch (error) {
              console.error(`Error downloading image ${img.id} from blob storage:`, error);
              const ref = `image-ref://img-${img.position}`;
              html = html.replace(new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, 'gi'), '');
            }
          }
          
          console.log('Final HTML for entry', entry.id, 'contains data:image URLs?', html.includes('data:image'));
        } else {
          console.log('Entry has no tracked images, checking for external URLs');
        }
        
        // Download and convert external image URLs to data URLs
        const externalImgRegex = /<img[^>]*src=["']?(https?:\/\/[^"'\s>]+)["']?([^>]*)>/gi;
        let match;
        const replacements: Array<{from: string, to: string}> = [];
        
        while ((match = externalImgRegex.exec(html)) !== null) {
          const fullTag = match[0];
          const imageUrl = match[1];
          const restOfTag = match[2];
          
          console.log('Found external image URL:', imageUrl);
          
          try {
            // Download the external image
            const response = await fetch(imageUrl, { mode: 'cors' });
            if (!response.ok) {
              console.warn('Failed to download external image:', response.status);
              continue;
            }
            
            const blob = await response.blob();
            
            // Convert to base64 data URL
            const arrayBuffer = await blob.arrayBuffer();
            const base64Data = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );
            
            // Determine mime type from blob or response
            const mimeType = blob.type || response.headers.get('content-type') || 'image/png';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            
            console.log('Converted external image to data URL, length:', dataUrl.length);
            
            // Prepare replacement
            const newTag = `<img src="${dataUrl}"${restOfTag}>`;
            replacements.push({ from: fullTag, to: newTag });
          } catch (error) {
            console.error('Error downloading external image:', imageUrl, error);
            // Leave the URL as-is if download fails
          }
        }
        
        // Apply all replacements
        for (const { from, to } of replacements) {
          html = html.replace(from, to);
        }
        
        console.log('Final HTML contains', replacements.length, 'converted external images');
        entry.entry = html;
      }

      // Sort by priority (SG Attention first)
      const sortedEntries = [...entriesForDate].sort((a, b) => {
        if (a.priority === 'sg-attention' && b.priority !== 'sg-attention') return -1;
        if (a.priority !== 'sg-attention' && b.priority === 'sg-attention') return 1;
        return 0;
      });

      // Group entries by region and country
      const entriesByRegionAndCountry = sortedEntries.reduce((acc, entry) => {
        if (!acc[entry.region]) {
          acc[entry.region] = {};
        }
        if (!acc[entry.region][entry.country]) {
          acc[entry.region][entry.country] = [];
        }
        acc[entry.region][entry.country].push(entry);
        return acc;
      }, {} as Record<string, Record<string, typeof sortedEntries>>);

      const sortedRegions = Object.keys(entriesByRegionAndCountry).sort();

      // Build document children
      const children: any[] = [
        // Title
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: 'Daily Morning Meeting Briefing',
              bold: true,
              size: 32,
              font: 'Roboto',
              color: '009edb',
            }),
          ],
        }),
        // Date
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: formatDateLong(selectedDate),
              size: 24,
              font: 'Roboto',
              color: '009edb',
            }),
          ],
        }),
        // Summary count

        // Separator
        createSeparator(),
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
                font: 'Roboto',
                color: '009edb',
              }),
            ],
          })
        );

        // Get countries for this region and sort them
        const countries = Object.keys(entriesByRegionAndCountry[region]).sort();

        // Add entries grouped by country
        countries.forEach((country) => {
          // Country header (shown once per country)
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: country,
                  bold: true,
                  size: 24,
                  font: 'Roboto',
                }),
              ],
              spacing: { before: 300, after: 200 },
            })
          );

          // Add all entries for this country
          entriesByRegionAndCountry[region][country].forEach((entry: MorningMeetingEntry, index: number) => {
            // Headline with priority and category
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: entry.headline,
                    bold: true,
                    size: 22,
                    font: 'Roboto',
                  }),
                ],
                spacing: { after: 100 },
              })
            );

            // Priority and Category on next line
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: entry.priority === 'sg-attention'
                      ? 'SG Attention'
                      : 'Situational Awareness',
                    italics: true,
                    size: 20,
                    font: 'Roboto',
                  }),
                  new TextRun({
                    text: ` | ${entry.category}`,
                    italics: true,
                    size: 20,
                    font: 'Roboto',
                  })
                ],
                spacing: { after: 150 },
              })
            );

            // Content - parse TipTap JSON
            if (entry.entry) {
              try {
                const contentElements = parseHtmlContent(entry.entry);
                children.push(...contentElements);
              } catch {
                // Fallback to plain text if parsing fails
                children.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: entry.entry,
                        font: 'Roboto',
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
              }
            }

            // Source URL if available
            if (entry.sourceUrl) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Source: ',
                      italics: true,
                      font: 'Roboto',
                    }),
                    new TextRun({
                      text: entry.sourceUrl,
                      italics: true,
                      font: 'Roboto',
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
            }

            // PU Note if available
            if (entry.puNote) {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'PU Note: ',
                      bold: true,
                      font: 'Roboto',
                    }),
                    new TextRun({
                      text: entry.puNote,
                      font: 'Roboto',
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
            }

            // Separator between entries (but not after the last entry in the country)
            const countryEntries = entriesByRegionAndCountry[region][country];
            if (index < countryEntries.length - 1) {
              children.push(createSeparator(40, { before: 200, after: 200 }));
            }
          });

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
              font: 'Roboto',
            }),
          ],
        })
      );

      // Create document with header
      const headerTable = await createDocumentHeader();
      
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {},
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

      // Generate and download
      const blob = await Packer.toBlob(doc);
      saveAs(
        blob,
        `Morning-Briefing-${selectedDate}.docx`
      );

      showSuccess('Export Successful', 'Daily briefing exported successfully!');
      handleOpenChange(false);
    } catch (error) {
      console.error('Error exporting briefing:', error);
      showError('Export Failed', 'Failed to export daily briefing. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendViaEmail = async () => {
    if (!session?.user?.email) {
      showError('Not Authenticated', 'You must be logged in to send emails.');
      return;
    }

    if (approvedEntries.length === 0) {
      showError('No Entries', 'No approved entries found for the selected date.');
      return;
    }

    setIsSendingEmail(true);
    try {
      // First, generate the document blob (reusing the same logic as export)
      // Process entries for images
      const entriesForDate = [...approvedEntries];
      
      for (const entry of entriesForDate) {
        let html = entry.entry;
        
        if (!includeImages) {
          html = html.replace(/<img[^>]*>/gi, '');
          entry.entry = html;
          continue;
        }
        
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
                html = html.replace(new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, 'gi'), '');
                continue;
              }
              
              const arrayBuffer = await response.arrayBuffer();
              const base64Data = btoa(
                new Uint8Array(arrayBuffer).reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  ''
                )
              );
              const dataUrl = `data:${img.mimeType};base64,${base64Data}`;
              
              const searchPattern = new RegExp(`src=["']${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi');
              html = html.replace(searchPattern, `src="${dataUrl}"`);
            } catch (error) {
              console.error(`Error downloading image ${img.id}:`, error);
              const ref = `image-ref://img-${img.position}`;
              html = html.replace(new RegExp(`<img[^>]*src=["']${ref}["'][^>]*>`, 'gi'), '');
            }
          }
        }
        
        const externalImgRegex = /<img[^>]*src=["']?(https?:\/\/[^"'\s>]+)["']?([^>]*)>/gi;
        let match;
        const replacements: Array<{from: string, to: string}> = [];
        
        while ((match = externalImgRegex.exec(html)) !== null) {
          const fullTag = match[0];
          const imageUrl = match[1];
          const restOfTag = match[2];
          
          try {
            const response = await fetch(imageUrl, { mode: 'cors' });
            if (!response.ok) {
              continue;
            }
            
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64Data = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );
            
            const mimeType = blob.type || response.headers.get('content-type') || 'image/png';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            
            const newTag = `<img src="${dataUrl}"${restOfTag}>`;
            replacements.push({ from: fullTag, to: newTag });
          } catch (error) {
            console.error('Error downloading external image:', imageUrl, error);
          }
        }
        
        for (const { from, to } of replacements) {
          html = html.replace(from, to);
        }
        
        entry.entry = html;
      }

      // Sort and organize entries
      const sortedEntries = [...entriesForDate].sort((a, b) => {
        if (a.priority === 'sg-attention' && b.priority !== 'sg-attention') return -1;
        if (a.priority !== 'sg-attention' && b.priority === 'sg-attention') return 1;
        return 0;
      });

      const entriesByRegion = sortedEntries.reduce((acc, entry) => {
        if (!acc[entry.region]) {
          acc[entry.region] = [];
        }
        acc[entry.region].push(entry);
        return acc;
      }, {} as Record<string, typeof sortedEntries>);

      const sortedRegions = Object.keys(entriesByRegion).sort();

      // Build document
      const children: any[] = [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: 'Daily Morning Meeting Briefing',
              bold: true,
              size: 32,
              font: 'Roboto',
              color: '009edb',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: formatDateLong(selectedDate),
              size: 24,
              font: 'Roboto',
              color: '009edb',
            }),
          ],
        }),
        createSeparator(),
      ];

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
                font: 'Roboto',
                color: '009edb',
              }),
            ],
          })
        );

        entriesByRegion[region].forEach((entry: MorningMeetingEntry) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${entry.country}`,
                  bold: true,
                  size: 24,
                  font: 'Roboto',
                }),
              ],
              spacing: { before: 300, after: 100 },
            })
          );
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: entry.priority === 'sg-attention'
                    ? 'SG Attention'
                    : 'Situational Awareness',
                  italics: true,
                  font: 'Roboto',
                }),
                new TextRun({
                  text: ` | Category: ${entry.category}`,
                  italics: true,
                  font: 'Roboto',
                })
              ],
              spacing: { after: 100 },
            })
          );

          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: entry.headline,
                  bold: true,
                  size: 22,
                  font: 'Roboto',
                }),
              ],
              spacing: { after: 150 },
            })
          );

          if (entry.entry) {
            try {
              const contentElements = parseHtmlContent(entry.entry);
              children.push(...contentElements);
            } catch {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.entry,
                      font: 'Roboto',
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
            }
          }

          if (entry.sourceUrl) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Source: ',
                    italics: true,
                    font: 'Roboto',
                  }),
                  new TextRun({
                    text: entry.sourceUrl,
                    italics: true,
                    font: 'Roboto',
                  }),
                ],
                spacing: { after: 100 },
              })
            );
          }

          if (entry.puNote) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'PU Note: ',
                    bold: true,
                    font: 'Roboto',
                  }),
                  new TextRun({
                    text: entry.puNote,
                    font: 'Roboto',
                  }),
                ],
                spacing: { after: 100 },
              })
            );
          }

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
              font: 'Roboto',
            }),
          ],
        })
      );

      // Get header
      const headerTable = await createDocumentHeader();

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {},
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

      // Generate blob
      const blob = await Packer.toBlob(doc);
      
      // Convert blob to base64
      const arrayBuffer = await blob.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      const docxBlob = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`;

      // Send via API
      const response = await fetch('/api/send-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docxBlob,
          fileName: `Morning-Briefing-${selectedDate}.docx`,
          briefingDate: selectedDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send email');
      }

      showSuccess('Email Sent', `Briefing sent successfully to ${session.user.email}`);
      handleOpenChange(false);
    } catch (error) {
      console.error('Error sending briefing via email:', error);
      showError('Send Failed', error instanceof Error ? error.message : 'Failed to send briefing via email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-none w-screen h-dvh sm:!max-w-md sm:h-auto !p-0 sm:!p-6 flex flex-col rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0 text-left sm:text-left">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-un-blue" />
            Export Daily Briefing
          </DialogTitle>
          <DialogDescription className="text-left">
          The exported document will include all entries from the previous day at 8:00 AM until the selected day at 8:00 AM, organized by priority with full content and formatting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 px-4 sm:px-0 flex-1 overflow-y-auto flex flex-col">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                autoFocus={false}
                className="h-10 w-full rounded border border-slate-300 bg-white pl-10 pr-3 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20 appearance-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-images"
              checked={includeImages}
              onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
            />
            <label
              htmlFor="include-images"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Include images in export
            </label>
          </div>

          <div className="space-y-2 flex-1 flex flex-col min-h-0 max-h-80">
            <label className="text-sm font-medium text-foreground">
              Approved Entries ({approvedEntries.length})
            </label>
            <div className="flex-1 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
              {isLoadingEntries ? (
                <p className="text-xs text-slate-500">Loading entries...</p>
              ) : approvedEntries.length === 0 ? (
                <p className="text-xs text-slate-500">No approved entries for this date</p>
              ) : (
                <ul className="space-y-2">
                  {approvedEntries.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 mt-0.5" />
                      <span className="text-slate-700 line-clamp-2">{entry.headline}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full px-4 pb-4 sm:px-0 sm:pb-0 flex-shrink-0">
          <Button 
            onClick={handleOpenChange.bind(null, false)}
            variant="outline" 
            className="w-full sm:w-auto order-3 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || isSendingEmail}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export to Word'}
          </Button>
          <Button 
            onClick={handleSendViaEmail} 
            disabled={isSendingEmail || isExporting}
            className="w-full sm:w-auto order-2 sm:order-3"
          >
            <Mail className="h-4 w-4" />
            {isSendingEmail ? 'Sending...' : 'Send via Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
