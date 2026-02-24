import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQPage = () => {
  return (
    <div className="container py-12 px-4 md:px-6 max-w-3xl mx-auto">
      <Helmet><title>FAQ | Shreerang Trendz</title></Helmet>
      <h1 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h1>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>What is the minimum order quantity?</AccordionTrigger>
          <AccordionContent>
            Our standard MOQ for wholesale orders is 100 meters per design. For sample orders, please contact our sales team.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Do you offer international shipping?</AccordionTrigger>
          <AccordionContent>
            Yes, we ship globally. Shipping costs are calculated based on weight and destination.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Can I get custom designs printed?</AccordionTrigger>
          <AccordionContent>
            Absolutely! We specialize in custom digital printing. You can upload your designs or work with our design team.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
          <AccordionContent>
            We accept Bank Transfer (NEFT/RTGS), Cheque, and Cash on Delivery (with advance payment).
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FAQPage;