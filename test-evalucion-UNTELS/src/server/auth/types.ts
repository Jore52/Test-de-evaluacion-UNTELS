export type Role = 'superadmin' | 'admin' | 'viewer';
export interface AdminUser { id: string; email: string; name: string; role: Role; picture?: string | null }
