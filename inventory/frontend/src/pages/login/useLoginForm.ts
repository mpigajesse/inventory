import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export interface LoginFormState {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  fillDemo: (username: string, password: string) => void;
}

export function useLoginForm(): LoginFormState {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message.includes('401')
          ? 'Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.'
          : 'Connexion impossible. Vérifiez votre connexion internet.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (u: string, p: string): void => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return {
    username, setUsername,
    password, setPassword,
    showPassword, setShowPassword,
    error, isSubmitting,
    handleSubmit, fillDemo,
  };
}
