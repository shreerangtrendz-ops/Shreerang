import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Page Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-background">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 duration-300">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md mb-8 text-lg">
            We encountered an unexpected error while loading this page.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Refresh Page
            </Button>
            <Button onClick={() => window.location.href = '/'} className="gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
          {import.meta.env.MODE === 'development' && (
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded text-left w-full max-w-2xl overflow-auto text-xs font-mono text-red-600 border border-red-200">
              {this.state.error && this.state.error.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;