import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FabricSpecificationForm from '@/components/admin/fabric/FabricSpecificationForm';
import { FabricService } from '@/services/FabricService';
import { useToast } from '@/components/ui/use-toast';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const FabricSpecificationFormPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      // Prepare full yarn count string
      const fullYarnCount = formData.yarn_count ? `${formData.yarn_count}${formData.yarn_count_unit}` : '';
      
      const payload = {
        ...formData,
        yarn_count: fullYarnCount,
        status: 'active' // Default status
      };
      
      // Remove temporary UI fields if any
      delete payload.yarn_count_unit;
      delete payload.fabric_name; // Assuming fabric_name is merged into base_fabric_name or used if we have a col for it (we don't strictly have one in base_fabrics schema, usually aliases or description). 
      // If schema supports 'alias_names', we could push it there, but for now base_fabric_name is the key.
      
      await FabricService.createFabric(payload);
      
      toast({
        title: "Success",
        description: "Fabric Specification created successfully.",
      });
      navigate('/admin/fabric-master');
    } catch (error) {
      console.error("Error creating fabric:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create fabric specification. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormErrorBoundary>
      <div className="p-6 max-w-[1600px] mx-auto pb-20">
        <Helmet><title>New Fabric Specification</title></Helmet>
        
        <AdminPageHeader 
          title="Create Fabric Specification" 
          breadcrumbs={[
            { label: 'Fabric Master', href: '/admin/fabric-master' },
            { label: 'New Specification' }
          ]}
          onBack={() => navigate('/admin/fabric-master')}
        />

        <div className="mt-6">
          <FabricSpecificationForm 
            onSubmit={handleSubmit}
            onCancel={() => navigate('/admin/fabric-master')}
            isLoading={loading}
          />
        </div>
      </div>
    </FormErrorBoundary>
  );
};

export default FabricSpecificationFormPage;