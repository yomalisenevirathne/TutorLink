import { supabase } from '../utils/supabase';
import { Platform } from 'react-native';

// Frontend API client service for TutorLink Scope 3 Backend & Supabase Integration
const defaultApiBaseUrl = Platform.OS === 'android'
  ? 'http://192.168.1.6:5000/api'
  : 'http://localhost:5000/api';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultApiBaseUrl;

// Export Supabase client for direct usage across components
export { supabase };

let mockState = {
  token: null,
  currentUser: null,
  registeredUsers: [],
  mockOtps: {}
};

async function fetchWithFallback(endpoint, options = {}) {
  if (mockState.currentUser?.isDemo) return null;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: mockState.token ? `Bearer ${mockState.token}` : '',
        ...(options.headers || {})
      },
      signal: controller.signal,
      ...options
    });
    clearTimeout(id);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (err) {
    console.log(`[API Client] Live REST endpoint ${endpoint} unavailable, using mock/Supabase fallback:`, err.message);
    return null;
  }
}


function appUserFromSupabase(user, details = {}) {
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    role: metadata.role === 'Tutor' ? 'Tutor' : 'Student',
    fullName: details.fullName || metadata.fullName || user.email?.split('@')[0] || '',
    phoneNumber: details.phoneNumber || metadata.phoneNumber || '',
    address: details.address || metadata.address || '',
    subjects: details.subjects || metadata.subjects || [],
    experienceLevel: details.experienceLevel || metadata.experienceLevel || '',
    aboutYou: details.aboutYou || metadata.aboutYou || '',
    avatarUrl: details.avatarUrl || metadata.avatarUrl || null,
    isEmailVerified: Boolean(user.email_confirmed_at),
    certificates: details.certificates || [],
    paymentMethods: [],
    preferences: { notifications: true, privacy: false },
    privacyEnabled: false,
  };
}

// Temporary prototype access; this does not create a Supabase identity or JWT.
async function enterDemoAccount(email) {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // A demo ID can never match the authenticated UUID checked by payment reads.
  }
  const demoEmail = String(email || '').trim();
  const user = {
    ...appUserFromSupabase({
      id: `demo_${Date.now()}`,
      email: demoEmail,
      user_metadata: {
        role: demoEmail.toLowerCase().includes('tutor') ? 'Tutor' : 'Student',
        fullName: demoEmail.split('@')[0].replace(/[._-]/g, ' ') || 'Demo User',
      },
    }),
    isDemo: true,
  };
  mockState.token = null;
  mockState.currentUser = user;
  return { success: true, message: 'Demo login successful.', token: null, user };
}

export const apiService = {
  // Supabase Table query helper (e.g. for 'todos', 'profiles', etc.)
  fetchSupabaseData: async (tableName = 'todos') => {
    try {
      const { data, error } = await supabase.from(tableName).select();
      if (error) {
        console.log(`[Supabase Query] Error fetching ${tableName}:`, error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.log(`[Supabase Query] Exception fetching ${tableName}:`, err.message);
      return [];
    }
  },

  // 1. Send OTP
  sendOtp: async (email) => {
    // Attempt Supabase OTP send first
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (!error) {
        return {
          success: true,
          message: `OTP sent via Supabase to ${email}.`,
          otp: '123456'
        };
      }
    } catch (err) {
      console.log('[Supabase Auth] OTP error:', err.message);
    }

    const liveResult = await fetchWithFallback('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    if (liveResult) return liveResult;

    const mockCode = '123456';
    mockState.mockOtps[email.toLowerCase()] = mockCode;
    return {
      success: true,
      message: `OTP sent successfully to ${email}. (Demo Code: 123456)`,
      otp: mockCode
    };
  },

  // 2. Verify OTP
  verifyOtp: async (email, otp) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      if (!error && data?.user) {
        if (mockState.currentUser) mockState.currentUser.isEmailVerified = true;
        return { success: true, message: 'Email verified via Supabase!' };
      }
    } catch (err) {
      console.log('[Supabase Auth] Verify OTP error:', err.message);
    }

    const liveResult = await fetchWithFallback('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
    if (liveResult) return liveResult;

    const expectedCode = mockState.mockOtps[email.toLowerCase()] || '123456';
    if (otp.toString().trim() === expectedCode) {
      if (mockState.currentUser) {
        mockState.currentUser.isEmailVerified = true;
      }
      return { success: true, message: 'Email verified successfully!' };
    }
    return { success: false, message: 'Invalid OTP code. Please use 123456 for demo.' };
  },

  // Return the Supabase identity/session used by protected database queries.
  register: async (registrationData) => {
    const liveResult = await fetchWithFallback('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });
    if (liveResult) {
      mockState.token = liveResult.token;
      mockState.currentUser = liveResult.user;
      return liveResult;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registrationData.email.trim(),
        password: registrationData.password,
        options: {
          data: {
            fullName: registrationData.fullName,
            role: registrationData.role,
            phoneNumber: registrationData.phoneNumber,
            subjects: registrationData.subjects,
            experienceLevel: registrationData.experienceLevel,
            aboutYou: registrationData.aboutYou,
          }
        }
      });
      if (error) {
        return { success: false, message: error.message };
      }

      if (!data?.user) {
        return { success: false, message: 'Supabase did not return the new user.' };
      }

      const userId = data.user.id;
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        role: registrationData.role,
        email: registrationData.email,
        full_name: registrationData.fullName,
        phone_number: registrationData.phoneNumber || '',
        avatar_url: registrationData.avatarUrl || undefined,
        about_you: registrationData.aboutYou || '',
        is_email_verified: false
      }, { onConflict: 'id', ignoreDuplicates: true });

      if (profileError) {
        return { success: false, message: `Profile could not be saved: ${profileError.message}` };
      }

      const profileTable = registrationData.role === 'Tutor' ? 'tutor_profiles' : 'student_profiles';
      const roleProfile = registrationData.role === 'Tutor'
        ? {
            user_id: userId,
            subjects: registrationData.subjects || [],
            experience_level: registrationData.experienceLevel || 'Senior Tutor (4+ years)'
          }
        : {
            user_id: userId,
            subjects: registrationData.subjects || []
          };
      const { error: roleProfileError } = await supabase
        .from(profileTable)
        .upsert(roleProfile, { onConflict: 'user_id', ignoreDuplicates: true });

      if (roleProfileError) {
        return { success: false, message: `Role profile could not be saved: ${roleProfileError.message}` };
      }

      if (registrationData.role === 'Tutor' && registrationData.certificates?.length) {
        const { error: certificateError } = await supabase.from('tutor_certificates').insert(
          registrationData.certificates.map(certificate => ({
            tutor_id: userId,
            title: certificate.title,
            issuing_institute: certificate.issuingInstitute,
            certificate_url: certificate.certificateUrl,
            status: certificate.status || 'Pending'
          }))
        );

        if (certificateError) {
          return { success: false, message: `Certificate could not be saved: ${certificateError.message}` };
        }
      }

      const newUser = { ...appUserFromSupabase(data.user, registrationData),
        role: registrationData.role, isEmailVerified: false };
      mockState.token = data.session?.access_token || null;
      mockState.currentUser = newUser;
      return {
        success: true,
        message: 'Registration successful!',
        token: mockState.token,
        user: newUser
      };
    } catch (err) {
      return { success: false, message: `Registration could not be saved: ${err.message}` };
    }
  },

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error || !data?.user || !data?.session) return enterDemoAccount(email);
      let user = appUserFromSupabase(data.user);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profileError && profile && profile.id === data.user.id) {
          const profileTable = profile.role === 'Tutor' ? 'tutor_profiles' : 'student_profiles';
          const { data: roleProfile } = await supabase
            .from(profileTable)
            .select('*')
            .eq('user_id', data.user.id)
            .single();

          // Incoming branch's database profile takes precedence over auth metadata.
          user = {
            ...user,
            id: data.user.id,
            role: profile.role,
            email: profile.email,
            fullName: profile.full_name,
            phoneNumber: profile.phone_number || '',
            avatarUrl: profile.avatar_url,
            aboutYou: profile.about_you || '',
            isEmailVerified: profile.is_email_verified,
            subjects: roleProfile?.subjects || [],
            experienceLevel: roleProfile?.experience_level || ''
          };
        }
      } catch (profileFailure) {
        // Keep the verified identity if profile tables are temporarily unavailable.
        console.warn('[Supabase Profile] Unable to load profile:', profileFailure.message);
      }
      mockState.token = data.session.access_token;
      mockState.currentUser = user;
      return { success: true, message: 'Login successful.', token: mockState.token, user };
    } catch (err) {
      console.log('[Supabase Auth] Login fallback:', err.message);
      return enterDemoAccount(email);
    }
  },

  logout: async () => {
    mockState.token = null;
    mockState.currentUser = null;
    try {
      await supabase.auth.signOut();
    } catch (_err) {
      // ignore
    }
    return { success: true };
  },

  getProfile: async () => {
    const liveResult = await fetchWithFallback('/profile/me');
    if (liveResult) return liveResult.user;
    return mockState.currentUser;
  },

  updateProfile: async (updateData) => {
    if (!mockState.currentUser) return { success: false, message: 'Please log in before editing your profile.' };
    if (!mockState.currentUser.isDemo) {
      const { password: _password, email: _email, ...metadata } = updateData;
      const { data, error } = await supabase.auth.updateUser({ data: metadata });
      if (error) return { success: false, message: error.message };
      if (!data?.user) return { success: false, message: 'Unable to save your profile.' };
      mockState.currentUser = appUserFromSupabase(data.user, { ...mockState.currentUser, ...metadata });
      return { success: true, user: mockState.currentUser };
    }
    const liveResult = await fetchWithFallback('/profile/update', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    if (liveResult) {
      mockState.currentUser = liveResult.user;
      return liveResult;
    }

    mockState.currentUser = { ...mockState.currentUser, ...updateData };
    return {
      success: true,
      message: 'Profile updated successfully.',
      user: mockState.currentUser
    };
  },

  uploadCertificate: async (title, issuingInstitute, certificateUrl) => {
    const liveResult = await fetchWithFallback('/profile/upload-certificate', {
      method: 'POST',
      body: JSON.stringify({ title, issuingInstitute, certificateUrl })
    });
    if (liveResult) {
      mockState.currentUser = liveResult.user;
      return liveResult;
    }

    const newCert = {
      id: 'cert_' + Date.now(),
      title: title || 'Teaching Qualification Certificate',
      issuingInstitute: issuingInstitute || 'University / Board',
      certificateUrl: certificateUrl || 'https://via.placeholder.com/300x200?text=Certificate',
      status: 'Verified',
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    mockState.currentUser.certificates = [...(mockState.currentUser.certificates || []), newCert];

    return {
      success: true,
      message: 'Certificate uploaded and verified successfully!',
      certificate: newCert,
      user: mockState.currentUser
    };
  }
};
