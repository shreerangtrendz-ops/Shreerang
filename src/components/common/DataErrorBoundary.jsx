import React from 'react';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

class DataErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DataErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
       // Optional: Reload the page if no retry function is provided, or just let the component re-mount
       // For data components, typically triggering a re-fetch via parent props or context is better,
       // but strictly re-mounting might be enough if the fetch is in useEffect([]).
       window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-red-50 text-red-900 border-red-200 min-h-[300px] w-full text-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-red-800">Unable to load content</h3>
          <p className="text-sm text-red-700 mb-6 max-w-md">
            {this.state.error?.message || "An unexpected error occurred while processing the data for this section."}
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleRetry} variant="outline" className="border-red-300 hover:bg-red-100 text-red-800 bg-white">
               <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
          {import.meta.env.MODE === 'development' && this.state.errorInfo && (
            <details className="mt-6 text-left text-xs text-red-800 bg-red-100 p-2 rounded w-full max-w-lg overflow-auto max-h-40">
              <summary className="cursor-pointer font-medium mb-1">Stack Trace</summary>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default DataErrorBoundary;