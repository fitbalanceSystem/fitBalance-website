import { Environment } from '../utils/env';

export interface TestUser {
  email:    string;
  password: string;
  role:     'admin' | 'customer' | 'guest';
  name:     string;
}

const users: Record<Environment, Record<string, TestUser>> = {
  local: {
    admin: {
      email:    process.env.ADMIN_EMAIL    ?? 'admin@fitbalance.co.il',
      password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
      role:     'admin',
      name:     'Admin User',
    },
    customer: {
      email:    'test.customer@fitbalance.co.il',
      password: 'Customer123!',
      role:     'customer',
      name:     'Test Customer',
    },
  },
  staging: {
    admin: {
      email:    process.env.ADMIN_EMAIL    ?? 'admin@fitbalance.co.il',
      password: process.env.ADMIN_PASSWORD ?? '',
      role:     'admin',
      name:     'Admin User',
    },
    customer: {
      email:    'test.customer@fitbalance.co.il',
      password: 'Customer123!',
      role:     'customer',
      name:     'Test Customer',
    },
  },
  production: {
    admin: {
      email:    process.env.ADMIN_EMAIL    ?? '',
      password: process.env.ADMIN_PASSWORD ?? '',
      role:     'admin',
      name:     'Admin User',
    },
    customer: {
      email:    '',
      password: '',
      role:     'customer',
      name:     '',
    },
  },
};

export function getUser(env: Environment, role: string): TestUser {
  const user = users[env]?.[role];
  if (!user) throw new Error(`No test user for env="${env}" role="${role}"`);
  return user;
}
