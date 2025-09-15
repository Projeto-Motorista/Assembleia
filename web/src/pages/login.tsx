import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Cross, Mail, Lock, Eye, EyeOff, Sparkles, Heart, Star } from 'lucide-react';
import api from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      // Também salvar em cookie para middleware SSR
      if (typeof document !== 'undefined') {
        document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 dias
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      router.push('/');
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      setError(apiError || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Acesso Sagrado - Sistema de Dízimos | Assembleia de Deus Vila Maria</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✝️</text></svg>" />
      </Head>

      <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${4 + Math.random() * 4}s`
              }}
            />
          ))}
          
          {/* Large Gradient Orbs */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-20 right-20 w-72 h-72 bg-pink-400/10 rounded-full blur-3xl animate-bounce-slow"></div>
          <div className="absolute bottom-32 left-20 w-80 h-80 bg-yellow-300/10 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
        </div>

        <div className="relative w-full max-w-md z-10">
          {/* Main Login Card */}
          <div className="glass-card rounded-3xl p-8 shadow-2xl hover-lift">
            {/* Header with Church Logo */}
            <div className="text-center mb-8">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-ull blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                  <Cross className="h-12 w-12 text-white animate-pulse-slow drop-shadow-lg" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                  Assembleia de Deus
                </h1>
                <p className="text-white/90 font-medium">Vila Maria - São Paulo</p>
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <div className="h-1 w-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                  <Star className="h-4 w-4 text-yellow-400 animate-pulse" />
                  <div className="h-1 w-8 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"></div>
                </div>
                <p className="text-white/80 text-sm mt-4 font-medium">
                  ✨ Sistema de Gestão Espiritual ✨
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-300/30 text-red-100 px-4 py-3 rounded-xl text-sm animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-white font-medium mb-2 text-sm">
                    📧 Email Sagrado
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-gray-800 transition-colors duration-300" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-gray-500 focus:bg-white outline-none transition-all duration-300 font-medium"
                      placeholder="admin@igreja.com"
                      required
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-white font-medium mb-2 text-sm">
                    🔐 Senha Divina
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-gray-800 transition-colors duration-300" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-14 py-4 bg-white border border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-gray-500 focus:bg-white outline-none transition-all duration-300 font-medium"
                      placeholder="••••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors duration-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-600 hover:via-purple-700 hover:to-pink-600 focus:ring-4 focus:ring-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Entrando no Reino...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 animate-pulse" />
                      <span>Entrar no Sistema Sagrado</span>
                      <Heart className="h-5 w-5 animate-pulse" style={{animationDelay: '0.5s'}} />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 relative overflow-hidden">
              {/* Sacred Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 rounded-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 rounded-2xl"></div>
              
              {/* Decorative Border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-gradient-to-r from-amber-300/40 via-yellow-400/40 to-orange-300/40"></div>
              
              {/* Content */}
              <div className="relative p-6 backdrop-blur-sm">
                {/* Header with Cross */}
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
                  <div className="flex items-center space-x-2">
                    <Cross className="h-5 w-5 text-amber-600 animate-pulse-slow" />
                    <span className="text-amber-800 font-bold text-sm tracking-wide">CREDENCIAIS SAGRADAS</span>
                    <Cross className="h-5 w-5 text-amber-600 animate-pulse-slow" />
                  </div>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
                </div>
                
                {/* Credentials Cards */}
                <div className="space-y-3">
                  {/* Email Card */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-200/50 to-indigo-200/50 rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm border border-blue-200/60 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-blue-800 font-semibold text-xs uppercase tracking-wide mb-1">Email Sagrado</p>
                          <p className="text-black font-bold text-sm font-mono bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                            admin@igreja.com
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Password Card */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-200/50 to-pink-200/50 rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm border border-purple-200/60 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Lock className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-purple-800 font-semibold text-xs uppercase tracking-wide mb-1">Senha Divina</p>
                          <p className="text-black font-bold text-sm font-mono bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                            admin123
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sacred Footer */}
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-transparent to-amber-400"></div>
                    <Star className="h-3 w-3 text-amber-500 animate-pulse" />
                    <div className="w-6 h-0.5 bg-gradient-to-l from-transparent to-amber-400"></div>
                  </div>
                  <p className="text-amber-700 text-xs font-medium mt-2 italic">
                    "Peça, e dar-se-vos-á; buscai, e encontrareis"
                  </p>
                </div>
              </div>
              
              {/* Floating Decorative Elements */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400/60 rounded-full animate-pulse"></div>
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-orange-400/60 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-1/2 left-1 w-1 h-1 bg-yellow-400/60 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>

            {/* Sacred Footer */}
            <div className="mt-8 text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-white/40 rounded"></div>
                <Cross className="h-5 w-5 text-white/60" />
                <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-white/40 rounded"></div>
              </div>
              <blockquote className="text-white/80 text-sm italic font-medium leading-relaxed">
                "Eu sou a porta; se alguém entrar por mim, salvar-se-á"
              </blockquote>
              <cite className="text-white/60 text-xs font-semibold block">João 10:9</cite>
            </div>
          </div>

          {/* Floating Elements Around Card */}
          <div className="absolute -top-6 -left-6 w-12 h-12 bg-white/10 rounded-full animate-float backdrop-blur-sm"></div>
          <div className="absolute -top-4 -right-8 w-8 h-8 bg-yellow-400/20 rounded-full animate-bounce-slow backdrop-blur-sm"></div>
          <div className="absolute -bottom-6 -right-6 w-10 h-10 bg-pink-400/10 rounded-full animate-float backdrop-blur-sm" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-4 -left-8 w-6 h-6 bg-purple-400/20 rounded-full animate-pulse backdrop-blur-sm"></div>
        </div>
      </div>
    </>
  );
}