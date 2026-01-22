"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, FileText } from "lucide-react";

interface BriefingModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BriefingModeDialog({
  open,
  onOpenChange,
}: BriefingModeDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Blur the date input when dialog opens to prevent auto-focus
  useEffect(() => {
    if (open && dateInputRef.current) {
      const timer = setTimeout(() => {
        dateInputRef.current?.blur();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleViewBriefing = () => {
    // Open briefing view in new tab
    window.open(`/briefing?date=${selectedDate}`, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            View Daily Briefing
          </DialogTitle>
          <DialogDescription>
            Select a date to view the briefing document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="briefing-date" className="text-sm font-medium">
              <Calendar className="mr-1 inline h-4 w-4" />
              Select Date
            </label>
            <input
              ref={dateInputRef}
              id="briefing-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleViewBriefing}>View Briefing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
