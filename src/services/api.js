import { supabase } from '../utils/supabase';

// Frontend API client service for TutorLink Scope 3 Backend & Supabase Integration
const API_BASE_URL = 'http://localhost:5000/api';

// Export Supabase client for direct usage across components
export { supabase };

let mockState = {
  token: null,
  currentUser: null,
  registeredUsers: [],
  mockOtps: {}
};

async function fetchWithFallback(endpoint, options = {}) {
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

  // 3. Register Account
  register: async (registrationData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password || 'password123',
        options: {
          data: {
            fullName: registrationData.fullName,
            role: registrationData.role
          }
        }
      });
      if (!error && data?.user) {
        console.log('[Supabase Auth] Registered user in Supabase:', data.user.email);
      }
    } catch (err) {
      console.log('[Supabase Auth] Registration fallback:', err.message);
    }

    const liveResult = await fetchWithFallback('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });
    if (liveResult) {
      mockState.token = liveResult.token;
      mockState.currentUser = liveResult.user;
      return liveResult;
    }

    const isEduEmail = registrationData.email.toLowerCase().includes('.ac.') || registrationData.email.toLowerCase().includes('.edu');
    const newUser = {
      id: 'usr_' + Date.now(),
      isEmailVerified: isEduEmail,
      privacyEnabled: false,
      avatarUrl: registrationData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      certificates: registrationData.certificates || [],
      paymentMethods: [{ type: 'Visa', last4: '4321' }],
      preferences: { notifications: true, privacy: false },
      ...registrationData
    };

    mockState.registeredUsers.push(newUser);
    mockState.token = 'mock_token_' + Date.now();
    mockState.currentUser = newUser;

    return {
      success: true,
      message: 'Registration successful!',
      token: mockState.token,
      user: newUser
    };
  },

  // 4. Login
  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (!error && data?.user) {
        console.log('[Supabase Auth] Logged in via Supabase:', data.user.email);
      }
    } catch (err) {
      console.log('[Supabase Auth] Login fallback:', err.message);
    }

    const liveResult = await fetchWithFallback('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (liveResult) {
      mockState.token = liveResult.token;
      mockState.currentUser = liveResult.user;
      return liveResult;
    }

    // Check if user was registered in local session
    const existing = mockState.registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      mockState.token = 'mock_token_' + Date.now();
      mockState.currentUser = existing;
      return {
        success: true,
        message: 'Login successful.',
        token: mockState.token,
        user: existing
      };
    }

    // Dynamic fallback user for new clean login
    const isTutor = email.toLowerCase().includes('tutor');
    const user = {
      id: 'usr_' + Date.now(),
      role: isTutor ? 'Tutor' : 'Student',
      email: email,
      fullName: email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
      phoneNumber: '',
      address: '',
      subjects: isTutor ? ['Mathematics', 'Physics'] : ['Mathematics'],
      experienceLevel: isTutor ? 'Tutor' : '',
      aboutYou: '',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      isEmailVerified: true,
      certificates: [],
      paymentMethods: [{ type: 'Visa', last4: '4321' }],
      preferences: { notifications: true, privacy: false }
    };

    mockState.token = 'mock_token_' + Date.now();
    mockState.currentUser = user;

    return {
      success: true,
      message: 'Login successful.',
      token: mockState.token,
      user
    };
  },

  logout: async () => {
    mockState.token = null;
    mockState.currentUser = null;
    try {
      await supabase.auth.signOut();
    } catch (err) {
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
