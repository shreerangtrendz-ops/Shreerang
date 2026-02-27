import React, { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Printer, RotateCcw, Info, ChevronDown, ChevronRight } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calcHakobaBatch, calcSellingPrice, round } from '@/logic/ShreerangEngine';

// ─── PATH DEFINITIONS ─────────────────────────────────────────────────────────
const COSTING_PATHS = [
  {
    id: 'grey_schiffli_deca',
    label: 'Grey → Schiffli → Deca/Wash',
    description: 'Most common Hakoba path — raw grey to Schiffli unit, then Deca/Washing.',
    hasPreProcess: false,
    hasPostProcess: false,
    hasDeca: true,
  },
  {
    id: 'grey_dyed_schiffli_deca',
    label: 'Grey → Dyed → Schiffli → Deca',
    description: 'Grey is dyed first, then goes to Schiffli, then Deca/Washing.',
    hasPreProcess: true,
    preLabel: 'Dyeing',
    hasPostProcess: false,
    hasDeca: true,
  },
  {
    id: 'grey_schiffli_dyed',
    label: 'Grey → Schiffli → Dyed/Mill Print',
    description: 'Grey goes to Schiffli first, then gets dyed or printed afterwards.',
    hasPreProcess: false,
    hasPostProcess: true,
    postLabel: 'Dyeing / Mill Print',
    hasDeca: false,
  },
  {
    id: 'grey_rfd_schiffli_digital',
    label: 'Grey → RFD → Schiffli → Digital',
    description: 'Grey is RFD-processed, Schiffli embroidered, then digital printed.',
    hasPreProcess: true,
    preLabel: 'RFD',
    hasPostProcess: true,
    postLabel: 'Digital Print',
    hasDeca: false,
  },
  {
    id: 'grey_schiffli_deca_digital',
    label: 'Grey → Schiffli → Deca → Digital',
    description: 'Schiffli on grey, then Deca/Washing, then Digital print.',
    hasPreProcess: false,
    hasPostProcess: true,
    postLabel: 'Digital Print',
    hasDeca: true,
  },
];

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_INPUTS = {
  greyQty:              100,
  greyRate:             30,
  buyingCommPct:        1.5,
  pieceLengthMtr:       21.25,
  billMtrPerPiece:      20.25,
  schiffliJobRate:      40,
  decaMtrPerPiece:      20.0,
  decaRate:             1.50,
  hasSequins:           false,
  // Pre-process
  preProcessRate:       6,
  preProcessShortPct:   7,
  // Post-process
  postProcessRate:      28,
  postProcessShortPct:  4,
  postProcessOutputMtr: '',
  // Pricing
  profitMarginPct:      15,
  dharaPct:             7,
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const HakobaCostSheet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fabricName = location.state?.fabricName || '';

  const [pathId,     setPathId]     = useState('grey_schiffli_deca');
  const [dyeingType, setDyeingType] = useState('mono');
  const [inputs,     setInputs]     = useState(DEFAULT_INPUTS);
  const [showInfo,   setShowInfo]   = useState(true);

  const selectedPath = COSTING_PATHS.find(p => p.id === pathId);

  // ── Derived: effective deca rate for contrast ──────────────────────────────
  const effectiveDyeingRate =
    dyeingType === 'contrast'
      ? (inputs.preProcessRate || 12) + 8   // +₹8 for contrast/double dye
      : inputs.preProcessRate;

  // ── Run engine ────────────────────────────────────────────────────────────
  const result = calcHakobaBatch({
    greyQty:            inputs.greyQty,
    greyRate:           inputs.greyRate,
    buyingCommPct:      inputs.buyingCommPct,
    path:               pathId,
    pieceLengthMtr:     inputs.pieceLengthMtr,
    billMtrPerPiece:    inputs.billMtrPerPiece,
    schiffliJobRate:    inputs.schiffliJobRate,
    decaMtrPerPiece:    inputs.decaMtrPerPiece,
    decaRate:           inputs.decaRate,
    hasSequins:         inputs.hasSequins,
    preProcessRate:     selectedPath?.hasPreProcess ? effectiveDyeingRate : 0,
    preProcessShortPct: inputs.preProcessShortPct,
    postProcessRate:    selectedPath?.hasPostProcess ? inputs.postProcessRate : 0,
    postProcessShortPct: inputs.postProcessShortPct,
    postProcessOutputMtr: inputs.postProcessOutputMtr || undefined,
  });

  const pricing = calcSellingPrice(
    result.summary.costPerMtr,
    inputs.profitMarginPct,
    inputs.dharaPct
  );

  const handleChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: field === 'hasSequins' ? value : (parseFloat(value) || 0),
    }));
  };

  const handleReset = () => setInputs(DEFAULT_INPUTS);

  const fmt  = (v) => `₹${(+v || 0).toFixed(2)}`;
  const fmtQ = (v) => `${(+v || 0).toFixed(2)} mtr`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28">
      <Helmet><title>Hakoba / Schiffli Cost Sheet</title></Helmet>
      <AdminPageHeader
        title="Hakoba / Schiffli Cost Sheet"
        breadcrumbs={[{ label: 'Costing', href: '/admin/costing' }, { label: 'Hakoba Cost' }]}
        onBack={() => navigate(-1)}
      />

      {fabricName && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Fabric: {fabricName}</AlertTitle>
        </Alert>
      )}

      {/* ── PATH SELECTOR ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 1 — Select Costing Path</CardTitle>
          <p className="text-sm text-muted-foreground">Choose how the fabric moves through processes.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COSTING_PATHS.map(path => (
            <button
              key={path.id}
              onClick={() => setPathId(path.id)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                pathId === path.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <p className={`font-semibold text-sm ${pathId === path.id ? 'text-blue-800' : 'text-slate-700'}`}>
                {path.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{path.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── INPUT PANEL ──────────────────────────────────────────────── */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Step 2 — Enter Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Grey */}
            <Section label="Grey Fabric">
              <Field label="Grey Qty (mtr)" field="greyQty" inputs={inputs} onChange={handleChange} />
              <Field label="Grey Rate (₹/mtr)" field="greyRate" inputs={inputs} onChange={handleChange} />
              <Field label="Buying Comm + Transport (%)" field="buyingCommPct" inputs={inputs} onChange={handleChange} step="0.1" />
            </Section>

            {/* Pre-process */}
            {selectedPath?.hasPreProcess && (
              <Section label={selectedPath.preLabel + ' Charge (Pre-Schiffli)'}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-muted-foreground">Dyeing Type:</span>
                  <RadioGroup value={dyeingType} onValueChange={setDyeingType} className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="mono" id="mono" />
                      <Label htmlFor="mono" className="text-xs cursor-pointer">Mono</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="contrast" id="contrast" />
                      <Label htmlFor="contrast" className="text-xs cursor-pointer">Contrast (+₹8)</Label>
                    </div>
                  </RadioGroup>
                </div>
                <Field label={`${selectedPath.preLabel} Rate (₹/mtr)`} field="preProcessRate" inputs={inputs} onChange={handleChange}
                  displayValue={effectiveDyeingRate}
                  readOnly={dyeingType === 'contrast'}
                />
                <Field label="Shortage (%)" field="preProcessShortPct" inputs={inputs} onChange={handleChange} />
              </Section>
            )}

            {/* Schiffli */}
            <Section label="Schiffli">
              <Field label="Piece Length (mtr)" field="pieceLengthMtr" inputs={inputs} onChange={handleChange} step="0.25" />
              <Field label="Bill Mtr / Piece" field="billMtrPerPiece" inputs={inputs} onChange={handleChange} step="0.25" />
              <Field label="Schiffli Job Rate (₹/bill mtr)" field="schiffliJobRate" inputs={inputs} onChange={handleChange} />
            </Section>

            {/* Deca */}
            {selectedPath?.hasDeca && (
              <Section label="Deca / Washing">
                <Field label="Deca Mtr / Piece" field="decaMtrPerPiece" inputs={inputs} onChange={handleChange} step="0.25" />
                <Field label="Deca Rate (₹/mtr)" field="decaRate" inputs={inputs} onChange={handleChange} step="0.5" />
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="sequins"
                    checked={inputs.hasSequins}
                    onChange={e => setInputs(prev => ({ ...prev, hasSequins: e.target.checked }))}
                    className="h-4 w-4 cursor-pointer"
                  />
                  <Label htmlFor="sequins" className="text-xs cursor-pointer">
                    Clear Sequins (+₹5 deca)
                  </Label>
                </div>
              </Section>
            )}

            {/* Post-process */}
            {selectedPath?.hasPostProcess && (
              <Section label={selectedPath.postLabel + ' Charge (Post-Schiffli)'}>
                <Field label="Rate (₹/mtr on output)" field="postProcessRate" inputs={inputs} onChange={handleChange} />
                <Field label="Shortage (%)" field="postProcessShortPct" inputs={inputs} onChange={handleChange} />
                <div className="space-y-1">
                  <Label className="text-xs">Output Mtr (if known)</Label>
                  <Input
                    type="number"
                    className="h-8 bg-blue-50 border-blue-200 text-right text-sm"
                    value={inputs.postProcessOutputMtr}
                    placeholder="Leave blank to auto-calc"
                    onChange={e => setInputs(prev => ({ ...prev, postProcessOutputMtr: e.target.value }))}
                  />
                </div>
              </Section>
            )}

            {/* Pricing */}
            <Section label="Pricing">
              <Field label="Profit Margin (%)" field="profitMarginPct" inputs={inputs} onChange={handleChange} />
              <Field label="Dhara / Deductions (%)" field="dharaPct" inputs={inputs} onChange={handleChange}
                tooltip="Cash Discount (5%) + Sales Broker (2%) = 7%" />
            </Section>

          </CardContent>
        </Card>

        {/* ── CALCULATION PANEL ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Step-by-step breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Step 3 — Calculation Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">Path: <strong>{selectedPath?.label}</strong></p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-8 text-xs">#</TableHead>
                    <TableHead className="text-xs">Particulars</TableHead>
                    <TableHead className="text-right text-xs">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.steps.map((step, i) => (
                    <TableRow key={step.id}>
                      <TableCell className="text-xs font-bold text-slate-500">{i + 1}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.formula}</p>
                        {step.id === 'schiffli_pieces' && (
                          <div className="mt-1 flex gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">Complete pcs: {step.completePcs}</Badge>
                            <Badge variant="outline" className="text-xs">Waste: {step.incompleteMtr} mtr</Badge>
                            <Badge variant="outline" className="text-xs">Sent: {step.totalMtrSent} mtr</Badge>
                          </div>
                        )}
                        {step.id === 'schiffli_charge' && (
                          <p className="text-xs text-blue-600 mt-0.5">Bill mtr = {step.billMtr} mtr</p>
                        )}
                        {step.id === 'deca' && (
                          <p className="text-xs text-amber-600 mt-0.5">Deca mtr = {step.decaMtr} mtr</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {step.amount !== null ? fmt(step.amount) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals */}
                  <TableRow className="bg-slate-100 border-t-2">
                    <TableCell colSpan={2} className="font-bold text-sm">
                      Total Batch Cost
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        (finish: {fmtQ(result.summary.finishMtr)}, yield: {result.summary.yieldPct}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{fmt(result.summary.totalCost)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={2} className="font-bold text-blue-800 text-sm">
                      Factory Cost Per Metre
                      <span className="text-xs font-normal ml-2">Total ÷ {fmtQ(result.summary.finishMtr)}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-800 text-lg">
                      {fmt(result.summary.costPerMtr)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} className="text-sm">
                      Add: Profit ({inputs.profitMarginPct}%)
                    </TableCell>
                    <TableCell className="text-right">{fmt(pricing.withMargin)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50 border-t-2 border-green-200">
                    <TableCell colSpan={2} className="font-bold text-green-800 text-sm">
                      FINAL SELLING PRICE
                      <span className="text-xs font-normal ml-2">÷ (1 − {inputs.dharaPct}% Dhara)</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700 text-2xl">
                      {fmt(pricing.finalPrice)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Dyeing comparison info */}
          {selectedPath?.hasPreProcess && (
            <Card>
              <CardHeader
                className="pb-2 cursor-pointer flex flex-row items-center justify-between"
                onClick={() => setShowInfo(v => !v)}
              >
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Dyeing Type Reference
                </CardTitle>
                {showInfo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardHeader>
              {showInfo && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs">Requirement</TableHead>
                        <TableHead className="text-xs text-blue-700">Mono (Tone-on-Tone)</TableHead>
                        <TableHead className="text-xs text-purple-700">Contrast (Two-Tone)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ['Visual Look', 'Thread and Fabric same color', 'Thread different color / White'],
                        ['Chemistry', 'Fiber Match — same material', 'Fiber Mismatch — different materials'],
                        ['Example', 'Cotton Thread on Cotton Fabric', 'Polyester Thread on Cotton Fabric'],
                        ['Process', 'Single Dyeing (1 Bath)', 'Double Dyeing (2 Baths) / Resist'],
                        ['Rate (Light)', '₹10/mtr', '₹18-20/mtr'],
                        ['Rate (Dark)', '₹12/mtr', '₹18-20/mtr'],
                      ].map(([req, mono, contrast]) => (
                        <TableRow key={req}>
                          <TableCell className="text-xs font-medium">{req}</TableCell>
                          <TableCell className="text-xs">{mono}</TableCell>
                          <TableCell className="text-xs">{contrast}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          )}

        </div>
      </div>

      {/* ── ACTION BAR ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-3 lg:pl-64 z-40">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
        <Button>
          <Save className="h-4 w-4 mr-2" /> Save Cost Sheet
        </Button>
      </div>
    </div>
  );
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
const Section = ({ label, children }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">{label}</p>
    {children}
    <Separator />
  </div>
);

const Field = ({ label, field, inputs, onChange, step = '1', displayValue, readOnly = false, tooltip }) => (
  <div className="space-y-0.5">
    <Label className="text-xs text-slate-600">{label}{tooltip && <span className="ml-1 text-muted-foreground cursor-help" title={tooltip}>ⓘ</span>}</Label>
    <Input
      type="number"
      step={step}
      className={`h-8 text-right text-sm ${readOnly ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 border-blue-200'}`}
      value={displayValue !== undefined ? displayValue : inputs[field]}
      readOnly={readOnly}
      onChange={e => !readOnly && onChange(field, e.target.value)}
    />
  </div>
);

export default HakobaCostSheet;
