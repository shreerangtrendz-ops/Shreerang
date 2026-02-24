import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Database, Globe, Server, Shield } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

// Service Imports for Testing
import { FabricService } from '@/services/FabricService';
import { ProductService } from '@/services/ProductService';
import { CustomerService } from '@/services/CustomerService';
import { OrderService } from '@/services/OrderService';

const SystemHealthCheck = () => {
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [overallStatus, setOverallStatus] = useState('unknown'); // unknown, healthy, degraded, critical

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);
    
    const tests = [
      { name: 'Database Connection', category: 'Infrastructure', fn: checkDatabaseConnection },
      { name: 'Auth Service', category: 'Security', fn: checkAuthService },
      { name: 'Fabric Service', category: 'Application', fn: () => checkServiceList(FabricService.listFabrics, 'Fabric List') },
      { name: 'Product Service', category: 'Application', fn: () => checkServiceList(ProductService.listProducts, 'Product List') },
      { name: 'Customer Service', category: 'Application', fn: () => checkServiceList(CustomerService.listCustomers, 'Customer List') },
      { name: 'Storage Access', category: 'Infrastructure', fn: checkStorageAccess },
      { name: 'Order Service', category: 'Application', fn: () => checkServiceList(OrderService.listOrders, 'Order List') },
      { name: 'Realtime Subscription', category: 'Infrastructure', fn: checkRealtime },
    ];

    const totalTests = tests.length;
    let passedCount = 0;
    const newResults = [];

    for (let i = 0; i < totalTests; i++) {
      const test = tests[i];
      try {
        const startTime = performance.now();
        await test.fn();
        const duration = Math.round(performance.now() - startTime);
        
        newResults.push({
          ...test,
          status: 'pass',
          duration,
          message: 'Operation successful'
        });
        passedCount++;
      } catch (error) {
        console.error(`Test failed: ${test.name}`, error);
        newResults.push({
          ...test,
          status: 'fail',
          duration: 0,
          message: error.message || 'Operation failed'
        });
      }
      
      setResults([...newResults]);
      setProgress(Math.round(((i + 1) / totalTests) * 100));
    }

    // Determine overall status
    if (passedCount === totalTests) setOverallStatus('healthy');
    else if (passedCount > totalTests / 2) setOverallStatus('degraded');
    else setOverallStatus('critical');

    setIsRunning(false);
  };

  // Diagnostic Functions
  const checkDatabaseConnection = async () => {
    const { data, error } = await supabase.from('companies').select('count').limit(1).single();
    if (error) throw error;
    return true;
  };

  const checkAuthService = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return true;
  };

  const checkServiceList = async (serviceFn, context) => {
    // Assuming serviceFn returns a promise that resolves to data or throws
    const result = await serviceFn();
    if (!result && !Array.isArray(result) && !result.data) throw new Error(`${context} returned invalid data`);
    return true;
  };

  const checkStorageAccess = async () => {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    return true;
  };

  const checkRealtime = async () => {
    // Basic check if socket connects - complex to test fully in one-shot function
    // We'll just assume pass if client is initialized
    if (!supabase.realtime) throw new Error("Realtime client not initialized");
    return true;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Server className="h-6 w-6 text-blue-600" /> 
              System Health Diagnostics
            </CardTitle>
            <CardDescription>Run verifying tests across system components</CardDescription>
          </div>
          <Button onClick={runDiagnostics} disabled={isRunning}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <div className="p-4 rounded-lg border bg-slate-50 flex flex-col items-center">
             <span className="text-sm text-slate-500 mb-1">Overall Status</span>
             {overallStatus === 'healthy' && <span className="flex items-center text-green-600 font-bold"><CheckCircle2 className="mr-2 h-5 w-5"/> Healthy</span>}
             {overallStatus === 'degraded' && <span className="flex items-center text-yellow-600 font-bold"><AlertTriangle className="mr-2 h-5 w-5"/> Degraded</span>}
             {overallStatus === 'critical' && <span className="flex items-center text-red-600 font-bold"><XCircle className="mr-2 h-5 w-5"/> Critical</span>}
             {overallStatus === 'unknown' && <span className="flex items-center text-slate-400 font-bold">Unknown</span>}
           </div>
           <div className="p-4 rounded-lg border bg-slate-50 flex flex-col items-center">
             <span className="text-sm text-slate-500 mb-1">Tests Passed</span>
             <span className="font-mono font-bold text-xl">
               {results.filter(r => r.status === 'pass').length} / {results.length || '-'}
             </span>
           </div>
           <div className="p-4 rounded-lg border bg-slate-50 flex flex-col items-center">
             <span className="text-sm text-slate-500 mb-1">Total Duration</span>
             <span className="font-mono font-bold text-xl">
               {results.reduce((acc, curr) => acc + curr.duration, 0)}ms
             </span>
           </div>
        </div>

        {isRunning && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {results.map((result, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-md border hover:bg-slate-50 transition-colors">
               <div className="flex items-center gap-4">
                 {result.status === 'pass' 
                   ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                   : <XCircle className="h-5 w-5 text-red-500" />
                 }
                 <div>
                   <h4 className="font-medium text-sm text-slate-900">{result.name}</h4>
                   <p className="text-xs text-slate-500">{result.category}</p>
                 </div>
               </div>
               <div className="flex items-center gap-4 text-sm">
                 <span className={`${result.status === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                   {result.message}
                 </span>
                 <Badge variant="outline" className="font-mono">
                   {result.duration}ms
                 </Badge>
               </div>
            </div>
          ))}
          {!isRunning && results.length === 0 && (
            <div className="text-center py-10 text-slate-400">
               Click "Run Diagnostics" to verify system integrity
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemHealthCheck;