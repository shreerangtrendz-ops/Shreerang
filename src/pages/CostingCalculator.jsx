import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calculator, Download, RefreshCw, FileText, FileSpreadsheet } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { CostingService } from '@/services/CostingService';
import CostBreakdownTable from '@/components/CostBreakdownTable';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/customSupabaseClient';

const CostingCalculator = () => {
  const [path, setPath] = useState('');
  const [formData, setFormData] = useState({
    grey_qty: 100,
    grey_rate: '',
    mill_rate: '',
    schiffli_rate: '',
    deca_rate: '',
    rfd_rate: '',
    digital_rate: '',
    dyeing_rate: '',
    shortage_percent: '',
    dhara_percent: '',
    profit_margin: '',
    transport_cost: '',
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tallyRatesLoading, setTallyRatesLoading] = useState(true);

  React.useEffect(() => {
    async function loadLatestRates() {
      try {
        setTallyRatesLoading(true);
        // Fetch latest purchase rate for grey fabric
        const { data: greyData } = await supabase
          .from('purchase_fabric')
          .select('price')
          .order('date', { ascending: false })
          .limit(1);

        // Fetch latest process charges for different job works
        const { data: processData } = await supabase
          .from('process_charges')
          .select('process_type, job_charge, shortage_pct')
          .order('date', { ascending: false })
          .limit(50); // Get enough to find the latest of each type

        const latestRates = {};
        const latestShortages = {};
        if (processData) {
          processData.forEach(p => {
            const type = p.process_type?.toLowerCase() || '';
            // Only keep the first (latest) occurrence we find
            if (type.includes('mill') && !latestRates.mill_rate) latestRates.mill_rate = p.job_charge;
            if (type.includes('schiffli') && !latestRates.schiffli_rate) latestRates.schiffli_rate = p.job_charge;
            if (type.includes('dye') && !latestRates.dyeing_rate) {
              latestRates.dyeing_rate = p.job_charge;
              if (p.shortage_pct && !latestShortages.shortage_percent) latestShortages.shortage_percent = p.shortage_pct;
            }
          });
        }

        setFormData(prev => ({
          ...prev,
          grey_rate: greyData?.[0]?.price?.toString() || prev.grey_rate,
          mill_rate: latestRates.mill_rate?.toString() || prev.mill_rate,
          schiffli_rate: latestRates.schiffli_rate?.toString() || prev.schiffli_rate,
          dyeing_rate: latestRates.dyeing_rate?.toString() || prev.dyeing_rate,
          shortage_percent: latestShortages.shortage_percent?.toString() || prev.shortage_percent
        }));
      } catch (e) {
        console.error("Failed to load generic Tally rates:", e);
      } finally {
        setTallyRatesLoading(false);
      }
    }
    loadLatestRates();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCalculate = () => {
    setError(null);
    try {
      const calculation = CostingService.calculateCost(path, formData);
      setResult(CostingService.formatResults(calculation));
    } catch (err) {
      setError(err.message);
      setResult(null);
    }
  };

  const handleReset = () => {
    setFormData({
      grey_qty: 100,
      grey_rate: '',
      mill_rate: '',
      schiffli_rate: '',
      deca_rate: '',
      rfd_rate: '',
      digital_rate: '',
      dyeing_rate: '',
      shortage_percent: '',
      dhara_percent: '',
      profit_margin: '',
      transport_cost: '',
    });
    setResult(null);
    setError(null);
  };

  const handleExportExcel = () => {
    if (!result) return;

    const wsData = [
      ['Costing Sheet Export'],
      ['Calculation Path', CostingService.getPathDescription(path)],
      ['Date', new Date().toLocaleDateString()],
      [],
      ['Inputs'],
      ...Object.entries(formData).map(([k, v]) => [k, v]),
      [],
      ['Breakdown'],
      ['Step', 'Details', 'Amount'],
      ...result.breakdown.map(item => [item.step, '', item.amount]),
      [],
      ['Summary'],
      ['Total Cost', result.summary.totalCost],
      ['Final Qty', result.summary.finalQty],
      ['Cost Per Meter', result.summary.costPerMeter]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costing");
    XLSX.writeFile(wb, "Costing_Calculation.xlsx");
  };

  // Paths list
  const paths = [
    { value: 'TRADING', label: 'Trading (Buy & Sell)' },
    { value: 'GREY_ONLY', label: 'Grey Only' },
    { value: 'RFD_ONLY', label: 'RFD Only' },
    { value: 'GREY_RFD_DIGITAL', label: 'Grey -> RFD -> Digital' },
    { value: 'GREY_MILL', label: 'Grey -> Mill' },
    { value: 'GREY_DYED', label: 'Grey -> Dyed' },
    { value: 'GREY_MILL_SCHIFFLI_DECA', label: 'Grey -> Mill -> Schiffli -> Deca' },
    { value: 'GREY_SCHIFFLI_DYED', label: 'Grey -> Schiffli -> Dyed' },
    { value: 'GREY_SCHIFFLI_DECA_WASH', label: 'Grey -> Schiffli -> Deca' },
    { value: 'GREY_SCHIFFLI_RFD_DIGITAL', label: 'Grey -> Schiffli -> RFD -> Digital' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <Helmet><title>Shreerang Costing Calculator</title></Helmet>

      <AdminPageHeader
        title="Costing Engine"
        description="Advanced textile costing calculator for various manufacturing paths."
        breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Costing Calculator' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" /> Parameters
            </CardTitle>
            <CardDescription>
              Select path and enter rates.
              {tallyRatesLoading ? ' Loading Tally rates...' : ' Live rates prefilled from Tally Data Sync.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Calculation Path <span className="text-red-500">*</span></Label>
              <Select value={path} onValueChange={setPath}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Path..." />
                </SelectTrigger>
                <SelectContent>
                  {paths.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grey Qty (Mtr)</Label>
                <Input type="number" name="grey_qty" value={formData.grey_qty} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label>Grey Rate (₹)</Label>
                <Input type="number" name="grey_rate" value={formData.grey_rate} onChange={handleInputChange} placeholder="0.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase">Process Rates (Per Mtr)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" name="mill_rate" value={formData.mill_rate} onChange={handleInputChange} placeholder="Mill Rate" />
                <Input type="number" name="schiffli_rate" value={formData.schiffli_rate} onChange={handleInputChange} placeholder="Schiffli Rate" />
                <Input type="number" name="deca_rate" value={formData.deca_rate} onChange={handleInputChange} placeholder="Deca Rate" />
                <Input type="number" name="rfd_rate" value={formData.rfd_rate} onChange={handleInputChange} placeholder="RFD Rate" />
                <Input type="number" name="digital_rate" value={formData.digital_rate} onChange={handleInputChange} placeholder="Digital Rate" />
                <Input type="number" name="dyeing_rate" value={formData.dyeing_rate} onChange={handleInputChange} placeholder="Dyeing Rate" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase">Adjustments</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Shortage %</Label>
                  <Input type="number" name="shortage_percent" value={formData.shortage_percent} onChange={handleInputChange} placeholder="0%" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dhara/Waste %</Label>
                  <Input type="number" name="dhara_percent" value={formData.dhara_percent} onChange={handleInputChange} placeholder="0%" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transport (₹)</Label>
                  <Input type="number" name="transport_cost" value={formData.transport_cost} onChange={handleInputChange} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Profit Margin %</Label>
                  <Input type="number" name="profit_margin" value={formData.profit_margin} onChange={handleInputChange} placeholder="0%" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleCalculate} disabled={!path}>Calculate</Button>
              <Button variant="outline" onClick={handleReset}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {result ? (
            <Card className="border-green-100 bg-white shadow-md">
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Calculation Results</CardTitle>
                  <CardDescription>{CostingService.getPathDescription(path)}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export Excel
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                    <FileText className="h-4 w-4 text-red-600" /> PDF / Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <CostBreakdownTable breakdown={result.breakdown} summary={result.summary} />
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
              <Calculator className="h-12 w-12 mb-4 opacity-20" />
              <p>Enter parameters and click Calculate to see the cost breakdown.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostingCalculator;