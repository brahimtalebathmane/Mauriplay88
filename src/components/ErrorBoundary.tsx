import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      }).catch(() => {});
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        return Promise.all(registrations.map((r) => r.unregister()));
      }).then(() => {
        window.location.href = '/';
      }).catch(() => {
        window.location.href = '/';
      });
    } else {
      window.location.href = '/';
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>

              <h1 className="text-2xl font-black mb-2">حدث خطأ غير متوقع</h1>
              <p className="text-gray-400 text-sm mb-6">
                عذراً، حدث خطأ أثناء تحميل التطبيق. يرجى المحاولة مرة أخرى.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={this.handleReload}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 py-4 rounded-xl font-black flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                إعادة تحميل التطبيق
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="secondary"
                className="w-full bg-white/5 border border-white/10 py-4 rounded-xl font-black flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                العودة للرئيسية
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-400 font-mono mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-[10px] text-red-400/70 overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-gray-600 text-xs">
                إذا استمرت المشكلة، يرجى التواصل مع الدعم
              </p>
              <p className="text-gray-500 text-xs mt-1" dir="ltr">
                +222 49 82 73 31
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
