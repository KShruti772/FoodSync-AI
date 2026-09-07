'use client';

import React from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthLayout
      heading="Create your FoodSync account"
      subheading="Join a network working to reduce food waste and redirect surplus food where it is needed."
      alternateLink={{
        prompt: 'Already have an account?',
        actionText: 'Sign in',
        href: '/login',
      }}
    >
      <RegisterForm />
    </AuthLayout>
  );
}
