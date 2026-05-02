import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 text-destructive mb-4">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. We've been notified and are looking into it.
              </p>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-muted rounded-lg text-left overflow-auto max-h-40 text-xs font-mono border">
                {this.state.error?.stack}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button onClick={this.handleReset} className="gap-2 px-8">
                <RefreshCcw className="w-4 h-4" /> Reload Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2 px-8">
                <Home className="w-4 h-4" /> Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
