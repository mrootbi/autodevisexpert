import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level render-error safety net.
 * Without this, an uncaught exception anywhere in the tree (bad data shape,
 * a third-party script, etc.) white-screens the entire SPA for the visitor.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Unhandled render error', error, info.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-action-red/10 text-action-redDark">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-slate-900">
          Une erreur inattendue est survenue
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Désolé, quelque chose s&apos;est mal passé de notre côté. Rechargez la page ou revenez à
          l&apos;accueil.
        </p>
        <button type="button" onClick={this.handleReload} className="btn-primary mt-6">
          <RotateCcw className="h-4 w-4" /> Retour à l&apos;accueil
        </button>
      </div>
    );
  }
}
