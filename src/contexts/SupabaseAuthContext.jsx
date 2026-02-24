import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

// Helper to prevent infinite loading states
const withTimeout = (promise, ms = 15000, errorMessage = 'Request timed out. Please check your connection.') => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(errorMessage));
        }, ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
    });
};

// Helper for retry logic
const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const isNetworkError = error.message === 'Failed to fetch' || 
                                 error.message.includes('NetworkError') ||
                                 error.name === 'TypeError';
            
            // Only retry on network errors
            if (!isNetworkError) throw error;
            
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const handleSession = useCallback((newSession) => {
    setSession(newSession);
    
    // Deep comparison to prevent unnecessary re-renders if user object content hasn't changed
    const newUser = newSession?.user ?? null;
    setUser(prevUser => {
        if (JSON.stringify(prevUser) !== JSON.stringify(newUser)) {
            return newUser;
        }
        return prevUser;
    });
    
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        // Wrap getSession with retry and timeout
        const { data, error } = await retryOperation(() => 
            withTimeout(
                supabase.auth.getSession(), 
                10000, 
                'Initializing session timed out.'
            )
        );
        
        if (error) throw error;
        
        if (mounted) {
          handleSession(data.session);
        }
      } catch (error) {
        console.warn("Auth session retrieval warning:", error.message);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          
          const isNetworkError = error.message === 'Failed to fetch' || 
                                 error.message.includes('NetworkError') ||
                                 error.name === 'TypeError';
                                 
          if (!isNetworkError) {
             setAuthError(error);
          }
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          handleSession(session);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signUp = useCallback(async (credentials, profileData) => {
      const { email, password, phone } = credentials;
      
      const signUpCredentials = { password };
      const options = {
        data: {
          full_name: profileData.full_name || profileData.firm_name,
          role: profileData.role
        }
      };

      if (email) {
        signUpCredentials.email = email;
        signUpCredentials.options = options;
      } else if (phone) {
        signUpCredentials.phone = phone;
        signUpCredentials.options = options;
      } else {
        return { user: null, error: { message: "Email or phone number is required." } };
      }

      try {
        const { data, error } = await withTimeout(supabase.auth.signUp(signUpCredentials));
        
        if (error) return { user: null, error };
        
        if (data.user) {
          const profilePayload = { 
            id: data.user.id, 
            ...profileData 
          };
          
          if (data.user.email && !profilePayload.email) profilePayload.email = data.user.email;
          if (data.user.phone && !profilePayload.phone_number) profilePayload.phone_number = data.user.phone;

          const { error: profileError } = await withTimeout(
            supabase.from('user_profiles').insert(profilePayload),
            10000
          );
          
          if (profileError) {
            console.error("Profile creation failed:", profileError);
            return { user: data.user, error: profileError };
          }
        }
        return { user: data.user, error: null };
      } catch (err) {
        console.error("Signup exception:", err);
        return { user: null, error: err };
      }
    }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    try {
      const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          15000,
          'Sign in timed out. Please try again.'
      );
      
      if (error) throw error;
      if (data.session) handleSession(data.session);
      return { data, error: null };
    } catch (err) {
       return { data: null, error: err };
    }
  }, [handleSession]);

  const sendOtp = useCallback(async (identifier) => {
    try {
      let result;
      if (identifier.includes('@')) {
        result = await withTimeout(supabase.auth.signInWithOtp({ 
            email: identifier,
            options: {
                emailRedirectTo: window.location.origin,
            }
        }));
      } else {
        result = await withTimeout(supabase.auth.signInWithOtp({ phone: identifier }));
      }
      return result;
    } catch (err) {
      return { error: err };
    }
  }, []);

  const signInWithOtp = useCallback(async (identifier, token) => {
    try {
      let verifyParams = { token, type: 'sms' };
      
      if (identifier.includes('@')) {
          verifyParams = { 
              email: identifier, 
              token, 
              type: 'email' 
          };
      } else {
          verifyParams = { 
              phone: identifier, 
              token, 
              type: 'sms' 
          };
      }

      const { data, error } = await withTimeout(
          supabase.auth.verifyOtp(verifyParams)
      );
      
      if (error) throw error;
      if (data.session) handleSession(data.session);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [handleSession]);

  const resetPasswordForEmail = useCallback(async (email) => {
    try {
      const { data, error } = await withTimeout(
          supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          })
      );
      return { data, error };
    } catch (err) {
      return { error: err };
    }
  }, []);

  const updateUserPassword = useCallback(async (newPassword) => {
    try {
      const { data, error } = await withTimeout(
          supabase.auth.updateUser({ password: newPassword })
      );
      return { data, error };
    } catch (err) {
      return { error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await withTimeout(supabase.auth.signOut());
      if (!error) {
        setSession(null);
        setUser(null);
      }
      return { error };
    } catch (err) {
       setSession(null);
       setUser(null);
       return { error: err };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    authError,
    signUp,
    signInWithEmail,
    sendOtp,
    signInWithOtp,
    resetPasswordForEmail,
    updateUserPassword,
    signOut,
  }), [user, session, loading, authError, signUp, signInWithEmail, sendOtp, signInWithOtp, resetPasswordForEmail, updateUserPassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export alias for backward compatibility
export const useSupabaseAuth = useAuth;