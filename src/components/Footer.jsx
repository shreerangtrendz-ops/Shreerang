import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const Footer = () => {
  return <footer className="bg-gray-900 text-white border-t border-gray-800">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="block">
              <span className="text-2xl font-bold text-white" style={{
              fontFamily: 'Playfair Display, serif'
            }}>Shree Rang Trendz Pvt Ltd</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Leading manufacturer and wholesaler of premium fabrics and garments. Committed to quality, innovation, and sustainable fashion since 2010.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/shop" className="hover:text-primary transition-colors">Shop Collection</Link></li>
              <li><Link to="/wholesale" className="hover:text-primary transition-colors">Wholesale Portal</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">Our Story</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Returns & Exchanges</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Contact Us</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>4081-4084, Millennium 4 Textile Market, Surat, India - 395002</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span>+91 75678 60000,                                                   +91 75678 70000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span>shreerangtrendz@gmail.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <span>Mon - Sat: 10:00 AM - 7:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-4">Subscribe to our newsletter for new arrivals and exclusive wholesale offers.</p>
            <form className="space-y-3" onSubmit={e => e.preventDefault()}>
              <Input type="email" placeholder="Your email address" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-primary" />
              <Button className="w-full">Subscribe</Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; 2025 Shree Rang Trendz Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <span>GST: 24AAUCS2915F1Z8</span>
            <span>CIN: U17299GJ2021PTC123456</span>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;