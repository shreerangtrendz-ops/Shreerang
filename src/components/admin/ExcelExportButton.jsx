import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, Users, Truck, UserCog, Palette, Layers } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ExportService } from '@/lib/ExportService';
import { SupplierExportService } from '@/services/SupplierExportService';
import { JobWorkerExportService } from '@/services/JobWorkerExportService';
import { SupplierService } from '@/services/SupplierService';
import { JobWorkerService } from '@/services/JobWorkerService';
import { supabase } from '@/lib/customSupabaseClient';

const ExcelExportButton = ({ variant = "outline", size = "default", className }) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type) => {
    setExporting(true);
    try {
      let success = false;
      let count = 0;

      switch(type) {
        case 'base_fabric':
            // Fetch logic could be moved to service, keeping simple here for demo
            const { data: baseData } = await supabase.from('base_fabrics').select('*');
            success = ExportService.exportBaseFabrics(baseData || []);
            count = baseData?.length || 0;
            break;
            
        case 'finish_fabric':
            const { data: finishData } = await supabase.from('finish_fabrics').select('*, base_fabrics(base_fabric_name)');
            success = ExportService.exportFinishFabrics(finishData || []);
            count = finishData?.length || 0;
            break;

        case 'fancy_finish':
            const { data: fancyData } = await supabase.from('fancy_finish_fabrics').select('*, finish_fabrics(finish_fabric_name)');
            success = ExportService.exportFancyFinishFabrics(fancyData || []);
            count = fancyData?.length || 0;
            break;

        case 'suppliers':
            const suppliers = await SupplierService.fetchAll();
            success = SupplierExportService.exportToExcel(suppliers);
            count = suppliers?.length || 0;
            break;

        case 'job_workers':
            const workers = await JobWorkerService.fetchAll();
            success = JobWorkerExportService.exportToExcel(workers);
            count = workers?.length || 0;
            break;
            
        default:
            throw new Error("Unknown export type");
      }

      if (success) {
        toast({
          title: "Export Successful",
          description: `Successfully exported ${count} records.`,
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error generating the Excel file.",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={exporting} className={className}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export Data"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Data to Export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Fabric Master</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport('base_fabric')}>
          <Layers className="mr-2 h-4 w-4" /> Base Fabrics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('finish_fabric')}>
          <Palette className="mr-2 h-4 w-4" /> Finish Fabrics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('fancy_finish')}>
          <Users className="mr-2 h-4 w-4" /> Fancy Finish Fabrics
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">People</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => handleExport('suppliers')}>
          <Truck className="mr-2 h-4 w-4" /> Suppliers
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('job_workers')}>
          <UserCog className="mr-2 h-4 w-4" /> Job Workers
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('designs')} disabled>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Design Catalog (Coming Soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExcelExportButton;