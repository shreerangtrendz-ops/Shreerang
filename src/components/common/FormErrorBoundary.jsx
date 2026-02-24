import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

class FormErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Form Error Boundary Caught:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-4 p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <AlertTitle className="text-red-800 font-semibold mb-1">Component Error</AlertTitle>
              <AlertDescription className="text-red-700 text-sm">
                <p className="mb-3 opacity-90">
                  {this.state.error?.message || "An unexpected error occurred in this component."}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={this.resetError}
                  className="bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Try Again
                </Button>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default FormErrorBoundary;