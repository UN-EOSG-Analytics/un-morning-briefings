'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  MorningMeetingEntry,
  FormFieldError,
  CATEGORIES,
  PRIORITIES,
  REGIONS,
  COUNTRIES_BY_REGION,
} from '@/types/morning-meeting';
import {
  FileText,
  AlertCircle,
  Check,
  X,
  RotateCcw,
  Send,
  Save,
  Info,
} from 'lucide-react';
import { usePopup } from '@/lib/popup-context';

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

  const [formData, setFormData] = useState<MorningMeetingEntry>({
    category: initialData?.category || '',
    priority: initialData?.priority || 'situational-awareness',
    region: initialData?.region || '',
    country: initialData?.country || '',
    headline: initialData?.headline || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    entry: cleanEntry(initialData?.entry || ''),
    sourceUrl: initialData?.sourceUrl || '',
    puNote: initialData?.puNote || '',
    author: initialData?.author || 'Current User',
  });

  const [errors, setErrors] = useState<FormFieldError>({});
  const [showPuNote, setShowPuNote] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  // Update available countries when region changes
  useEffect(() => {
    if (formData.region && COUNTRIES_BY_REGION[formData.region]) {
      setAvailableCountries(COUNTRIES_BY_REGION[formData.region]);
    } else {
      setAvailableCountries([]);
    }
  }, [formData.region]);

  // Update country if it's not available in the new region
  useEffect(() => {
    if (
      formData.country &&
      availableCountries.length > 0 &&
      !availableCountries.includes(formData.country)
    ) {
      setFormData((prev) => ({ ...prev, country: '' }));
    }
  }, [availableCountries, formData.country]);

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      const { name, value } = e.target;
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

  const validateForm = useCallback((): boolean => {
    const newErrors: FormFieldError = {};

    if (!formData.region) {
      newErrors.region = 'Region is required';
    }

    if (!formData.country) {
      newErrors.country = 'Country is required';
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
        country: '',
        headline: '',
        date: new Date().toISOString().split('T')[0],
        entry: '',
        sourceUrl: '',
        puNote: '',
        author: 'Current User',
      });
      setErrors({});
      setShowPuNote(false);
      setDraftSaved(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await showConfirm(
      'Cancel',
      'Are you sure you want to cancel? Any unsaved changes will be lost.'
    );
    
    if (confirmed) {
      if (onCancel) {
        onCancel();
      } else {
        window.history.back();
      }
    }
  };

  const getPriorityLabel = (value: string) => {
    return PRIORITIES.find((p) => p.value === value)?.label || value;
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <Card className="mb-0 rounded-b-none border-b-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded bg-un-blue p-2">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Morning Meeting Entry Form</CardTitle>
                <CardDescription>
                  EOSG Political Unit • Data Entry Management System
                </CardDescription>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
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
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Classification Section */}
              <section className="space-y-4 border-b pb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Classification
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleSelectChange('category', value)}
                    >
                      <SelectTrigger
                        className={errors.category ? 'border-red-500 bg-red-50' : ''}
                      >
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.category}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        handleSelectChange('priority', value as 'sg-attention' | 'situational-awareness')
                      }
                    >
                      <SelectTrigger
                        className={errors.priority ? 'border-red-500 bg-red-50' : ''}
                      >
                        <SelectValue placeholder="Select priority..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.priority && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.priority}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Location Section */}
              <section className="space-y-4 border-b pb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Location
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Region */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Region <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.region}
                      onValueChange={(value) => handleSelectChange('region', value)}
                    >
                      <SelectTrigger
                        className={errors.region ? 'border-red-500 bg-red-50' : ''}
                      >
                        <SelectValue placeholder="Select region..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.region && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.region}
                      </div>
                    )}
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleSelectChange('country', value)}
                      disabled={availableCountries.length === 0}
                    >
                      <SelectTrigger
                        className={
                          availableCountries.length === 0
                            ? 'opacity-50'
                            : errors.country
                              ? 'border-red-500 bg-red-50'
                              : ''
                        }
                      >
                        <SelectValue placeholder="Select country..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCountries.length === 0 ? (
                          <div className="p-2 text-sm text-slate-500">Select region first</div>
                        ) : (
                          availableCountries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.country && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.country}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Entry Details Section */}
              <section className="space-y-4 border-b pb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Entry Details
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Headline */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Headline{' '}
                      <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({formData.headline.length}/150)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="headline"
                      value={formData.headline}
                      onChange={handleInputChange}
                      placeholder="Enter a concise, descriptive headline..."
                      maxLength={150}
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

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
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
                </div>

                {/* Entry Content */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Entry Content{' '}
                    <span className="text-red-500">*</span>
                  </label>
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
                </div>

                {/* Source URL */}
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
              <section className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Metadata
                </h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Author</label>
                  <input
                    type="text"
                    value={formData.author || 'Current User'}
                    readOnly
                    className="w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                  />
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Info className="h-3.5 w-3.5" />
                    Automatically populated from your account
                  </div>
                </div>
              </section>
            </form>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b bg-slate-50 px-6 py-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Entry' : 'Submit Entry')}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Morning Meeting System v2.1 • EOSG Political Unit
        </p>
      </div>
    </div>
  );
}
