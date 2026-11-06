'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast-context';
import { Star, X, CheckCircle2, MessageSquare } from 'lucide-react';

interface FeedbackModalProps {
  workshopId: string;
  workshopTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FeedbackModal({
  workshopId,
  workshopTitle,
  isOpen,
  onClose,
  onSuccess,
}: FeedbackModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const [contentRating, setContentRating] = useState(5);
  const [instructorRating, setInstructorRating] = useState(5);
  const [labQualityRating, setLabQualityRating] = useState(5);
  const [platformExperienceRating, setPlatformExperienceRating] = useState(5);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/workshops/${workshopId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentRating,
          instructorRating,
          labQualityRating,
          platformExperienceRating,
          comments,
          suggestions,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toastSuccess('Thank you!', 'Your feedback has been recorded.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toastError('Failed to submit feedback', json.error?.message);
      }
    } catch (err: any) {
      toastError('Connection Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarPicker = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => {
    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-800">
        <span className="text-xs text-slate-300 font-medium">{label}</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-1 hover:scale-110 transition-transform focus:outline-none"
            >
              <Star
                className={`w-4 h-4 ${
                  star <= value
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-slate-600'
                }`}
              />
            </button>
          ))}
          <span className="text-xs font-mono font-bold text-slate-400 w-6 text-right">
            {value}★
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Workshop Feedback & Review
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
              {workshopTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            {renderStarPicker('Content Quality & Curriculum', contentRating, setContentRating)}
            {renderStarPicker('Instructor Clarity & Guidance', instructorRating, setInstructorRating)}
            {renderStarPicker('Cloud Sandbox & Lab Exercises', labQualityRating, setLabQualityRating)}
            {renderStarPicker('Platform & Terminal Experience', platformExperienceRating, setPlatformExperienceRating)}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              What did you like most about this workshop?
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share what worked well or what you enjoyed..."
              rows={3}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Suggestions for Improvement (Optional)
            </label>
            <textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="How can we make future labs even better?"
              rows={2}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
