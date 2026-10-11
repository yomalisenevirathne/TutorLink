import { supabase } from '../utils/supabase';
import { Platform } from 'react-native';
import { uploadQualificationDocument } from './qualificationDocuments';

// Frontend API client service for TutorLink Scope 3 Backend & Supabase Integration
const defaultApiBaseUrl = Platform.OS === 'android'
  ? 'http://192.168.1.6:5000/api'
  : 'http://localhost:5000/api';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultApiBaseUrl;
const allowDemoAuth = process.env.EXPO_PUBLIC_ENABLE_DEMO_AUTH === 'true';
const otpProviders = new Map();

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
    certificates: details.certificates ?? metadata.certificates ?? [],
    paymentMethods: [],
    preferences: details.preferences ?? metadata.preferences ?? { notifications: true, privacy: false },
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

  sendOtp: async (email, { demo = false } = {}) => {
    const address = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { success: false, message: 'Enter a valid email address.' };
    // Tutor registration demos do not send mail or create a passwordless session.
    if (demo) {
      otpProviders.set(address, 'tutor-demo');
      mockState.mockOtps[address] = { code: '123456', expiresAt: Date.now() + 10 * 60 * 1000 };
      return { success: true, message: 'Use demo code 123456. No email is sent.', otp: '123456' };
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: address });
      if (!error) {
        otpProviders.set(address, 'supabase');
        return { success: true, message: `OTP sent to ${address}.` };
      }
      if (!allowDemoAuth) return { success: false, message: error.message || 'Unable to send the code.' };
    } catch (error) {
      if (!allowDemoAuth) return { success: false, message: error.message || 'Unable to send the code. Please try again.' };
    }
    otpProviders.set(address, 'demo');
    mockState.mockOtps[address] = { code: '123456', expiresAt: Date.now() + 10 * 60 * 1000 };
    return { success: true, message: 'Demo verification code created.', otp: '123456' };
  },

  verifyOtp: async (email, otp) => {
    const address = String(email || '').trim().toLowerCase();
    const code = String(otp || '').trim();
    if (!/^\d{6}$/.test(code)) return { success: false, message: 'Enter all six digits.' };
    const provider = otpProviders.get(address);
    if (provider === 'tutor-demo' || (provider === 'demo' && allowDemoAuth)) {
      const expected = mockState.mockOtps[address];
      if (!expected || Date.now() > expected.expiresAt || code !== expected.code)
        return { success: false, message: 'Invalid or expired code. Request a new code.' };
      delete mockState.mockOtps[address];
    } else if (provider === 'supabase') {
      try {
        const { data, error } = await supabase.auth.verifyOtp({ email: address, token: code, type: 'email' });
        if (error || !data?.user) return { success: false, message: error?.message || 'Invalid or expired code.' };
      } catch (error) {
        return { success: false, message: error.message || 'Unable to verify the code. Please try again.' };
      }
    } else return { success: false, message: 'Request a new verification code first.' };
    otpProviders.delete(address);
    if (provider === 'supabase' && mockState.currentUser?.email?.toLowerCase() === address)
      mockState.currentUser.isEmailVerified = true;
    return { success: true, message: provider === 'supabase' ? 'Email verified successfully.' : 'Demo code verified.' };
  },

  // Return the Supabase identity/session used by protected database queries.
  register: async (registrationData) => {
    // Registration and login must use the same identity provider. The separate
    // file-based REST server cannot issue Supabase sessions for booking queries.
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

      if (registrationData.role === 'Tutor' && registrationData.demoOtp && !data.session?.access_token) {
        return { success: false, message: 'Supabase requires email confirmation. For demo registration, turn off Confirm email in Supabase Authentication > Sign In / Providers > Email, save, then try again. Demo OTP 123456 cannot confirm a Supabase account.' };
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
      if (error || !data?.user || !data?.session) {
        if (allowDemoAuth) return enterDemoAccount(email);
        return { success: false, message: error?.message || 'Unable to sign in. Check your email and password.' };
      }
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
            isEmailVerified: Boolean(data.user.email_confirmed_at) || Boolean(profile.is_email_verified),
            subjects: roleProfile?.subjects || [],
            experienceLevel: roleProfile?.experience_level || ''
          };
        }
      } catch (profileFailure) {
        // Keep the verified identity if profile tables are temporarily unavailable.
        console.warn('[Supabase Profile] Unable to load profile:', profileFailure.message);
      }
      try {
        if (user.role === 'Tutor') {
          const certificates = await supabase.from('tutor_certificates').select('*').eq('tutor_id', data.user.id);
          if (!certificates.error) user.certificates = (certificates.data || []).map((certificate) => ({
            id: certificate.id, title: certificate.title, certificateUrl: certificate.certificate_url,
            issuingInstitute: certificate.issuing_institute, status: certificate.status, uploadedAt: certificate.uploaded_at,
          }));
        }
      } catch (error) { console.warn('Unable to load certificates:', error.message); }
      mockState.token = data.session.access_token;
      mockState.currentUser = user;
      return { success: true, message: 'Login successful.', token: mockState.token, user };
    } catch (err) {
      if (allowDemoAuth) return enterDemoAccount(email);
      return { success: false, message: err.message || 'Unable to sign in. Please try again.' };
    }
  },

  logout: async () => {
    mockState.token = null;
    mockState.currentUser = null;
    otpProviders.clear();
    mockState.mockOtps = {};
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
      const previous = mockState.currentUser;
      const profileChanges = {
        ...(metadata.fullName !== undefined ? { full_name: metadata.fullName } : {}),
        ...(metadata.phoneNumber !== undefined ? { phone_number: metadata.phoneNumber } : {}),
        ...(metadata.address !== undefined ? { address: metadata.address } : {}),
        ...(metadata.avatarUrl !== undefined ? { avatar_url: metadata.avatarUrl } : {}),
        ...(metadata.aboutYou !== undefined ? { about_you: metadata.aboutYou } : {}),
      };
      if (Object.keys(profileChanges).length) {
        const result = await supabase.from('profiles').update(profileChanges).eq('id', previous.id).select('id');
        if (result.error || !result.data?.length) return { success: false, message: result.error?.message || 'Your profile could not be saved.' };
      }
      if (metadata.subjects !== undefined || metadata.experienceLevel !== undefined) {
        const table = previous.role === 'Tutor' ? 'tutor_profiles' : 'student_profiles';
        const roleChanges = { ...(metadata.subjects !== undefined ? { subjects: metadata.subjects } : {}),
          ...(previous.role === 'Tutor' && metadata.experienceLevel !== undefined ? { experience_level: metadata.experienceLevel } : {}) };
        const result = await supabase.from(table).update(roleChanges).eq('user_id', previous.id).select('user_id');
        if (result.error || !result.data?.length) return { success: false, message: result.error?.message || 'Your subject details could not be saved.' };
      }
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

  uploadCertificate: async (document, issuingInstitute = 'Uploaded Document') => {
    const user = mockState.currentUser;
    if (!user || user.isDemo) return { success: false, message: 'Sign in with your tutor account to upload documents.' };
    let uploaded;
    try {
      uploaded = await uploadQualificationDocument(user.id, document);
      const { data, error } = await supabase.from('tutor_certificates').insert({
        tutor_id: user.id, title: document.name, issuing_institute: issuingInstitute,
        certificate_url: uploaded.path, status: 'Pending',
      }).select().single();
      if (error) throw error;
      if (!data?.id) throw new Error('Your document details could not be saved.');
      const certificate = { id: data.id, title: data.title, certificateUrl: data.certificate_url,
        issuingInstitute: data.issuing_institute, status: data.status, uploadedAt: data.uploaded_at };
      mockState.currentUser = { ...user, certificates: [...(user.certificates || []), certificate] };
      return { success: true, certificate, user: mockState.currentUser };
    } catch (error) {
      if (uploaded) await supabase.storage.from(uploaded.bucket).remove([uploaded.path]).catch(() => {});
      return { success: false, message: error.message || 'Unable to upload the document.' };
    }
  }
};
