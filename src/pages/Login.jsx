import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Store, Mail, Lock, AlertCircle } from 'lucide-react';
import { BUSINESS_CONFIG } from '../config/businessConfig';

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (data?.user) {
        setUser(data.user);
        navigate('/admin/dashboard');
      }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-secondary border border-border-custom rounded-3xl p-8 shadow-xl transition-all">
        
        {/* Header Login */}
        <div className="text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary mx-auto mb-4">
            <Store size={26} />
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-text-primary">
            {BUSINESS_CONFIG.nombre}
          </h1>
          <p className="text-xs text-text-secondary mt-1.5 font-medium">
            Acceso al Panel de Administración
          </p>
        </div>



        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500 border border-red-500 text-xs text-white font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase">Correo Electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                required
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-border-custom bg-bg-primary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Botón Ingresar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              'Ingresar al Panel'
            )}
          </button>
        </form>

        {/* Volver a la Tienda */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-text-secondary hover:text-primary transition-colors font-semibold cursor-pointer"
          >
            ← Volver al catálogo público
          </button>
        </div>

      </div>
    </div>
  );
}
