'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { validateForm, rules } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';

interface FormData {
  subject: string;
  message: string;
  attachments: File[];
}

interface FormErrors {
  [key: string]: string[];
}

export default function ContactForm() {
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const { personalDetails } = useAppSelector((state) => state.booking);

  const [formData, setFormData] = useState<FormData>({
    subject: '',
    message: '',
    attachments: []
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validationRules = {
    subject: [
      rules.required('Please enter a subject'),
      rules.minLength(5, 'Subject must be at least 5 characters long')
    ],
    message: [
      rules.required('Please enter your message'),
      rules.minLength(20, 'Message must be at least 20 characters long')
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    showLoading('Sending your message...');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/');
    } catch (error) {
      console.error('Failed to submit support request:', error);
      setErrors({
        submit: ['Failed to send your message. Please try again.']
      });
    } finally {
      hideLoading();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, subject: e.target.value }));
            setErrors(prev => ({ ...prev, subject: [] }));
          }}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
          placeholder="What can we help you with?"
        />
        <FormError errors={errors.subject} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, message: e.target.value }));
            setErrors(prev => ({ ...prev, message: [] }));
          }}
          rows={6}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
          placeholder="Please describe your issue in detail"
        />
        <FormError errors={errors.message} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachments (optional)
        </label>
        <input
          type="file"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
            if (validFiles.length !== files.length) {
              setErrors(prev => ({
                ...prev,
                attachments: ['Some files exceed the 5MB size limit']
              }));
            } else {
              setErrors(prev => ({ ...prev, attachments: [] }));
            }
            setFormData(prev => ({ ...prev, attachments: validFiles }));
          }}
          className="w-full"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        <p className="mt-1 text-sm text-gray-500">
          You can attach relevant documents or screenshots (max 5MB each)
        </p>
        <FormError errors={errors.attachments} />
      </div>

      <FormError errors={errors.submit} />

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 text-[#F54538] hover:bg-[#FEF2F2] rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-[#F54538] text-white rounded-lg hover:bg-[#E03F33] transition-colors"
        >
          Send Message
        </button>
      </div>
    </form>
  );
}