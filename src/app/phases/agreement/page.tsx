'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAgreement, completePhase } from '@/store/bookingSlice';
import { validateForm, rules } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import PhaseGuard from '@/components/shared/PhaseGuard';
import SignatureCanvas from 'react-signature-canvas';

interface FormData {
  hasAcceptedTerms: boolean;
  signature: string;
}

interface FormErrors {
  [key: string]: string[];
}

export default function AgreementPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showLoading, hideLoading } = useLoading();
  const savedAgreement = useAppSelector((state) => state.booking.agreement);
  const signatureRef = useRef<SignatureCanvas>(null);

  const [formData, setFormData] = useState<FormData>({
    hasAcceptedTerms: savedAgreement?.hasAcceptedTerms || false,
    signature: savedAgreement?.signature || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validationRules = {
    hasAcceptedTerms: [
      {
        test: (value: boolean) => value === true,
        message: 'You must accept the terms and conditions to proceed'
      }
    ],
    signature: [
      {
        test: (value: string) => value.length > 0,
        message: 'Please provide your signature'
      }
    ]
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData(prev => ({ ...prev, signature: '' }));
      setErrors(prev => ({ ...prev, signature: [] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get signature data
    const signatureData = signatureRef.current?.toDataURL() || '';
    const updatedFormData = {
      ...formData,
      signature: signatureData
    };

    // Validate form
    const validationErrors = validateForm(updatedFormData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    showLoading('Submitting your claim...');

    try {
      // Save agreement details
      dispatch(setAgreement({
        ...updatedFormData,
        signedAt: new Date().toISOString()
      }));
      dispatch(completePhase(6));

      // Navigate to success page
      router.push('/claim-submitted');
    } catch (error) {
      console.error('Failed to submit claim:', error);
      setErrors({
        submit: ['Failed to submit your claim. Please try again.']
      });
    } finally {
      hideLoading();
    }
  };

  return (
    <PhaseGuard requiredPhase={6} requiredPreviousPhases={[1, 2, 3, 4, 5]}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <h1 className="text-3xl font-bold mb-8">Agreement</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Terms and Conditions</h2>
              <div className="prose prose-sm max-w-none mb-4">
                <p>By signing this agreement, you confirm that:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>All information provided is accurate and complete</li>
                  <li>You authorize Captain Frank to act on your behalf</li>
                  <li>You understand our fee structure and payment terms</li>
                  <li>You agree to cooperate with any necessary follow-up</li>
                </ul>
              </div>

              <div className="mt-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.hasAcceptedTerms}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, hasAcceptedTerms: e.target.checked }));
                      setErrors(prev => ({ ...prev, hasAcceptedTerms: [] }));
                    }}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the terms and conditions, and I authorize Captain Frank to process my claim
                  </span>
                </label>
                <FormError errors={errors.hasAcceptedTerms} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Digital Signature</h2>
              <div className="border rounded-lg p-2">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-40 border rounded cursor-crosshair',
                  }}
                  backgroundColor="white"
                  onEnded={() => {
                    setFormData(prev => ({
                      ...prev,
                      signature: signatureRef.current?.toDataURL() || ''
                    }));
                    setErrors(prev => ({ ...prev, signature: [] }));
                  }}
                />
              </div>
              <FormError errors={errors.signature} />
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Signature
              </button>
            </div>

            <FormError errors={errors.submit} />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/phases/claim-eligibility')}
                className="px-6 py-3 text-[#F54538] hover:bg-[#FEF2F2] rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-[#F54538] text-white rounded-lg hover:bg-[#E03F33] transition-colors"
              >
                Submit Claim
              </button>
            </div>
          </form>
        </main>
      </div>
    </PhaseGuard>
  );
}