import React from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { HelpCircle, FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const GuidelinesFooter = ({ guidelines, relatedLinks = [] }) => {
  return (
    <div className="mt-12 border-t pt-8 pb-12 bg-slate-50/50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-slate-900">How to use this feature</h3>
      </div>

      <Accordion type="single" collapsible className="w-full bg-white rounded-md border shadow-sm">
        <AccordionItem value="instructions">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Step-by-Step Instructions
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 text-sm text-slate-600">
               {guidelines.map((step, idx) => (
                 <div key={idx} className="flex gap-3">
                   <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                     {idx + 1}
                   </div>
                   <div className="pt-0.5">
                     <p className="font-medium text-slate-900 mb-1">{step.title}</p>
                     <p>{step.description}</p>
                   </div>
                 </div>
               ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="faq">
            <AccordionTrigger className="px-4 hover:no-underline">
                 <span className="text-sm font-medium">Common Questions & Troubleshooting</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li><strong>File Upload Fails?</strong> Check if file size is under 10MB and format is correct (.csv or .xlsx).</li>
                    <li><strong>Data not showing?</strong> Refresh the page after 1 minute. Large operations are processed in background.</li>
                    <li><strong>Errors in rows?</strong> Download the error report, fix the specific rows in Excel, and re-upload ONLY those rows.</li>
                </ul>
            </AccordionContent>
        </AccordionItem>
      </Accordion>

      {relatedLinks.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-4">
              <span className="text-sm font-medium text-slate-500 py-2">Quick Links:</span>
              {relatedLinks.map((link, idx) => (
                  <Button key={idx} variant="outline" size="sm" asChild className="gap-2">
                      <Link to={link.path}>
                          {link.label}
                          <ExternalLink className="h-3 w-3" />
                      </Link>
                  </Button>
              ))}
          </div>
      )}
      
      <div className="mt-6 text-center">
        <Button variant="link" asChild className="text-slate-500">
            <Link to="/admin/guidelines">View Complete User Manual</Link>
        </Button>
      </div>
    </div>
  );
};

export default GuidelinesFooter;