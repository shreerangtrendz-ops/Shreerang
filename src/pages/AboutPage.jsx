import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Award, Users, TrendingUp, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const AboutPage = () => {
  return (
    <>
      <Helmet>
        <title>About Us - Shreerang Trendz</title>
        <meta name="description" content="Learn about Shreerang Trendz Private Limited - your trusted partner for premium fabrics and garments." />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10"></div>
          <img 
            className="absolute inset-0 w-full h-full object-cover"
            alt="Shreerang Trendz company overview"
           src="https://images.unsplash.com/photo-1610891015188-5369212db097" />
          
          <div className="relative z-20 text-center text-white container">
            <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              About Shreerang Trendz
            </h1>
            <p className="text-xl">Excellence in Fabrics Since Inception</p>
          </div>
        </section>

        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                Our Story
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Shreerang Trendz Private Limited has been at the forefront of the textile industry, 
                providing premium quality fabrics and garments to customers across India. Our commitment 
                to excellence, innovation, and customer satisfaction has made us a trusted name in the industry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Quality First</h3>
                <p className="text-gray-600">Premium materials and craftsmanship in every product</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Customer Focus</h3>
                <p className="text-gray-600">Dedicated support for retail and wholesale clients</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Innovation</h3>
                <p className="text-gray-600">Latest trends and designs in the textile industry</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Passion</h3>
                <p className="text-gray-600">Love for textiles drives everything we do</p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-secondary">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Our Mission
                </h2>
                <p className="text-lg text-gray-600 mb-4">
                  To provide the finest quality fabrics and garments while maintaining the highest 
                  standards of customer service and business ethics.
                </p>
                <p className="text-lg text-gray-600">
                  We strive to be the preferred choice for both retail and wholesale customers by 
                  offering competitive pricing, diverse product range, and exceptional service.
                </p>
              </div>
              <div className="aspect-video rounded-lg overflow-hidden">
                <img 
                  className="w-full h-full object-cover"
                  alt="Shreerang Trendz mission and values"
                 src="https://images.unsplash.com/photo-1610891015188-5369212db097" />
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default AboutPage;