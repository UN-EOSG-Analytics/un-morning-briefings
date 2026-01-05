'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getAllEntries } from '@/lib/storage';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { FileText, Calendar, CheckCircle2 } from 'lucide-react';
import { parseHtmlContent } from '@/lib/html-to-docx';
import { usePopup } from '@/lib/popup-context';
import type { MorningMeetingEntry } from '@/types/morning-meeting';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createSeparator = (
  length: number = 63,
  spacing: { before?: number; after?: number } = { after: 200 }
): Paragraph =>
  new Paragraph({
    text: '─'.repeat(length),
    spacing,
  });

export function ExportDailyBriefingDialog({ open, onOpenChange }: ExportDialogProps) {
  const { info: showInfo, success: showSuccess, error: showError } = usePopup();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isExporting, setIsExporting] = useState(false);
  const [approvedEntries, setApprovedEntries] = useState<MorningMeetingEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  useEffect(() => {
    const loadEntriesForDate = async () => {
      setIsLoadingEntries(true);
      try {
        const allEntries = await getAllEntries();
        const entriesForDate = allEntries.filter((entry) => {
          const entryDate = new Date(entry.date).toISOString().split('T')[0];
          return entryDate === selectedDate && entry.approved;
        });
        setApprovedEntries(entriesForDate);
      } catch (error) {
        console.error('Error loading entries:', error);
        setApprovedEntries([]);
      } finally {
        setIsLoadingEntries(false);
      }
    };

    if (open) {
      loadEntriesForDate();
    }
  }, [selectedDate, open]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allEntries = await getAllEntries();
      const entriesForDate = allEntries.filter((entry) => {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        return entryDate === selectedDate && entry.approved;
      });

      if (entriesForDate.length === 0) {
        showInfo('No Approved Entries', 'No approved entries found for the selected date.');
        setIsExporting(false);
        return;
      }

      // Restore images in HTML for each entry by downloading from blob storage
      for (const entry of entriesForDate) {
        let html = entry.entry;
        
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

      // Build document children
      const children: any[] = [
        // Title
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: 'Daily Morning Meeting Briefing',
              bold: true,
              size: 32,
              font: 'Roboto',
            }),
          ],
        }),
        // Date
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              size: 24,
              font: 'Roboto',
            }),
          ],
        }),
        // Summary count
        new Paragraph({
          children: [
            new TextRun({
              text: `Total Entries: ${entriesForDate.length}`,
              bold: true,
              font: 'Roboto',
            }),
          ],
          spacing: { after: 400 },
        }),
        // Separator
        createSeparator(),
      ];

      // Add entries
      sortedEntries.forEach((entry, index) => {
        // Entry number and region/country
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. `,
                bold: true,
                size: 24,
                font: 'Roboto',
              }),
              new TextRun({
                text: `${entry.region} - ${entry.country}`,
                bold: true,
                size: 24,
                font: 'Roboto',
              }),
            ],
            spacing: { before: 300, after: 100 },
          })
        );

        // Priority badge
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: entry.priority === 'sg-attention'
                  ? 'SG Attention'
                  : 'Situational Awareness',
                bold: true,
                color: entry.priority === 'sg-attention' ? 'DC2626' : '2563EB',
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

        // Headline
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

        // Content - parse TipTap JSON
        if (entry.entry) {
          try {
            const contentElements = parseHtmlContent(entry.entry);
            children.push(...contentElements);
          } catch (error) {
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
                  color: '0000FF',
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

        // Separator between entries
        children.push(createSeparator());
      });

      // Footer
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: `Generated on ${new Date().toLocaleString('en-US')}`,
              italics: true,
              font: 'Roboto',
            }),
          ],
        })
      );

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {},
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
      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting briefing:', error);
      showError('Export Failed', 'Failed to export daily briefing. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-un-blue" />
            Export Daily Briefing
          </DialogTitle>
          <DialogDescription>
          The exported document will include all entries for the selected date, organized by priority with full content and formatting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 w-full rounded border border-slate-300 bg-white pl-10 pr-3 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Approved Entries ({approvedEntries.length})
            </label>
            <div className="max-h-48 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export to Word'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
