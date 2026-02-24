import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const DesignCard = ({ design }) => {
  const image = design.image_url || '/placeholder.jpg';
  
  return (
    <Link to={`/designs/${design.id}`} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 block">
      <img 
        src={image} 
        alt={design.design_number} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
         <span className="font-bold text-lg">{design.design_number}</span>
         <span className="text-sm opacity-80 mt-1">View Details <ArrowUpRight className="inline h-3 w-3" /></span>
      </div>
    </Link>
  );
};

export default DesignCard;