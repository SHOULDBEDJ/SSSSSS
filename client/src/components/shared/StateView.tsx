import React from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StateViewProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
  loadingComponent?: React.ReactNode;
}

export const StateView: React.FC<StateViewProps> = ({
  isLoading,
  isError,
  isEmpty,
  errorTitle = "Something went wrong",
  errorMessage = "We couldn't load the data. Please try again.",
  emptyTitle = "No data found",
  emptyMessage = "There's nothing to show here yet.",
  onRetry,
  onAction,
  actionLabel,
  children,
  className,
  loadingComponent,
}) => {
  if (isLoading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className={cn("flex flex-col items-center justify-center py-20 animate-pulse", className)}>
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Loading details...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95", className)}>
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-xl font-bold mb-2">{errorTitle}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{errorMessage}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Try Again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95", className)}>
        <div className="bg-muted p-4 rounded-full mb-4">
          <Inbox className="h-10 w-10 text-muted-foreground/60" />
        </div>
        <h3 className="text-xl font-bold mb-2">{emptyTitle}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{emptyMessage}</p>
        {onAction && actionLabel && (
          <Button onClick={onAction} className="gap-2">
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }

  return <div className={cn("animate-in fade-in duration-500", className)}>{children}</div>;
};
