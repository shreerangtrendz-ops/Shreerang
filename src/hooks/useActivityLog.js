import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export const useActivityLog = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const logActivity = async (actionType, module, description, metadata = {}) => {
    if (!user) return;

    try {
      await supabase.from('system_activity_logs').insert({
        actor_id: user.id,
        actor_name: profile?.full_name || user.email,
        actor_role: profile?.role,
        action_type: actionType,
        module: module,
        description: description,
        metadata: metadata
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  return { logActivity };
};