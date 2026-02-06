"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MessageSquare } from "lucide-react";

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
  initialComment?: string;
  onSave: (comment: string) => Promise<void>;
}

export function CommentDialog({
  open,
  onOpenChange,
  entryId,
  initialComment = "",
  onSave,
}: CommentDialogProps) {
  const [comment, setComment] = useState(initialComment);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setComment(initialComment);
  }, [initialComment, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(comment);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving comment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
          title="Add/edit comment"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Comment</h4>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
