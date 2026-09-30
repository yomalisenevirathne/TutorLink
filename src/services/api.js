import { supabase } from '../utils/supabase';

// Frontend API client service for TutorLink Scope 3 Backend & Supabase Integration
const API_BASE_URL = 'http://localhost:5000/api';

// Export Supabase client for direct usage across components
export { supabase };

let mockState = {
  token: 'mock_session_token_123',
  currentUser: {
    id: 'usr_tutor_1',
    role: 'Tutor',
    email: 'dilshan.samarawickrama@univ.ac.lk',
    fullName: 'Dilshan Samarawickrama',
    phoneNumber: '+94 71 987 6543',
    address: 'Torrous address beat, Luton Road, Titis inst area here',
    subjects: ['Higher Mathematics', 'Quantum Physics'],
    experienceLevel: 'Senior Tutor (4+ years)',
    aboutYou: 'Team oriented and dedicated educator specializing in advanced mathematics and applied physics.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isEmailVerified: true,
    certificates: [
      {
        id: 'cert_1',
        title: 'B.Sc. Special Hons Degree Certificate',
        issuingInstitute: 'University of Colombo',
        status: 'Verified',
        uploadedAt: '2026-01-15'
      }
    ],
    paymentMethods: [{ type: 'Visa', last4: '4321' }],
    preferences: { notifications: true, privacy: false }
  },
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
      avatarUrl: registrationData.avatarUrl || (registrationData.role === 'Student' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'),
      certificates: registrationData.certificates || [],
      paymentMethods: [{ type: 'Visa', last4: '4321' }],
      preferences: { notifications: true, privacy: false },
      ...registrationData
    };

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

    const isTutor = email.includes('tutor') || !email.includes('student');
    const user = {
      id: isTutor ? 'usr_tutor_1' : 'usr_student_1',
      role: isTutor ? 'Tutor' : 'Student',
      email: email || (isTutor ? 'dilshan.samarawickrama@univ.ac.lk' : 'dinithi.desilva@univ.ac.lk'),
      fullName: isTutor ? 'Dilshan Samarawickrama' : 'Dinithi de Silva',
      phoneNumber: isTutor ? '+94 71 987 6543' : '+94 77 123 4567',
      address: isTutor ? 'Torrous address beat, Luton Road, Titis inst area here' : 'Colombo 07, Sri Lanka',
      subjects: isTutor ? ['Higher Mathematics', 'Quantum Physics'] : ['Mathematics', 'Physics', 'Computer Science'],
      experienceLevel: isTutor ? 'Senior Tutor (4+ years)' : '',
      aboutYou: isTutor 
        ? 'Team oriented and dedicated educator specializing in advanced mathematics and applied physics.'
        : 'Passionate computer science undergraduate looking for guidance in higher level math and algorithms.',
      avatarUrl: isTutor
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      isEmailVerified: true,
      certificates: isTutor ? [{ id: 'cert_1', title: 'B.Sc. Degree Certificate', status: 'Verified', uploadedAt: '2026-01-15' }] : [],
      paymentMethods: [{ type: 'Visa', last4: '4321' }],
      preferences: { notifications: true, privacy: false },
      keywords: isTutor ? [] : ['Math', 'Physics', 'Data Structures', 'Python']
    };

    mockState.token = 'mock_token_login';
    mockState.currentUser = user;

    return {
      success: true,
      message: 'Login successful.',
      token: mockState.token,
      user
    };
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
