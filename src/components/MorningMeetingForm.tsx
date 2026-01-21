'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SelectField } from '@/components/SelectField';
import { MultiSelectField } from '@/components/MultiSelectField';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  MorningMeetingEntry,
  FormFieldError,
  CATEGORIES,
  PRIORITIES,
  REGIONS,
} from '@/types/morning-meeting';
import labelsData from '@/lib/labels.json';
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
} from 'lucide-react';
import { usePopup } from '@/lib/popup-context';
import { useUnsavedChanges } from '@/lib/unsaved-changes-context';

// Get countries list from labels.json with proper typing, sorted alphabetically
const COUNTRIES: string[] = ((labelsData as Record<string, any>).countries || []).sort();

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
    if (!entry) return '';
    // Remove any image-ref:// img tags that weren't converted properly
    return entry.replace(/<img[^>]*src=["']image-ref:\/\/[^"']*["'][^>]*>/gi, '');
  };

  // Extract plain text from HTML content
  const extractPlainText = (html: string) => {
    if (!html) return '';
    
    // Check if we're in browser environment
    if (typeof document === 'undefined') return html;
    
    // If it's already plain text (no HTML tags), return as-is
    if (!html.includes('<')) return html;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace block elements with newlines
    tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach(element => {
      element.appendChild(document.createTextNode('\n'));
    });
    
    // Remove script and style elements
    tempDiv.querySelectorAll('script, style').forEach(element => {
      element.remove();
    });
    
    // Get text content and clean up
    let text = tempDiv.textContent || '';
    
    // Replace multiple newlines with double newline (for paragraph breaks)
    text = text.replace(/\n\n+/g, '\n\n');
    
    // Trim trailing whitespace but preserve leading for structure
    return text.trim();
  };

  // Format date to YYYY-MM-DDTHH:MM format - extract literal string without any parsing
  const formatDateForInput = (dateValue: any): string => {
    if (!dateValue) {
      // Return current time as-is
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }
    
    if (typeof dateValue === 'string') {
      // Extract YYYY-MM-DDTHH:MM from the string exactly as stored
      // This handles formats like:
      // - "2026-01-15T13:30" (already correct)
      // - "2026-01-15T13:30:00" (trim seconds)
      // - "2026-01-15T13:30:00.000Z" (remove milliseconds and Z)
      const match = dateValue.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
      return match ? match[1] : '';
    }
    
    return '';
  };

  // Helper function to parse country field which might be JSON string or array
  const parseCountryField = (country: any): string[] => {
    if (!country) return [];
    if (Array.isArray(country)) return country;
    if (typeof country === 'string' && country.startsWith('[')) {
      try {
        const parsed = JSON.parse(country);
        return Array.isArray(parsed) ? parsed : [country];
      } catch {
        return [country];
      }
    }
    return [country];
  };

  const [formData, setFormData] = useState<MorningMeetingEntry>({
    category: initialData?.category || '',
    priority: initialData?.priority || '',
    region: initialData?.region || '',
    country: parseCountryField(initialData?.country),
    headline: initialData?.headline || '',
    date: formatDateForInput(initialData?.date),
    entry: cleanEntry(initialData?.entry || ''),
    sourceUrl: initialData?.sourceUrl || '',
    sourceDate: initialData?.sourceDate || '',
    puNote: initialData?.puNote || '',
    author: initialData?.author || 'Current User',
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
  const [autoFillContent, setAutoFillContent] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const { data: session } = useSession();
  const { warning: showWarning, success: showSuccess } = usePopup();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // Track if form has been modified
  const [initialFormData] = useState(formData);

  // Autofill form with current user's information
  useEffect(() => {
    if (session?.user && !initialData?.author) {
      const fullName = `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim();
      setFormData((prev) => ({
        ...prev,
        author: fullName || session.user.email || 'Current User',
      }));
    }
  }, [session, initialData?.author]);

  // Set default editor mode based on screen size
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
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
    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [hasUserToggled]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setHasUnsavedChanges(hasChanges);
  }, [formData, initialFormData, setHasUnsavedChanges]);

  // Add beforeunload handler to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, initialFormData]);

  // No coordination needed - region and country are independent

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      const { name, value } = e.target;
      
      // Handle date and time separately, then combine
      if (name === 'dateOnly' || name === 'timeOnly') {
        setFormData((prev) => {
          const dateOnly = name === 'dateOnly' ? value : prev.date.split('T')[0];
          const timeOnly = name === 'timeOnly' ? value : (prev.date.split('T')[1] || '00:00');
          return { ...prev, date: `${dateOnly}T${timeOnly}` };
        });
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }

      // Clear error for date field when either dateOnly or timeOnly changes
      const errorField = (name === 'dateOnly' || name === 'timeOnly') ? 'date' : name;
      if (errors[errorField]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[errorField];
          return newErrors;
        });
      }
    },
    [errors]
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
    [errors]
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
    [errors]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormFieldError = {};

    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    if (!formData.headline.trim()) {
      newErrors.headline = 'Headline is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    const entryValue = formData.entry.trim();
    if (!entryValue || entryValue.length < 50) {
      newErrors.entry = 'Entry must be at least 50 characters';
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
        console.error('Error saving draft:', error);
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
      'Reset Form',
      'Are you sure you want to reset the form? All entered data will be lost.'
    );
    
    if (confirmed) {
      setFormData({
        category: '',
        priority: 'situational-awareness',
        region: '',
        country: [],
        headline: '',
        date: new Date().toISOString().split('T')[0],
        entry: '',
        sourceUrl: '',
        sourceDate: '',
        puNote: '',
        author: 'Current User',
      });
      setErrors({});
      setShowPuNote(false);
      setHasUnsavedChanges(false);
      setDraftSaved(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await showConfirm(
      'Cancel',
      'Are you sure you want to cancel? Any unsaved changes will be lost.'
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
      showWarning('No Content', 'Please paste some content to analyze');
      return;
    }

    setIsAutoFilling(true);
    try {
      const response = await fetch('/api/auto-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: autoFillContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to process content';
        
        // Check if it's an API key configuration error
        if (errorMessage.includes('GEMINI_API_KEY') || errorMessage.includes('not configured')) {
          showWarning('AI Usage not enabled', 'Please wait for Update');
        } else {
          showWarning('Auto-Fill Failed', errorMessage);
        }
        return;
      }

      const result = await response.json();

      // Normalize country to always be an array for the MultiSelectField
      let normalizedCountry: string[] = [];
      if (result.country) {
        if (Array.isArray(result.country)) {
          normalizedCountry = result.country;
        } else if (typeof result.country === 'string') {
          normalizedCountry = [result.country];
        }
      }

      // Update form with AI results (countries are now independent of region)
      setFormData((prev) => ({
        ...prev,
        category: result.category || prev.category,
        priority: result.priority || prev.priority,
        region: result.region || prev.region,
        country: normalizedCountry.length > 0 ? normalizedCountry : prev.country,
        headline: result.headline || prev.headline,
        date: result.date || prev.date,
        entry: result.entry || prev.entry,
        sourceDate: result.sourceDate || prev.sourceDate,
      }));

      setShowAutoFillDialog(false);
      setAutoFillContent('');
      showSuccess('Form Auto-Filled', 'The form has been filled with AI-analyzed data. Please review and adjust as needed.');
    } catch (error) {
      console.error('[AUTO-FILL] Error:', error);
      showWarning('AI Usage not enabled', 'Please wait for Update');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full bg-white py-4 sm:py-8 px-2 sm:px-4">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <Card className="mb-0 rounded-b-none border-b-0 py-4 sm:py-6">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex shrink-0 items-center justify-center rounded bg-un-blue p-2">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-2xl">Morning Meeting Form</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Submit a new entry to be used in the next Morning Meeting Update
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAutoFillDialog(true)}
                className="shrink-0"
                title="Paste content to auto-fill form with AI"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Auto-Fill</span>
              </Button>
            </div>
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {currentDate}
              </span>
              {draftSaved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                  <Check className="h-3 w-3" />
                  Draft Saved
                </span>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Form */}
        <Card className="rounded-t-none">
          <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Classification & Location Section */}
              <section className="space-y-4 border-b pb-4 sm:pb-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                  {/* Category */}
                  <SelectField
                    label="Category"
                    placeholder="Select category..."
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange('category', value)}
                    options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                    error={errors.category}
                    required={true}
                  />

                  {/* Priority */}
                  <SelectField
                    label="Priority"
                    placeholder="Select priority..."
                    value={formData.priority}
                    onValueChange={(value) =>
                      handleSelectChange('priority', value as 'sg-attention' | 'situational-awareness')
                    }
                    options={PRIORITIES}
                    error={errors.priority}
                    required={true}
                  />

                  {/* Region */}
                  <SelectField
                    label="Region"
                    placeholder="Select region..."
                    value={formData.region}
                    onValueChange={(value) => handleSelectChange('region', value)}
                    options={REGIONS.map((region) => ({ value: region, label: region }))}
                    error={errors.region}
                    required={true}
                    searchable={false}
                  />

                  {/* Country */}
                  <MultiSelectField
                    label="Country/Countries"
                    placeholder="Select countries..."
                    value={Array.isArray(formData.country) ? formData.country : (formData.country ? [formData.country] : [])}
                    onValueChange={handleCountryChange}
                    options={availableCountries.map((country) => ({ value: country, label: country }))}
                    error={errors.country}
                    required={false}
                    searchable={true}
                  />
                </div>
              </section>

              {/* Entry Details Section */}
              <section className="space-y-4 border-b pb-4 sm:pb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Entry Details
                </h2>

                <div className="grid gap-3 sm:gap-4 grid-cols-4">
                  {/* Headline - Full width */}
                  <div className="space-y-2 col-span-4">
                    <label className="text-sm font-medium text-slate-700">
                      Headline{' '}
                      <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({formData.headline.length}/300)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="headline"
                      value={formData.headline}
                      onChange={handleInputChange}
                      placeholder="Enter a concise, descriptive headline..."
                      maxLength={300}
                      className={`w-full rounded border px-3 py-2 text-sm outline-none transition ${
                        errors.headline
                          ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                          : 'border-slate-300 bg-slate-50 focus:border-un-blue focus:ring-2 focus:ring-un-blue/15'
                      }`}
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
                      Entry Content{' '}
                      <span className="text-red-500">*</span>
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
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'text-slate-600 hover:text-slate-700'
                        }`}
                      >
                        <Type className="h-3.5 w-3.5" />
                        Plain Text
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseRichText(true);
                          setHasUserToggled(true);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                          useRichText
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'text-slate-600 hover:text-slate-700'
                        }`}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Rich Text
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
                      placeholder="Provide a comprehensive summary of the development. Include key facts, actors involved, implications, and any recommended actions..."
                      error={!!errors.entry}
                      minHeight="min-h-[250px]"
                    />
                  ) : (
                    <textarea
                      value={extractPlainText(formData.entry)}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, entry: e.target.value }));
                        if (errors.entry) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.entry;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Provide a comprehensive summary of the development. Include key facts, actors involved, implications, and any recommended actions..."
                      className={`w-full rounded border px-3 py-2 text-sm outline-none transition min-h-[250px] resize-none ${
                        errors.entry
                          ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                          : 'border-slate-300 bg-slate-50 focus:border-un-blue focus:ring-2 focus:ring-un-blue/15'
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

                {/* Source URL and Date */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Source URL <span className="text-xs text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="url"
                      name="sourceUrl"
                      value={formData.sourceUrl || ''}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-un-blue focus:ring-2 focus:ring-un-blue/15"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Source Date <span className="text-xs text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="date"
                      name="sourceDate"
                      value={formData.sourceDate || ''}
                      onChange={handleInputChange}
                      className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-un-blue focus:ring-2 focus:ring-un-blue/15"
                    />
                  </div>
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
                          setFormData((prev) => ({ ...prev, puNote: '' }));
                        }
                      }}
                    />
                    <label
                      htmlFor="puNoteCheck"
                      className="text-sm font-medium text-slate-700"
                    >
                      PU Note/Comment <span className="text-xs text-slate-500">(optional)</span>
                    </label>
                  </div>
                  {showPuNote && (
                    <textarea
                      name="puNote"
                      value={formData.puNote || ''}
                      onChange={handleInputChange}
                      placeholder="Add Political Unit note or comment..."
                      rows={3}
                      className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-un-blue focus:ring-2 focus:ring-un-blue/15"
                    />
                  )}
                </div>
              </section>

              {/* Metadata Section */}
              <section className="pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="flex items-center gap-2 p-2 -m-2 hover:bg-slate-50 rounded transition"
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Metadata
                  </h2>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-600 transition-transform ${
                      showMetadata ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {showMetadata && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {/* Author */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Author</label>
                      <input
                        type="text"
                        value={formData.author || 'Current User'}
                        readOnly
                        className="w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Creation Date
                      </label>
                      <input
                        type="date"
                        name="dateOnly"
                        value={formData.date.split('T')[0] || ''}
                        onChange={handleInputChange}
                        className={`w-full rounded border px-3 py-2 text-sm outline-none transition ${
                          errors.date
                            ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                            : 'border-slate-300 bg-slate-50 focus:border-un-blue focus:ring-2 focus:ring-un-blue/15'
                        }`}
                      />
                      {errors.date && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.date}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Creation Time
                      </label>
                      <input
                        type="text"
                        name="timeOnly"
                        placeholder="HH:MM"
                        value={(formData.date.split('T')[1] || '').slice(0, 5)}
                        onChange={handleInputChange}
                        className={`w-full rounded border px-3 py-2 text-sm outline-none transition ${
                          errors.date
                            ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                            : 'border-slate-300 bg-slate-50 focus:border-un-blue focus:ring-2 focus:ring-un-blue/15'
                        }`}
                      />
                    </div>
                  </div>
                )}
                
                {showMetadata && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-3">
                    <Info className="h-3.5 w-3.5" />
                    Author automatically populated from your account
                  </div>
                )}
              </section>
            </form>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 rounded-b bg-none py-3 sm:py-4 text-sm -mx-2 sm:-mx-4 px-2 sm:px-4">
          <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2 w-full sm:w-auto justify-center"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Entry' : 'Submit Entry')}
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
              Paste news content, article text, or briefing information below. AI will analyze it and automatically fill the form fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Content to Analyze
              </label>
              <textarea
                value={autoFillContent}
                onChange={(e) => setAutoFillContent(e.target.value)}
                placeholder="Paste your content here... (news article, briefing text, report excerpt, etc.)"
                className="w-full min-h-[200px] rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-un-blue focus:ring-2 focus:ring-un-blue/15 resize-none"
                disabled={isAutoFilling}
              />
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
              <strong>AI will extract:</strong> Category, Priority, Region, Country, Headline, Source Date, Date, and Entry Content
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAutoFillDialog(false);
                setAutoFillContent('');
              }}
              disabled={isAutoFilling}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAutoFill}
              disabled={isAutoFilling || !autoFillContent.trim()}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isAutoFilling ? 'Processing...' : 'Auto-Fill Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
