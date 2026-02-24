import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const CostBreakdownTable = ({ breakdown, summary }) => {
  if (!breakdown || breakdown.length === 0) {
    return <div className="text-center p-4 text-slate-500">No calculation data available.</div>;
  }

  // Calculate running total for visual clarity
  let runningTotal = 0;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Cost Component / Step</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Running Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.map((item, index) => {
              if (item.amount) runningTotal += item.amount;
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.step}</TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {item.qty && `Qty: ${item.qty.toFixed(2)}`}
                    {item.rate && ` @ ${item.rate}`}
                    {item.shortagePercent && `Shortage: ${item.shortagePercent}%`}
                    {item.netQty && ` | Net Qty: ${item.netQty.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.amount ? `₹${item.amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-400">
                    ₹{runningTotal.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Final Quantity</p>
            <p className="text-2xl font-bold text-blue-800">{summary.finalQty} mtr</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
             <p className="text-sm text-indigo-600 font-medium">Total Batch Cost</p>
             <p className="text-2xl font-bold text-indigo-800">₹{summary.totalCost}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
             <p className="text-sm text-green-600 font-medium">Final Cost Per Meter</p>
             <p className="text-2xl font-bold text-green-800">₹{summary.costPerMeter}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostBreakdownTable;