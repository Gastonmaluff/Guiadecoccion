import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { registerUserProfile, subscribeCurrentUserProfile } from "../lib/data";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setProfile(null);

      if (unsubscribeProfile) unsubscribeProfile();

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      unsubscribeProfile = subscribeCurrentUserProfile(firebaseUser.uid, (profileData) => {
        setProfile(profileData ? { id: firebaseUser.uid, ...profileData } : null);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(fullName, email, password) {
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    await registerUserProfile(credentials.user, fullName);
  }

  async function logout() {
    await signOut(auth);
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      register,
      logout,
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
