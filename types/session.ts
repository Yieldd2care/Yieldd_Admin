export type UserRole = 'rep' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role: UserRole;
  createdAt: string;
}

export interface SessionState {
  user: User | null;
  isNewSignup: boolean;
  signUp: (input: { name: string; company: string; email: string; password: string }) => void;
  signIn: (input: { email: string; password: string }) => void;
  signOut: () => void;
}
