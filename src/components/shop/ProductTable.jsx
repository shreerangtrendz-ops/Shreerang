import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { motion } from 'framer-motion';

const ProductTable = ({ products }) => {
  const { profile } = useUserProfile();
  const isWholesale = profile?.role === 'wholesale_customer' && profile?.is_approved;

  const processedProducts = useMemo(() => {
    if (!isWholesale || !profile?.pricing_tier) return products;

    return products.map(p => {
      const tierDiscount = profile.pricing_tier.discount_percentage || 0;
      const finalPrice = p.wholesale_price * (1 - tierDiscount / 100);
      return { ...p, final_price: finalPrice.toFixed(2) };
    });
  }, [products, isWholesale, profile]);

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No products match your criteria.</p>
        <p className="text-sm text-gray-500 mt-2">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Image</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design No.</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Width</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {processedProducts.map((product, index) => (
            <motion.tr 
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-gray-50"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <Link to={`/product/${product.slug}`}>
                  <img src="https://images.unsplash.com/photo-1633566096020-6d1107368d79" alt={product.name} className="h-16 w-16 object-cover rounded-md" />
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link to={`/product/${product.slug}`} className="text-sm font-medium text-gray-900 hover:text-primary">{product.name}</Link>
                <div className="text-sm text-gray-500">{product.categories?.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.specifications?.width ? `${product.specifications.width}"` : 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {isWholesale ? (
                    <div>
                        <p className="text-primary">₹{product.final_price}</p>
                        <p className="text-gray-500 line-through text-xs">₹{product.retail_price}</p>
                    </div>
                ) : (
                    <p className="text-gray-900">₹{product.retail_price}</p>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;