import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { useAuthStore } from '../store/authStore';
import type { AuthUser, UserRole } from '../store/authStore';
import toast from 'react-hot-toast';

// ইউজারের ডেটাবেস প্রোফাইল তৈরি বা আপডেট করার ফাংশন
const syncUserToFirestore = async (user: FirebaseUser, role: UserRole = 'customer', displayName?: string) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // নতুন ইউজার হলে ডাটাবেসে সেভ করা হবে
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || 'Anonymous User',
      photoURL: user.photoURL || null,
      phoneNumber: user.phoneNumber || null,
      role: role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return role;
  }
  
  // পুরোনো ইউজার হলে তার রোল রিটার্ন করা হবে
  return userSnap.data().role as UserRole;
};

// গ্লোবাল Auth Listener (যেকোনো সময় ইউজার লগইন/লগআউট করলে এটি ট্রিগার হবে)
export const initAuthListener = () => {
  const { setUser, setLoading, logout } = useAuthStore.getState();

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    try {
      if (firebaseUser) {
        // ফায়ারস্টোর থেকে ইউজারের রোল (role) বের করে আনা
        const role = await syncUserToFirestore(firebaseUser);
        
        const userData: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
          role: role,
        };
        
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Auth Listener Error:", error);
      logout();
    } finally {
      setLoading(false);
    }
  });

  return unsubscribe;
};

// গুগল দিয়ে সরাসরি ১-ক্লিকে লগইন বা সাইন-আপ করার ফাংশন
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // ফায়ারস্টোরে প্রোফাইল নিশ্চিত করা
    await syncUserToFirestore(user, 'customer', user.displayName || undefined);
    
    toast.success('Signed in with Google successfully!');
    return user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/popup-closed-by-user') {
      return null; // ইউজার পপ-আপ নিজে কেটে দিলে এরর দেখানোর দরকার নেই
    }
    console.error("Google sign-in error:", error);
    toast.error(err.message || 'Failed to sign in with Google');
    throw error;
  }
};

// ইমেইল এবং পাসওয়ার্ড দিয়ে নতুন একাউন্ট খোলার ফাংশন
export const registerUser = async (email: string, password: string, fullName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Firebase Auth-এ নাম আপডেট করা
    await updateProfile(user, { displayName: fullName });
    
    // Firestore-এ ডাটা সেভ করা
    await syncUserToFirestore(user, 'customer', fullName);
    
    toast.success('Account created successfully!');
    return user;
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const err = error as Error;
    toast.error(err.message || 'Failed to register account');
    throw error;
  }
};

// ইমেইল এবং পাসওয়ার্ড দিয়ে লগইন করার ফাংশন
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    toast.success('Logged in successfully!');
    return userCredential.user;
  } catch (error: unknown) {
    console.error("Login error:", error);
    toast.error('Invalid email or password');
    throw error;
  }
};

// লগআউট করার ফাংশন
export const logoutUser = async () => {
  try {
    await signOut(auth);
    toast.success('Logged out successfully!');
  } catch (error: unknown) {
    console.error("Logout error:", error);
    toast.error('Failed to logout');
    throw error;
  }
};