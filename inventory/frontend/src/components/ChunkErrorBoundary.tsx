import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

/**
 * Catches React lazy chunk loading errors (network failures, stale deploys).
 * Shows a user-friendly reload prompt instead of a blank white screen.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    const isChunk =
      error instanceof Error &&
      (error.message.includes("Failed to fetch dynamically imported module") ||
        error.message.includes("Importing a module script failed") ||
        error.name === "ChunkLoadError");

    return { hasError: true, isChunkError: isChunk };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Production logging hook — replace with Sentry/LogRocket if available
    console.error("[ChunkErrorBoundary]", error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-lg font-semibold text-foreground">
          {this.state.isChunkError
            ? "Impossible de charger la page."
            : "Une erreur inattendue s'est produite."}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {this.state.isChunkError
            ? "Vérifiez votre connexion internet puis rechargez la page."
            : "Rechargez la page ou contactez le support si le problème persiste."}
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-2 min-h-[44px] rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Recharger la page
        </button>
      </div>
    );
  }
}
