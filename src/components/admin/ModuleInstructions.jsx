import React from 'react';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const INSTRUCTIONS = {
  orders: "Select customer, click + to add new if needed, fill all required fields marked with *. Validation is active.",
  customers: "Add/edit active customer details. Supported formats for documents: JPG/PNG/PDF. Ensure GSTIN is valid.",
  stock: "Update stock quantities carefully. Changes are logged. Use Bulk Upload for large inventory updates.",
  design_upload: "Supported formats: JPG/PNG/PDF (max 10MB). Use Google Drive tab for heavy assets.",
  media_library: "Recommended formats: JPG/PNG/WEBP for web optimization. High-resolution images recommended.",
  bulk_upload: "Supported formats: CSV/XLSX. Always download and check the sample template before uploading.",
  appointments: "Schedule and confirm customer visits. Check calendar availability before confirming.",
  price_approval: "Review price change requests. Ensure compliance with minimum margin policy before approval.",
  analytics: "Use date filters to refine reports. Export to PDF/Excel for offline meetings.",
  despatch: "Update shipping status and tracking numbers. Verify package contents before marking as despatched.",
  team: "Manage staff roles and access. Only Admins can add or remove team members.",
  logs: "System-wide audit trail. Filter by actor or action type to find specific events."
};

const ModuleInstructions = ({ module }) => {
  const text = INSTRUCTIONS[module];

  if (!text) return null;

  return (
    <div className="mt-8 animate-in slide-in-from-bottom-2">
      <Alert className="bg-blue-50 border-blue-100 text-blue-900">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle>Staff Instructions</AlertTitle>
        <AlertDescription className="text-sm opacity-90">
          {text}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ModuleInstructions;