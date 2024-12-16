'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // TODO: Send error to error reporting service
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
          <div className="max-w-lg w-full mx-4">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600 mb-6">
                We&apos;re sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-[#F54538] text-white rounded-lg hover:bg-[#E03F33] transition-colors"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => window.location.href = '/contact-support'}
                  className="px-6 py-3 border border-[#F54538] text-[#F54538] rounded-lg hover:bg-[#FEF2F2] transition-colors"
                >
                  Contact Support
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                  <p className="font-mono text-sm text-gray-700 break-all">
                    {this.state.error?.toString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}