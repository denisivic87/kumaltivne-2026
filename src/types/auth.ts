export interface User {
  id: string;
  username: string;
  email: string;
  budget_user_id: string;
  treasury: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  last_login?: string;
  pdf_display_name?: string;
}

export interface AdminCredentials {
  username: string;
  password: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
}

export interface MonthlyActivity {
  id: string;
  user_id: string;
  username: string;
  month: string;
  year: number;
  records_created: number;
  records_modified: number;
  last_activity: string;
  total_amount: number;
}