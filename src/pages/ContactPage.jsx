import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, CalendarPlus, Building, Briefcase, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppointmentForm from '@/components/AppointmentForm';

const InfoCard = ({ icon, title, children, className }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className={`bg-white p-6 rounded-lg shadow-md flex ${className}`}
    >
        <div className="flex-shrink-0 mr-4">
            <div className="bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center">
                {icon}
            </div>
        </div>
        <div>
            <h3 className="font-bold text-xl mb-1">{title}</h3>
            <div className="text-gray-600 space-y-1">{children}</div>
        </div>
    </motion.div>
);

const ContactPage = () => {
    const { toast } = useToast();
    const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);

    const handleContactSubmit = (e) => {
        e.preventDefault();
        toast({
            title: "🚧 Message Sent!",
            description: "Thank you for reaching out. We will get back to you shortly.",
        });
        e.target.reset();
    };

    return (
        <>
            <Helmet>
                <title>Contact Us - ShreeRang Trendz Private Limited</title>
                <meta name="description" content="Get in touch with ShreeRang Trendz for inquiries, support, or wholesale opportunities. Visit our Corporate or Sales office, call us, or send us an email." />
            </Helmet>

            <div className="min-h-screen bg-gray-50">
                <Navbar />

                <section className="py-16 bg-secondary">
                    <div className="container text-center">
                        <motion.h1 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-4xl md:text-5xl font-bold mb-4"
                        >
                            Contact Us
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-lg text-gray-600 max-w-3xl mx-auto"
                        >
                            We're here to help and eager to hear from you. Whether you have a question about our products, need assistance, or want to explore a partnership, you can reach us through the channels below.
                        </motion.p>
                    </div>
                </section>

                <section className="py-20">
                    <div className="container grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            <InfoCard icon={<Building size={24} />} title="Corporate Office">
                                <p>4081-4084, 4th Floor, Millennium 4 Textile Market, Near Siddhi Vinayak Temple, Bhathena, Udhna, Surat-395002</p>
                            </InfoCard>
                            <InfoCard icon={<Briefcase size={24} />} title="Sales Office">
                                <p>A-1070-1071, Globale Textile Market, Opp. New Bombay Market, Sahara Darwaja, Surat-395002</p>
                            </InfoCard>
                            <InfoCard icon={<Phone size={24} />} title="Contact Numbers">
                                <p>Shrinandan Maru: <a href="tel:7567860000" className="text-primary hover:underline">7567860000</a></p>
                                <p>Shrikumar Maru: <a href="tel:7567870000" className="text-primary hover:underline">7567870000</a></p>
                            </InfoCard>
                             <InfoCard icon={<Mail size={24} />} title="Email Address">
                                <p><a href="mailto:shreerangtrendz@gmail.com" className="text-primary hover:underline">shreerangtrendz@gmail.com</a></p>
                            </InfoCard>
                            <InfoCard icon={<Info size={24} />} title="Company Information">
                                <p><span className="font-semibold">Company:</span> ShreeRang Trendz Private Limited</p>
                                <p><span className="font-semibold">GST No:</span> 24AAUCS2915F1Z8</p>
                            </InfoCard>
                        </div>
                        <div className="bg-white p-8 rounded-lg shadow-lg">
                             <h2 className="text-3xl font-bold mb-6 text-center">Send Us a Message</h2>
                            <form onSubmit={handleContactSubmit} className="space-y-4">
                                <Input name="name" placeholder="Your Name" required />
                                <Input name="email" type="email" placeholder="Your Email" required />
                                <Input name="phone" type="tel" placeholder="Your Phone Number" required />
                                <Input name="subject" placeholder="Subject" required />
                                <Textarea name="message" placeholder="Your Message" rows={5} required />
                                <Button type="submit" className="w-full">Send Message</Button>
                            </form>
                        </div>
                    </div>
                </section>

                <section className="pb-20">
                    <div className="container text-center">
                         <h2 className="text-3xl font-bold mb-4">Visit Our Showroom</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                            Experience our fabrics and garments firsthand. Book a personalized appointment to visit our showroom at your convenience.
                        </p>
                        <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
                            <DialogTrigger asChild>
                                 <Button size="lg" className="text-lg">
                                    <CalendarPlus className="mr-2 h-5 w-5" /> Book an Appointment
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl">Book a Showroom Visit</DialogTitle>
                                </DialogHeader>
                                <AppointmentForm setDialogOpen={setIsAppointmentDialogOpen} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </section>
                
                <Footer />
            </div>
        </>
    );
};

export default ContactPage;