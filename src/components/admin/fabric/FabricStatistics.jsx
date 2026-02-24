import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Star, CheckCircle, XCircle } from 'lucide-react';

const StatCard = ({ title, count, icon: Icon, colorClass, bgClass }) => (
    <Card>
        <CardContent className="p-4 flex items-center justify-between">
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
                <h3 className="text-2xl font-bold mt-1">{count}</h3>
            </div>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bgClass} ${colorClass}`}>
                <Icon className="h-5 w-5" />
            </div>
        </CardContent>
    </Card>
);

const FabricStatistics = ({ data = [] }) => {
    const total = data.length;
    const starred = data.filter(d => d.is_starred).length;
    const active = data.filter(d => d.status === 'active').length;
    const inactive = total - active;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard 
                title="Total Fabrics" 
                count={total} 
                icon={Layers} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-50" 
            />
            <StatCard 
                title="Starred" 
                count={starred} 
                icon={Star} 
                colorClass="text-yellow-600" 
                bgClass="bg-yellow-50" 
            />
            <StatCard 
                title="Active" 
                count={active} 
                icon={CheckCircle} 
                colorClass="text-green-600" 
                bgClass="bg-green-50" 
            />
            <StatCard 
                title="Inactive" 
                count={inactive} 
                icon={XCircle} 
                colorClass="text-slate-600" 
                bgClass="bg-slate-50" 
            />
        </div>
    );
};

export default FabricStatistics;