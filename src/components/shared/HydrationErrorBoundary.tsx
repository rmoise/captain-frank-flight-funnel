"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary specifically designed to catch and handle hydration errors
 * This component will remount its children client-side if a hydration error occurs
 */
export class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log in development
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "HydrationErrorBoundary caught an error:",
        error,
        errorInfo
      );
    }
  }

  render() {
    // If there's a hydration error, remount the children client-side only
    if (this.state.hasError) {
      // Reset the error state
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 0);

      // Return a placeholder while the error state is reset
      return <div className="hydration-error-placeholder" />;
    }

    return this.props.children;
  }
}
