'use client';

import { useState } from 'react';
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
import { FileText, Calendar } from 'lucide-react';
import { parseHtmlContent } from '@/lib/html-to-docx';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDailyBriefingDialog({ open, onOpenChange }: ExportDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allEntries = getAllEntries();
      const entriesForDate = allEntries.filter(
        (entry) => entry.date === selectedDate
      );

      if (entriesForDate.length === 0) {
        alert('No entries found for the selected date.');
        setIsExporting(false);
        return;
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
          text: 'Daily Morning Meeting Briefing',
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
          text: new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
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
        new Paragraph({
          text: '─'.repeat(80),
          spacing: { after: 200 },
        }),
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
                  ? '🔴 SG Attention'
                  : '🔵 Situational Awareness',
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

        // Content - parse HTML properly
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
        children.push(
          new Paragraph({
            text: '─'.repeat(80),
            spacing: { before: 200, after: 200 },
          })
        );
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

      alert('Daily briefing exported successfully!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting briefing:', error);
      alert('Failed to export daily briefing. Please try again.');
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
            Select a date to export all entries as a formatted Word document
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
          <div className="rounded bg-slate-50 p-3 text-sm text-slate-600">
            <p>
              The exported document will include all entries for the selected date, organized by priority with full content and formatting.
            </p>
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
