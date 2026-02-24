import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ShopSort = ({ activeFilters, updateFilters }) => {
  return (
    <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Sort by:</span>
        <Select value={activeFilters.sort} onValueChange={(value) => updateFilters('sort', value)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="best-sellers">Best Sellers</SelectItem>
            </SelectContent>
        </Select>
    </div>
  );
};

export default ShopSort;