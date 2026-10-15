import { createContext } from 'react';
import { Me } from '../types';

export interface AuthContextType {
  me: Me | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
