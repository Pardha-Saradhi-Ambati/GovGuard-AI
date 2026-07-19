import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';

const Login = () => {
  const { login, user, error: authError } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  const from = location.state?.from?.pathname || '/';
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and credential passkey.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Please contact platform administrators.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gov-navy px-4 select-none relative overflow-hidden">
      {/* Decorative Grid Lines to look high-tech */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      {/* Glow Rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gov-accent/5 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gov-gold/5 rounded-full filter blur-3xl"></div>

      <div className="w-full max-w-md z-10">
        
        {/* Seal Icon & Department Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gov-slate border border-gov-blue/40 shadow-xl text-gov-gold mb-3">
            <ShieldCheck size={36} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-extrabold tracking-wider text-slate-100 uppercase">
            Government of India
          </h2>
          <p className="text-xs text-gov-accent tracking-widest font-semibold uppercase mt-0.5">
            AI integrity & Fraud Intelligence Desk
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-panel rounded-lg shadow-2xl p-8 border border-gov-blue/20">
          <div className="border-b border-gov-blue/20 pb-4 mb-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
              SECURE PORTAL VERIFICATION
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Authorized personnel access terminal. Activity is audited.
            </p>
          </div>

          {/* Local Alerts */}
          {(error || authError) && (
            <div className="mb-6 flex items-start p-3 bg-gov-crimson/10 border border-gov-crimson/25 rounded text-gov-crimson text-xs">
              <AlertCircle size={16} className="mr-2 shrink-0 mt-0.5" />
              <span>{error || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                User Identity
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input pl-10 text-sm focus:border-gov-accent"
                  placeholder="Enter credential ID (e.g., officer1)"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Audit Passkey
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-10 pr-10 text-sm focus:border-gov-accent"
                  placeholder="Enter system passkey"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded text-sm font-bold text-slate-900 bg-gov-gold hover:bg-gov-gold/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-gold shadow-lg shadow-gov-gold/20 transition-all uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent mr-2"></div>
                  Verifying Identity...
                </>
              ) : (
                'Request Access'
              )}
            </button>
          </form>
        </div>

        {/* Audit Warning */}
        <p className="text-center text-[10px] text-slate-500 mt-6 max-w-sm mx-auto leading-relaxed">
          WARNING: Unauthenticated entry attempts will be logged under IP audit registry. All actions on this platform are subject to National Cyber Security Oversight.
        </p>
      </div>
    </div>
  );
};

export default Login;
