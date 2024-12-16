'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAgreement, completePhase } from '@/store/bookingSlice';
import { validateForm } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import PhaseGuard from '@/components/shared/PhaseGuard';
import SignaturePad from 'react-signature-pad-wrapper';

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
  const signatureRef = useRef<SignaturePad>(null);

  const [formData, setFormData] = useState<FormData>({
    hasAcceptedTerms: savedAgreement?.hasAcceptedTerms || false,
    signature: savedAgreement?.signature || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validationRules = {
    hasAcceptedTerms: [
      {
        test: (value: boolean) => value === true,
        message: 'You must accept the terms and conditions to proceed',
      },
    ],
    signature: [
      {
        test: (value: string) => value.length > 0,
        message: 'Please provide your signature',
      },
    ],
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setFormData((prev) => ({ ...prev, signature: '' }));
      setErrors((prev) => ({ ...prev, signature: [] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get signature data
    const signatureData = signatureRef.current?.toDataURL('image/png') || '';
    const updatedFormData = {
      ...formData,
      signature: signatureData,
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
      dispatch(
        setAgreement({
          ...updatedFormData,
          signedAt: new Date().toISOString(),
        })
      );
      dispatch(completePhase(6));

      // Navigate to success page
      router.push('/claim-submitted');
    } catch (error) {
      console.error('Failed to submit claim:', error);
      setErrors({
        submit: ['Failed to submit your claim. Please try again.'],
      });
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    const signaturePad = signatureRef.current;
    if (!signaturePad) return;

    const canvasRef = signaturePad.canvas;
    if (!canvasRef) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleBeginStroke = () => {
      setErrors((prev) => ({ ...prev, signature: [] }));
    };

    const handleEndStroke = () => {
      const currentPad = signatureRef.current;
      if (currentPad) {
        const signatureData = currentPad.toDataURL('image/png');
        setFormData((prev) => ({
          ...prev,
          signature: signatureData,
        }));
      }
    };

    canvas.addEventListener('mousedown', handleBeginStroke);
    canvas.addEventListener('touchstart', handleBeginStroke);
    canvas.addEventListener('mouseup', handleEndStroke);
    canvas.addEventListener('touchend', handleEndStroke);

    return () => {
      canvas.removeEventListener('mousedown', handleBeginStroke);
      canvas.removeEventListener('touchstart', handleBeginStroke);
      canvas.removeEventListener('mouseup', handleEndStroke);
      canvas.removeEventListener('touchend', handleEndStroke);
    };
  }, []);

  return (
    <PhaseGuard requiredPhase={6} requiredPreviousPhases={[1, 2, 3, 4, 5]}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <h1 className="text-3xl font-bold mb-8">Agreement</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Digital Signature</h2>
              <div className="border rounded-lg p-2 bg-white">
                <div className="w-full">
                  <SignaturePad
                    ref={signatureRef}
                    options={{
                      backgroundColor: 'rgb(255, 255, 255)',
                      penColor: 'rgb(0, 0, 0)',
                      velocityFilterWeight: 0.7,
                      minWidth: 0.5,
                      maxWidth: 2.5,
                      throttle: 16,
                      minDistance: 1,
                    }}
                    height={160}
                    width={600}
                  />
                </div>
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
