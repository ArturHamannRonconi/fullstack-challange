export interface TokenPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  preferred_username?: string;
  email?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  [key: string]: unknown;
}

export interface AuthenticatedUser {
  userId: string;
  username?: string;
  email?: string;
  roles: string[];
}

export interface AuthModuleOptions {
  issuer: string;
  audience: string;
  jwksUri: string;
  jwksRequestsPerMinute?: number;
}
