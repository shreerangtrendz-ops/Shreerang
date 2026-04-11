import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastUserIdRef = useRef(null);
  const channelRef = useRef(null);       // ← track realtime channel
  const fetchProfileRef = useRef(null);  // ← stable ref to latest fetchProfile

  const fetchProfile = useCallback(async (force = false) => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!force && lastUserIdRef.current === user.id && profile) {
          setLoading(false);
          return;
      }

      setLoading(true);
      setError(null);

      try {
        let data = null;
        let fetchError = null;
        
        for (let i = 0; i < 3; i++) {
            try {
                const result = await supabase
                  .from('user_profiles')
                  .select(`*, pricing_tier_details:pricing_tiers(*)`)
                  .eq('id', user.id)
                  .single();
                
                data = result.data;
                fetchError = result.error;
                
                if (!fetchError || fetchError.code === 'PGRST116') {
                    break;
                }
                throw fetchError;
            } catch (err) {
                fetchError = err;
                const isNetworkError = err.message === 'Failed to fetch' || 
                                     err.message.includes('NetworkError') ||
                                     err.name === 'TypeError';
                
                if (!isNetworkError) break;
                if (i < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
            }
        }

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (data) {
          if (data.pricing_tier_details) {
            data.pricing_tier = data.pricing_tier_details;
            delete data.pricing_tier_details;
          }
          setProfile(data);
          lastUserIdRef.current = user.id;
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProfileRef.current = fetchProfile;
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    if (channelRef.current) return;

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile updated in real-time:', payload.new);
          lastUserIdRef.current = null;
          fetchProfileRef.current?.(true);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  return { profile, loading, error, refetch: () => fetchProfile(true) };
};
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!force && lastUserIdRef.current === user.id && profile) {
          setLoading(false);
          return;
      }

      setLoading(true);
      setError(null);

      try {
        // Retry logic for profile fetch
        let data = null;
        let fetchError = null;
        
        for (let i = 0; i < 3; i++) {
            try {
                const result = await supabase
                  .from('user_profiles')
                  .select(`*, pricing_tier_details:pricing_tiers(*)`)
                  .eq('id', user.id)
                  .single();
                
                data = result.data;
                fetchError = result.error;
                
                if (!fetchError || fetchError.code === 'PGRST116') {
                    break; // Success or not found (which is valid)
                }
                throw fetchError; // Throw to trigger retry
            } catch (err) {
                fetchError = err;
                // Only retry on network errors
                const isNetworkError = err.message === 'Failed to fetch' || 
                                     err.message.includes('NetworkError') ||
                                     err.name === 'TypeError';
                
                if (!isNetworkError) break;
                
                if (i < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
            }
        }

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (data) {
          if (data.pricing_tier_details) {
            data.pricing_tier = data.pricing_tier_details;
            delete data.pricing_tier_details;
          }
          setProfile(data);
          lastUserIdRef.current = user.id;
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
  }, [user, profile]);

  useEffect(() => {
    fetchProfile();

    let subscription = null;
    if (user) {
        subscription = supabase
            .channel(`public:user_profiles:id=eq.${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_profiles',
                filter: `id=eq.${user.id}`
            }, 
            (payload) => {
                console.log('Profile updated in real-time:', payload.new);
                lastUserIdRef.current = null; 
                fetchProfile(true); 
            })
            .subscribe();
    }
    
    return () => {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
    };
  }, [user, fetchProfile]);

  return { profile, loading, error, refetch: () => fetchProfile(true) };
};