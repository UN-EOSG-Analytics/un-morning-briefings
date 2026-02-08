"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectField } from "@/components/SelectField";
import { MultiSelectField } from "@/components/MultiSelectField";
import { RichTextEditor } from "@/components/RichTextEditor";
import { TextField } from "@/components/TextField";
import { AutocompleteField } from "@/components/AutocompleteField";
import {
  MorningMeetingEntry,
  FormFieldError,
  CATEGORIES,
  PRIORITIES,
  REGIONS,
} from "@/types/morning-meeting";
import labelsData from "@/lib/labels.json";
import {
  FileText,
  AlertCircle,
  Check,
  X,
  RotateCcw,
  Send,
  Save,
  Info,
  Calendar,
  Zap,
  Type,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { usePopup } from "@/lib/popup-context";
import { useUnsavedChanges } from "@/lib/unsaved-changes-context";

// Get countries list from labels.json with proper typing, sorted alphabetically
const COUNTRIES: string[] = (
  (labelsData as Record<string, any>).countries || []
).sort();

interface MorningMeetingFormProps {
  onSubmit?: (data: MorningMeetingEntry) => Promise<void>;
  onSaveDraft?: (data: MorningMeetingEntry) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<MorningMeetingEntry>;
  isEditing?: boolean;
}

export function MorningMeetingForm({
  onSubmit,
  onSaveDraft,
  onCancel,
  initialData,
  isEditing = false,
}: MorningMeetingFormProps) {
  const { confirm: showConfirm } = usePopup();

  // Clean initial entry content by removing any image-ref:// references
  const cleanEntry = (entry: string) => {
    if (!entry) return "";
    // Remove any image-ref:// img tags that weren't converted properly
    return entry.replace(
      /<img[^>]*src=["']image-ref:\/\/[^"']*["'][^>]*>/gi,
      "",
    );
  };

  // Extract plain text from HTML content
  const extractPlainText = (html: string) => {
    if (!html) return "";

    // Check if we're in browser environment
    if (typeof document === "undefined") return html;

    // If it's already plain text (no HTML tags), return as-is
    if (!html.includes("<")) return html;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Replace block elements with newlines
    tempDiv
      .querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li")
      .forEach((element) => {
        element.appendChild(document.createTextNode("\n"));
      });

    // Remove script and style elements
    tempDiv.querySelectorAll("script, style").forEach((element) => {
      element.remove();
    });

    // Get text content and clean up
    let text = tempDiv.textContent || "";

    // Replace multiple newlines with double newline (for paragraph breaks)
    text = text.replace(/\n\n+/g, "\n\n");

    // Trim trailing whitespace but preserve leading for structure
    return text.trim();
  };

  // Format date to YYYY-MM-DDTHH:MM format - extract literal string without any parsing
  const formatDateForInput = (dateValue: any): string => {
    if (!dateValue) {
      // Return current time as-is
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hour = String(now.getHours()).padStart(2, "0");
      const minute = String(now.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }

    if (typeof dateValue === "string") {
      // Extract YYYY-MM-DDTHH:MM from the string exactly as stored
      // This handles formats like:
      // - "2026-01-15T13:30" (already correct)
      // - "2026-01-15T13:30:00" (trim seconds)
      // - "2026-01-15T13:30:00.000Z" (remove milliseconds and Z)
      const match = dateValue.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
      return match ? match[1] : "";
    }

    return "";
  };

  // Helper function to parse country field which might be JSON string or array
  const parseCountryField = (country: any): string[] => {
    if (!country) return [];
    if (Array.isArray(country)) return country;
    if (typeof country === "string" && country.startsWith("[")) {
      try {
        const parsed = JSON.parse(country);
        return Array.isArray(parsed) ? parsed : [country];
      } catch {
        return [country];
      }
    }
    return [country];
  };

  // Format source date to YYYY-MM-DD for date input field
  const formatSourceDateForInput = (dateValue: any): string => {
    if (!dateValue) return "";

    if (typeof dateValue === "string") {
      // Extract YYYY-MM-DD from the string in any format
      // This handles formats like:
      // - "2026-01-15" (already correct)
      // - "2026-01-15T13:30" (remove time)
      // - "2026-01-15T13:30:00" (remove time)
      // - "2026-01-15T13:30:00.000Z" (remove time and Z)
      const match = dateValue.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : "";
    }

    return "";
  };

  const [formData, setFormData] = useState<MorningMeetingEntry>({
    category: initialData?.category || "",
    priority: initialData?.priority || "",
    region: initialData?.region || "",
    country: parseCountryField(initialData?.country),
    headline: initialData?.headline || "",
    date: formatDateForInput(initialData?.date),
    entry: cleanEntry(initialData?.entry || ""),
    sourceName: initialData?.sourceName || "",
    sourceDate: formatSourceDateForInput(initialData?.sourceDate),
    sourceUrl: initialData?.sourceUrl || "",
    puNote: initialData?.puNote || "",
    author: initialData?.author || "Current User",
    previousEntryId: initialData?.previousEntryId || null,
  });

  const [errors, setErrors] = useState<FormFieldError>({});
  const [showPuNote, setShowPuNote] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Use full countries list from labels.json - no filtering by region
  const [availableCountries] = useState<string[]>(COUNTRIES);

  const [useRichText, setUseRichText] = useState<boolean | null>(null);
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
  const [autoFillContent, setAutoFillContent] = useState("");
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const { data: session } = useSession();
  const { warning: showWarning, success: showSuccess } = usePopup();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // Track frequently used regions and countries
  const [frequentRegion, setFrequentRegion] = useState<string | null>(null);
  const [frequentCountries, setFrequentCountries] = useState<string[]>([]);
  const [existingCustomCountries, setExistingCustomCountries] = useState<string[]>([]);

  // Source name suggestions for autocomplete
  const [sourceNames, setSourceNames] = useState<string[]>([]);

  // User's entries for "Previous Entry" selector
  const [userEntries, setUserEntries] = useState<{ id: string; headline: string; date: string; country: string | string[]; region: string }[]>([]);

  // Compute region options with frequent region at top with star
  const regionOptions = useMemo(() => {
    const options = REGIONS.map((region) => ({
      value: region,
      label: region,
      showStar: region === frequentRegion,
    }));

    // Move frequent region to top if it exists
    if (frequentRegion) {
      const frequentIndex = options.findIndex((opt) => opt.value === frequentRegion);
      if (frequentIndex > 0) {
        const [frequentOpt] = options.splice(frequentIndex, 1);
        options.unshift(frequentOpt);
      }
    }

    return options;
  }, [frequentRegion]);

  // Compute country options with top 3 frequent countries at top with stars
  const countryOptions = useMemo(() => {
    const options = availableCountries.map((country) => ({
      value: country,
      label: country,
      showStar: frequentCountries.includes(country),
    }));

    // Move frequent countries to top if they exist
    if (frequentCountries.length > 0) {
      const frequentOpts: typeof options = [];
      const otherOpts: typeof options = [];

      options.forEach((opt) => {
        if (frequentCountries.includes(opt.value)) {
          frequentOpts.push(opt);
        } else {
          otherOpts.push(opt);
        }
      });

      // Sort frequent countries by their frequency order
      frequentOpts.sort((a, b) => {
        return frequentCountries.indexOf(a.value) - frequentCountries.indexOf(b.value);
      });

      return [...frequentOpts, ...otherOpts];
    }

    return options;
  }, [availableCountries, frequentCountries]);

  // Build previous entry options with matching tags highlighted
  const previousEntryOptions = useMemo(() => {
    const options = userEntries.map((e) => {
      const dateStr = typeof e.date === 'string' ? e.date : new Date(e.date).toISOString();
      return {
        value: e.id,
        label: `${e.headline} (${dateStr.split("T")[0]})`,
        showStar: false,
        country: e.country,
        region: e.region,
      };
    });

    // Separate entries that match current tags
    const matchingEntries: typeof options = [];
    const otherEntries: typeof options = [];

    options.forEach((opt) => {
      const countryMatch = Array.isArray(formData.country)
        ? formData.country.some((c) => c === opt.country || (Array.isArray(opt.country) && opt.country.includes(c)))
        : formData.country === opt.country || (Array.isArray(opt.country) && opt.country.includes(formData.country as string));
      const regionMatch = formData.region === opt.region;

      if ((countryMatch || regionMatch) && formData.country && formData.region) {
        opt.showStar = true;
        matchingEntries.push(opt);
      } else {
        otherEntries.push(opt);
      }
    });

    return [{ value: "none", label: labelsData.form.labels.none }, ...matchingEntries, ...otherEntries];
  }, [userEntries, formData.country, formData.region]);

  // Track if form has been modified
  const [initialFormData] = useState(formData);

  // Autofill form with current user's information
  useEffect(() => {
    if (session?.user && !initialData?.author) {
      const fullName =
        `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim();
      setFormData((prev) => ({
        ...prev,
        author: fullName || session.user.email || "Current User",
      }));
    }
  }, [session, initialData?.author]);

  // Set default editor mode based on screen size
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (!hasUserToggled) {
        // Only auto-switch if user hasn't manually toggled
        setUseRichText(e.matches);
      }
    };

    // Set initial value
    if (!hasUserToggled) {
      setUseRichText(mediaQuery.matches);
    }

    // Listen for screen size changes
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, [hasUserToggled]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setHasUnsavedChanges(hasChanges);
  }, [formData, initialFormData, setHasUnsavedChanges]);

  // Add beforeunload handler to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges =
        JSON.stringify(formData) !== JSON.stringify(initialFormData);
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, initialFormData]);

  // Fetch all existing custom countries from the database
  useEffect(() => {
    const fetchExistingCustomCountries = async () => {
      try {
        const response = await fetch("/api/countries");
        if (response.ok) {
          const data = await response.json();
          setExistingCustomCountries(data.countries || []);
        }
      } catch (error) {
        console.error("Failed to fetch existing custom countries:", error);
      }
    };

    fetchExistingCustomCountries();
  }, []);

  // Fetch user's recent entries to determine frequently used regions/countries
  useEffect(() => {
    const fetchFrequentSelections = async () => {
      try {
        // Get date from 2 weeks ago
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        const response = await fetch(`/api/entries`);
        if (!response.ok) return;
        
        const data = await response.json();
        // Handle both formats: { entries: [...] } or direct array
        const entries = Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : []);
        
        if (!Array.isArray(entries) || entries.length === 0) return;
        
        // Filter entries from last 2 weeks by current user (compare by email for reliability)
        const userEmail = session?.user?.email;
        const recentEntries = entries.filter((entry: any) => {
          const entryDate = new Date(entry.date);
          return entryDate >= twoWeeksAgo && entry.authorEmail === userEmail;
        });

        if (recentEntries.length === 0) return;

        // Count region usage
        const regionCounts: Record<string, number> = {};
        recentEntries.forEach((entry: any) => {
          if (entry.region) {
            regionCounts[entry.region] = (regionCounts[entry.region] || 0) + 1;
          }
        });

        // Get most used region - only set if there's actual data
        const sortedRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);
        if (sortedRegions.length > 0 && Object.keys(regionCounts).length > 0) {
          setFrequentRegion(sortedRegions[0][0]);
        } else {
          setFrequentRegion(null);
        }

        // Count country usage
        const countryCounts: Record<string, number> = {};
        recentEntries.forEach((entry: any) => {
          const countries = parseCountryField(entry.country);
          countries.forEach((country: string) => {
            if (country) {
              countryCounts[country] = (countryCounts[country] || 0) + 1;
            }
          });
        });

        // Get top 3 most used countries - only set if there's actual data
        if (Object.keys(countryCounts).length > 0) {
          const sortedCountries = Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([country]) => country);
          setFrequentCountries(sortedCountries);
        } else {
          setFrequentCountries([]);
        }
      } catch (error) {
        console.error("Failed to fetch frequent selections:", error);
      }
    };

    if (session?.user?.email) {
      fetchFrequentSelections();
    }
  }, [session?.user?.email]);

  // Fetch source names used by this user
  useEffect(() => {
    const fetchSourceNames = async () => {
      try {
        const response = await fetch("/api/source-names");
        if (!response.ok) return;
        const data = await response.json();
        setSourceNames(data.sourceNames || []);
      } catch (error) {
        console.error("Failed to fetch source names:", error);
      }
    };

    if (session?.user) {
      fetchSourceNames();
    }
  }, [session]);

  // Fetch user's entries for Previous Entry selector
  useEffect(() => {
    const fetchUserEntries = async () => {
      try {
        const email = session?.user?.email;
        if (!email) return;
        const response = await fetch(`/api/entries?author=${encodeURIComponent(email)}&noConvert=true`);
        if (!response.ok) return;
        const data = await response.json();
        const entries = Array.isArray(data) ? data : [];
        // Only include submitted entries with an id and headline, exclude current entry if editing
        const editId = new URLSearchParams(window.location.search).get("edit");
        setUserEntries(
          entries
            .filter((e: any) => e.id && e.headline && e.id !== editId)
            .map((e: any) => ({ id: e.id, headline: e.headline, date: e.date, country: e.country, region: e.region }))
        );
      } catch (error) {
        console.error("Failed to fetch user entries:", error);
      }
    };

    if (session?.user?.email) {
      fetchUserEntries();
    }
  }, [session?.user?.email]);

  // No coordination needed - region and country are independent

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name, value } = e.target;

      // Handle date and time separately, then combine
      if (name === "dateOnly" || name === "timeOnly") {
        setFormData((prev) => {
          const dateOnly =
            name === "dateOnly" ? value : prev.date.split("T")[0];
          const timeOnly =
            name === "timeOnly" ? value : prev.date.split("T")[1] || "00:00";
          return { ...prev, date: `${dateOnly}T${timeOnly}` };
        });
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }

      // Clear error for date field when either dateOnly or timeOnly changes
      const errorField =
        name === "dateOnly" || name === "timeOnly" ? "date" : name;
      if (errors[errorField]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[errorField];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const handleSelectChange = useCallback(
    (name: string, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear error for this field
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const handleCountryChange = useCallback(
    (value: string[]) => {
      setFormData((prev) => ({ ...prev, country: value }));

      if (errors.country) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.country;
          return newErrors;
        });
      }
    },
    [errors],
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormFieldError = {};

    if (!formData.region) {
      newErrors.region = labelsData.form.validation.regionRequired;
    }

    if (!formData.headline.trim()) {
      newErrors.headline = labelsData.form.validation.headlineRequired;
    }

    if (!formData.category) {
      newErrors.category = labelsData.form.validation.categoryRequired;
    }

    if (!formData.priority) {
      newErrors.priority = labelsData.form.validation.priorityRequired;
    }

    if (!formData.date) {
      newErrors.date = labelsData.form.validation.dateRequired;
    }

    const entryValue = formData.entry.trim();
    if (!entryValue || entryValue.length < 50) {
      newErrors.entry = labelsData.form.validation.entryMinLength;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        setHasUnsavedChanges(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSaveDraft = async () => {
    if (onSaveDraft) {
      try {
        setIsSubmitting(true);
        await onSaveDraft(formData);
        setHasUnsavedChanges(false);
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 3000);
      } catch (error) {
        console.error("Error saving draft:", error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    }
  };

  const handleReset = async () => {
    const confirmed = await showConfirm(
      labelsData.form.popups.resetTitle,
      labelsData.form.popups.resetMessage,
    );

    if (confirmed) {
      setFormData({
        category: "",
        priority: "Situational Awareness",
        region: "",
        country: [],
        headline: "",
        date: new Date().toISOString().split("T")[0],
        entry: "",
        sourceName: "",
        sourceDate: "",
        sourceUrl: "",
        puNote: "",
        author: "Current User",
      });
      setErrors({});
      setShowPuNote(false);
      setHasUnsavedChanges(false);
      setDraftSaved(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await showConfirm(
      labelsData.form.popups.cancelTitle,
      labelsData.form.popups.cancelMessage,
    );

    if (confirmed) {
      setHasUnsavedChanges(false);
      if (onCancel) {
        onCancel();
      } else {
        window.history.back();
      }
    }
  };

  const handleAutoFill = async () => {
    if (!autoFillContent.trim()) {
      showWarning(labelsData.form.popups.noContent, labelsData.form.popups.noContentMessage);
      return;
    }

    setIsAutoFilling(true);
    try {
      const response = await fetch("/api/auto-fill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: autoFillContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || "Failed to process content";

        // Check if it's an API key configuration error
        if (
          errorMessage.includes("GEMINI_API_KEY") ||
          errorMessage.includes("not configured")
        ) {
          showWarning(labelsData.form.popups.aiDisabled, labelsData.form.popups.aiDisabledMessage);
        } else {
          showWarning(labelsData.form.popups.autoFillFailed, errorMessage);
        }
        return;
      }

      const result = await response.json();

      // Normalize country to always be an array for the MultiSelectField
      let normalizedCountry: string[] = [];
      if (result.country) {
        if (Array.isArray(result.country)) {
          normalizedCountry = result.country;
        } else if (typeof result.country === "string") {
          normalizedCountry = [result.country];
        }
      }

      // Update form with AI results (countries are now independent of region)
      setFormData((prev) => ({
        ...prev,
        category: result.category || prev.category,
        priority: result.priority || prev.priority,
        region: result.region || prev.region,
        country:
          normalizedCountry.length > 0 ? normalizedCountry : prev.country,
        headline: result.headline || prev.headline,
        date: result.date || prev.date,
        entry: result.entry || prev.entry,
        sourceDate: result.sourceDate || prev.sourceDate,
        sourceName: result.sourceName || prev.sourceName,
      }));

      setShowAutoFillDialog(false);
      setAutoFillContent("");
      showSuccess(
        labelsData.form.popups.autoFillSuccess,
        labelsData.form.popups.autoFillSuccessMessage,
      );
    } catch (error) {
      console.error("[AUTO-FILL] Error:", error);
      showWarning(labelsData.form.popups.aiDisabled, labelsData.form.popups.aiDisabledMessage);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-full bg-white px-2 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <Card className="mb-0 rounded-b-none border-b-0 py-4 sm:py-6">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex shrink-0 items-center justify-center rounded bg-un-blue p-2">
                  <FileText className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-2xl">
                    {labelsData.form.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {labelsData.form.subtitle}
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAutoFillDialog(true)}
                className="shrink-0"
                title={labelsData.form.autoFill.dialogTitle}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{labelsData.form.actions.autoFill}</span>
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:mt-4 sm:gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {currentDate}
              </span>
              {draftSaved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                  <Check className="h-3 w-3" />
                  {labelsData.form.actions.draftSaved}
                </span>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Form */}
        <Card className="rounded-t-none">
          <CardContent className="p-4 pt-4 sm:p-6 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Classification & Location Section */}
              <section className="space-y-4 border-b pb-4 sm:pb-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
                  {/* Category */}
                  <SelectField
                    label={labelsData.form.labels.category}
                    placeholder={labelsData.form.placeholders.category}
                    value={formData.category}
                    onValueChange={(value) =>
                      handleSelectChange("category", value)
                    }
                    options={CATEGORIES.map((cat) => ({
                      value: cat,
                      label: cat,
                    }))}
                    error={errors.category}
                    required={true}
                  />

                  {/* Priority */}
                  <SelectField
                    label={labelsData.form.labels.priority}
                    placeholder={labelsData.form.placeholders.priority}
                    value={formData.priority}
                    onValueChange={(value) =>
                      handleSelectChange(
                        "priority",
                        value as "Secretary-General's Attention" | "Situational Awareness",
                      )
                    }
                    options={PRIORITIES}
                    error={errors.priority}
                    required={true}
                  />

                  {/* Region */}
                  <SelectField
                    label={labelsData.form.labels.region}
                    placeholder={labelsData.form.placeholders.region}
                    value={formData.region}
                    onValueChange={(value) =>
                      handleSelectChange("region", value)
                    }
                    options={regionOptions}
                    error={errors.region}
                    required={true}
                    searchable={false}
                  />

                  {/* Tag */}
                  <MultiSelectField
                    label={labelsData.form.labels.tags}
                    placeholder={labelsData.form.placeholders.tags}
                    value={
                      Array.isArray(formData.country)
                        ? formData.country
                        : formData.country
                          ? [formData.country]
                          : []
                    }
                    onValueChange={handleCountryChange}
                    options={countryOptions}
                    error={errors.country}
                    required={false}
                    searchable={true}
                    existingCustomValues={existingCustomCountries}
                  />
                </div>
              </section>

              {/* Entry Details Section */}
              <section className="space-y-4 border-b pb-4 sm:pb-6">
                <h2 className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
                  {labelsData.form.sections.entryDetails}
                </h2>

                <div className="grid grid-cols-4 gap-3 sm:gap-4">
                  {/* Headline - Full width */}
                  <div className="col-span-4 space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {labelsData.form.labels.headline} <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({formData.headline.length}/300)
                      </span>
                    </label>
                    <textarea
                      name="headline"
                      value={formData.headline}
                      onChange={handleInputChange}
                      placeholder={labelsData.form.placeholders.headline}
                      maxLength={300}
                      rows={1}
                      className={`w-full resize-none overflow-hidden rounded border px-3 py-2 text-sm transition outline-none ${
                        errors.headline
                          ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                          : "border-slate-300 bg-slate-50 focus:border-un-blue focus:ring-2 focus:ring-un-blue/15"
                      }`}
                      style={{
                        minHeight: "2.5rem",
                        maxHeight: "10rem",
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height =
                          Math.min(target.scrollHeight, 160) + "px";
                      }}
                    />
                    {errors.headline && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.headline}
                      </div>
                    )}
                  </div>
                </div>

                {/* Entry Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      {labelsData.form.labels.entryContent} <span className="text-red-500">*</span>
                    </label>
                    {/* Text Mode Toggle Switch */}
                    <div className="inline-flex gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUseRichText(false);
                          setHasUserToggled(true);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                          !useRichText
                            ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-700"
                        }`}
                      >
                        <Type className="h-3.5 w-3.5" />
                        {labelsData.form.editorMode.plainText}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseRichText(true);
                          setHasUserToggled(true);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                          useRichText
                            ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-700"
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        {labelsData.form.editorMode.richText}
                      </button>
                    </div>
                  </div>

                  {useRichText === null ? (
                    // Show plain text while loading (will switch to rich text on desktop)
                    <div className="min-h-[250px] w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm" />
                  ) : useRichText ? (
                    <RichTextEditor
                      content={formData.entry}
                      onChange={(content) => {
                        setFormData((prev) => ({ ...prev, entry: content }));
                        if (errors.entry) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.entry;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder={labelsData.form.placeholders.entry}
                      error={!!errors.entry}
                      minHeight="min-h-[250px]"
                    />
                  ) : (
                    <textarea
                      value={extractPlainText(formData.entry)}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          entry: e.target.value,
                        }));
                        if (errors.entry) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.entry;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder={labelsData.form.placeholders.entry}
                      className={`min-h-[250px] w-full resize-none rounded border px-3 py-2 text-sm transition outline-none ${
                        errors.entry
                          ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                          : "border-slate-300 bg-slate-50 focus:border-un-blue focus:ring-2 focus:ring-un-blue/15"
                      }`}
                      spellCheck="true"
                    />
                  )}

                  {errors.entry && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.entry}
                    </div>
                  )}
                </div>

                {/* Source Data Row: Name, Date, URL */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <AutocompleteField
                    label={labelsData.form.labels.sourceName}
                    optional
                    value={formData.sourceName || ""}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, sourceName: value }))
                    }
                    suggestions={sourceNames}
                    placeholder={labelsData.form.placeholders.sourceName}
                  />

                  <TextField
                    type="date"
                    label={labelsData.form.labels.sourceDate}
                    optional
                    name="sourceDate"
                    value={formData.sourceDate || ""}
                    onChange={handleInputChange}
                  />

                  <TextField
                    type="url"
                    label={labelsData.form.labels.sourceUrl}
                    optional
                    name="sourceUrl"
                    value={formData.sourceUrl || ""}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>

                {/* PU Note */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="puNoteCheck"
                      checked={showPuNote}
                      onCheckedChange={(checked) => {
                        setShowPuNote(checked as boolean);
                        if (!checked) {
                          setFormData((prev) => ({ ...prev, puNote: "" }));
                        }
                      }}
                    />
                    <label
                      htmlFor="puNoteCheck"
                      className="text-sm font-medium text-slate-700"
                    >
                      {labelsData.form.labels.puNote}{" "}
                      <span className="text-xs text-slate-500">(optional)</span>
                    </label>
                  </div>
                  {showPuNote && (
                    <RichTextEditor
                      content={formData.puNote || ""}
                      onChange={(value) => {
                        setFormData((prev) => ({ ...prev, puNote: value }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder={labelsData.form.placeholders.puNote}
                      minHeight="min-h-[120px]"
                      minimalMode={true}
                    />
                  )}
                </div>
              </section>

              {/* Metadata Section */}
              <section className="pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="-m-2 flex items-center gap-2 rounded p-2 transition hover:bg-slate-50"
                >
                  <h2 className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
                    {labelsData.form.sections.metadata}
                  </h2>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-600 transition-transform ${
                      showMetadata ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showMetadata && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <TextField
                      label={labelsData.form.labels.author}
                      value={formData.author || "Current User"}
                      readOnly
                      inputClassName="bg-slate-100 text-slate-600"
                    />

                    <TextField
                      type="date"
                      label={labelsData.form.labels.creationDate}
                      name="dateOnly"
                      value={formData.date.split("T")[0] || ""}
                      onChange={handleInputChange}
                      error={errors.date}
                    />

                    <TextField
                      type="text"
                      label={labelsData.form.labels.creationTime}
                      name="timeOnly"
                      placeholder="HH:MM"
                      value={(formData.date.split("T")[1] || "").slice(0, 5)}
                      onChange={handleInputChange}
                    />
                  </div>
                )}

                {showMetadata && (
                  <div className="mt-4">
                    <SelectField
                      label={labelsData.form.labels.previousEntry}
                      value={formData.previousEntryId || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, previousEntryId: value === "none" ? null : value }))
                      }
                      options={previousEntryOptions}
                      searchable={true}
                    />
                  </div>
                )}

                {showMetadata && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                    <Info className="h-3.5 w-3.5" />
                    {labelsData.form.popups.authorHint}
                  </div>
                )}
              </section>
            </form>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="-mx-2 flex flex-col items-stretch justify-between gap-2 rounded-b bg-none px-2 py-3 text-sm sm:-mx-4 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-4">
          <div className="order-2 flex flex-col gap-2 sm:order-1 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="w-full justify-center gap-2 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              {labelsData.form.actions.saveDraft}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="w-full justify-center gap-2 sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              {labelsData.form.actions.reset}
            </Button>
          </div>
          <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="w-full justify-center gap-2 sm:w-auto"
            >
              <X className="h-4 w-4" />
              {labelsData.form.actions.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full justify-center gap-2 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {isSubmitting
                ? isEditing
                  ? labelsData.form.actions.updating
                  : labelsData.form.actions.submitting
                : isEditing
                  ? labelsData.form.actions.update
                  : labelsData.form.actions.submit}
            </Button>
          </div>
        </div>
      </div>

      {/* Auto-Fill Dialog */}
      <Dialog open={showAutoFillDialog} onOpenChange={setShowAutoFillDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-un-blue" />
              Auto-Fill Form with AI
            </DialogTitle>
            <DialogDescription>
              {labelsData.form.autoFill.contentDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {labelsData.form.autoFill.contentLabel}
              </label>
              <textarea
                value={autoFillContent}
                onChange={(e) => setAutoFillContent(e.target.value)}
                placeholder={labelsData.form.autoFill.contentPlaceholder}
                className="min-h-[200px] w-full resize-none rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm transition outline-none focus:border-un-blue focus:ring-2 focus:ring-un-blue/15"
                disabled={isAutoFilling}
              />
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              <strong>AI will extract:</strong> {labelsData.form.autoFill.extractionHint.replace("AI will extract: ", "")}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAutoFillDialog(false);
                setAutoFillContent("");
              }}
              disabled={isAutoFilling}
            >
              {labelsData.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleAutoFill}
              disabled={isAutoFilling || !autoFillContent.trim()}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isAutoFilling ? labelsData.form.autoFill.submitLoading : labelsData.form.autoFill.submitButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
