import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FIBER_CODES, GREIGE_WIDTHS, FINISH_WIDTHS, CONSTRUCTION_CODES, 
  PROCESS_CODES, CLASS_CODES, TAG_CODES, VA_CODES, CONCEPT_CODES, 
  PLACEMENT_CODES 
} from '@/lib/fabricMasterReferences';

const TableWrapper = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card className="rounded-xl shadow-sm mb-4 border border-slate-200">
      <CardHeader className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex flex-row items-center justify-between" onClick={() => setIsOpen(!isOpen)}>
        <CardTitle className="text-sm font-bold text-slate-800">{title}</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Button>
      </CardHeader>
      {isOpen && <CardContent className="p-4 pt-0">{children}</CardContent>}
    </Card>
  );
};

const SimpleGrid = ({ data, columns = 2 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-2`}>
    {Object.entries(data).map(([key, val], i) => (
      <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
        <span className="font-medium text-slate-700">{key}</span>
        <span className="font-mono text-xs bg-slate-200 px-2 py-1 rounded text-slate-800">{val || '(omit)'}</span>
      </div>
    ))}
  </div>
);

export const FiberCodesTable = () => (
  <TableWrapper title="BASE FIBER CODES" defaultOpen={true}>
    <SimpleGrid data={FIBER_CODES} columns={3} />
  </TableWrapper>
);

export const WidthOptionsTable = () => (
  <TableWrapper title="WIDTH OPTIONS">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-xs font-bold mb-2 text-slate-500">GREIGE WIDTHS</h4>
        <div className="flex flex-wrap gap-2">
          {GREIGE_WIDTHS.map(w => <span key={w} className="px-2 py-1 bg-slate-100 rounded text-xs">{w}</span>)}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-bold mb-2 text-slate-500">FINISH WIDTHS</h4>
        <div className="flex flex-wrap gap-2">
          {FINISH_WIDTHS.map(w => <span key={w} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{w}</span>)}
        </div>
      </div>
    </div>
  </TableWrapper>
);

export const ConstructionCodesTable = () => (
  <TableWrapper title="CONSTRUCTION CODES">
    <SimpleGrid data={CONSTRUCTION_CODES} columns={3} />
  </TableWrapper>
);

export const ProcessCodesTable = () => (
  <TableWrapper title="PROCESS CODES">
    <SimpleGrid data={PROCESS_CODES} columns={3} />
  </TableWrapper>
);

export const ClassTagsCodesTable = () => (
  <TableWrapper title="CLASS & TAG CODES">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-xs font-bold mb-2 text-slate-500">CLASS CODES</h4>
        <SimpleGrid data={CLASS_CODES} columns={1} />
      </div>
      <div>
        <h4 className="text-xs font-bold mb-2 text-slate-500">TAG CODES</h4>
        <SimpleGrid data={TAG_CODES} columns={1} />
      </div>
    </div>
  </TableWrapper>
);

export const ValueAdditionCodesTable = () => (
  <TableWrapper title="VALUE ADDITION (VA) & CONCEPTS">
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-bold mb-2 text-slate-500">VA TYPES</h4>
        <SimpleGrid data={VA_CODES} columns={3} />
      </div>
      <div>
        <h4 className="text-xs font-bold mb-2 text-slate-500">CONCEPTS</h4>
        <SimpleGrid data={CONCEPT_CODES} columns={3} />
      </div>
      <div>
        <h4 className="text-xs font-bold mb-2 text-slate-500">PLACEMENTS</h4>
        <SimpleGrid data={PLACEMENT_CODES} columns={4} />
      </div>
    </div>
  </TableWrapper>
);

export const ReferenceTables = () => (
  <div className="space-y-2">
    <FiberCodesTable />
    <WidthOptionsTable />
    <ConstructionCodesTable />
    <ProcessCodesTable />
    <ClassTagsCodesTable />
    <ValueAdditionCodesTable />
  </div>
);