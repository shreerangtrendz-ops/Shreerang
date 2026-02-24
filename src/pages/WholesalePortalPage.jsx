import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, FileText, TrendingUp, Truck, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const WholesalePortalPage = () => {
  return (
    <>
      <Helmet>
        <title>Wholesale Partner Program | Shreerang Trendz</title>
        <meta name="description" content="Join our wholesale program for exclusive pricing, bulk discounts, and premium fabric supply for retailers and designers." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />

        {/* Hero Section */}
        <section className="bg-gray-900 text-white py-20">
          <div className="container text-center max-w-4xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold mb-6" 
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Partner With Us
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-300 mb-8"
            >
              Get direct access to premium fabrics at factory prices. Tailored solutions for retailers, boutiques, and garment manufacturers.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center gap-4"
            >
              <Link to="/bulk-enquiry">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100">Request Wholesale Quote</Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Download className="mr-2 h-4 w-4" /> Download Catalog
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Shreerang Trendz?</h2>
            <p className="text-muted-foreground">We provide end-to-end support for your textile business.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Tiered Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Unlock deeper discounts as your volume increases. Our transparent 3-tier pricing structure ensures you always get the best value.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Truck className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Priority Logistics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Fast-tracked shipping for wholesale orders. We partner with top logistics providers to ensure on-time delivery across India.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Dedicated Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">A dedicated account manager will assist you with order planning, sample requests, and custom requirements.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* MOQ & Policy Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Ordering Policy</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-primary/10 p-3 rounded-full h-fit">
                      <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Minimum Order Quantity (MOQ)</h3>
                      <p className="text-gray-600">Standard MOQ is 5 units/meters per SKU. For custom prints or dyes, MOQ starts at 100 meters.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-primary/10 p-3 rounded-full h-fit">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Sample Policy</h3>
                      <p className="text-gray-600">We offer paid sample kits (swatches) deductible from your first bulk order above ₹50,000.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-primary/10 p-3 rounded-full h-fit">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Lead Times</h3>
                      <p className="text-gray-600">Ready stock ships in 24-48 hours. Custom production orders typically take 7-14 business days.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 p-8 rounded-xl border text-center">
                <h3 className="text-2xl font-bold mb-6">Ready to start?</h3>
                <p className="text-gray-600 mb-8">Create a wholesale account today to view restricted pricing and place orders directly.</p>
                <Link to="/register?type=wholesaler">
                  <Button size="lg" className="w-full mb-4">Create Wholesale Account</Button>
                </Link>
                <p className="text-sm text-muted-foreground">Already registered? <Link to="/login" className="text-primary underline">Login here</Link></p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default WholesalePortalPage;