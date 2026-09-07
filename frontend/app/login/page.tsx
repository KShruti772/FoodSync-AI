'use client';

import React from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to continue rescuing surplus food."
      alternateLink={{
        prompt: "Don't have an account?",
        actionText: 'Create an account',
        href: '/register',
      }}
    >
      <LoginForm />
    </AuthLayout>
  );
}
