import { createContext, useContext, useState } from 'react';

export type UserRole = 'admin' | 'vendeur';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextValue {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Admin Principal',
    email: 'admin@naoservices.ga',
    role: 'admin',
  },
  {
    id: '2',
    name: 'Marie Vendeur',
    email: 'marie@naoservices.ga',
    role: 'vendeur',
  },
];

export const MOCK_ADMIN = MOCK_USERS[0];
export const MOCK_VENDEUR = MOCK_USERS[1];

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_ADMIN);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
