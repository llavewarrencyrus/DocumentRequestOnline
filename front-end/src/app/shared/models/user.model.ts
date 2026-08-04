export interface User {
  id: string;
  username: string;
  userId: string;
  role: string;
  expiration: Date;
  issuedBy: string;
  audience: string;
  isExpired: boolean;
}

export interface LoginFormData {
  username: string;
  birthday: Date | null;
  password: string;
}