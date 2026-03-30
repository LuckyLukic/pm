"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center px-4 py-12">
          <section className="rounded-[var(--radius-xl)] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow-lg)]">
            <h1 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[var(--gray-text)]">
              An unexpected error occurred. Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 w-full rounded-[var(--radius-md)] bg-[var(--secondary-purple)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
