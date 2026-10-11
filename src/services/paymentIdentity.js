import { supabase } from '../utils/supabase';
import { getPaymentDemoClient } from '../utils/paymentDemoClient';

let creatingDemoSession;

function demoAuthError(error) {
  if (error?.code === 'anonymous_provider_disabled') {
    const disabled = new Error('Demo card saving needs Anonymous Sign-ins enabled in Supabase Authentication settings.');
    disabled.code = 'DEMO_AUTH_DISABLED';
    return disabled;
  }
  const unavailable = new Error('Could not connect your demo session. Please try again.');
  unavailable.code = 'DEMO_AUTH_UNAVAILABLE';
  return unavailable;
}

async function verifyDemoUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw demoAuthError(error);
  const user = data?.user;
  if (user?.is_anonymous !== true || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.id)) {
    throw demoAuthError();
  }
  return { client, userId: user.id };
}

export async function getPaymentIdentity(userId, { isDemo = false, create = false } = {}) {
  if (!isDemo) {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!userId || data?.user?.id !== userId) {
      const required = new Error('Please sign in again to access your saved cards.');
      required.code = 'AUTH_REQUIRED';
      throw required;
    }
    return { client: supabase, userId: data.user.id };
  }

  // Never use the UI's fabricated demo_* ID as a database owner.
  if (creatingDemoSession) return creatingDemoSession;
  const client = getPaymentDemoClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw demoAuthError(error);
  if (data?.session) return verifyDemoUser(client);
  // Visiting Payment does not create a user. Only saving a valid card does.
  if (!create) return null;

  if (!creatingDemoSession) {
    creatingDemoSession = (async () => {
      const { data: signedIn, error: signInError } = await client.auth.signInAnonymously();
      if (signInError) throw demoAuthError(signInError);
      if (!signedIn?.session?.access_token) throw demoAuthError();
      return verifyDemoUser(client);
    })().finally(() => { creatingDemoSession = undefined; });
  }
  return creatingDemoSession;
}
