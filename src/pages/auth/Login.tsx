import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { loginUser, loginWithGoogle } from '../../firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsLoading(true);
      await loginUser(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login Error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const user = await loginWithGoogle();
      if (user) {
        navigate('/');
      }
    } catch (error) {
      console.error('Google Login Error', error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-secondary py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Login | ISAR Marketplace</title>
        <meta name="description" content="Login to your ISAR account." />
      </Helmet>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-modern-lg p-8 sm:p-10 border border-gray-100 my-auto">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-3">
            <span className="text-4xl font-black text-primary tracking-tight">ISAR</span>
          </Link>
          <h2 className="text-2xl font-black text-navy">Welcome Back</h2>
          <p className="text-xs text-gray-500 mt-1">Sign in to continue your shopping experience</p>
        </div>

        {/* Email Password Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-bold text-navy">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-primary transition-colors text-xs sm:text-sm text-navy placeholder:text-gray-400 font-medium"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-bold text-navy">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] font-bold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-primary transition-colors text-xs sm:text-sm text-navy placeholder:text-gray-400 font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-xs sm:text-sm font-black text-white bg-primary hover:bg-primary-dark disabled:opacity-70 disabled:cursor-not-allowed transition-all cursor-pointer hover:scale-102 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-3 text-gray-400 font-bold tracking-widest">Or continue with</span>
          </div>
        </div>

        {/* Google 1-Click Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-200 rounded-xl shadow-2xs bg-white text-xs sm:text-sm font-bold text-navy hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-primary hover:underline transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}