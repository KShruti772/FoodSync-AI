'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemo } from '@/lib/demo-context';
import {
  Leaf,
  Menu,
  X,
  Bell,
  LogOut,
  PlusCircle,
  Building2,
  Store,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, unreadCount } = useDemo();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  interface NavItem {
    name: string;
    href: string;
    badge?: number;
  }

  // Public Links
  const publicLinks: NavItem[] = [
    { name: 'Home', href: '/' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Research', href: '/research' },
    { name: 'Impact', href: '/impact' },
    { name: 'About', href: '/about' },
  ];

  // Role-Specific Links
  const providerLinks: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'My Donations', href: '/donations' },
    { name: 'Notifications', href: '/notifications', badge: unreadCount },
    { name: 'Impact', href: '/impact' },
  ];

  const recipientLinks: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Available Food', href: '/matches' },
    { name: 'Notifications', href: '/notifications', badge: unreadCount },
    { name: 'Impact', href: '/impact' },
  ];

  const navLinks: NavItem[] = user
    ? user.role === 'FOOD_PROVIDER'
      ? providerLinks
      : recipientLinks
    : publicLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link
            href={user ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">FoodSync AI</span>
              <span className="text-[11px] font-medium text-slate-500 tracking-wide">Intelligent Food Redistribution</span>
            </div>
          </Link>

        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative text-sm font-medium transition-colors py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded ${
                  isActive
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                {link.name}
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Provider Quick CTA */}
              {user.role === 'FOOD_PROVIDER' && (
                <Link
                  href="/donations/new"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Create Donation
                </Link>
              )}

              {/* Notification Bell Icon */}
              <Link
                href="/notifications"
                aria-label={`Notifications (${unreadCount} unread)`}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                )}
              </Link>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  aria-expanded={profileDropdownOpen}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {user.avatarInitials}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-900 leading-tight max-w-[120px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      {user.role === 'FOOD_PROVIDER' ? (
                        <>
                          <Store className="h-2.5 w-2.5 text-emerald-600" />
                          Provider
                        </>
                      ) : (
                        <>
                          <Building2 className="h-2.5 w-2.5 text-teal-600" />
                          Recipient
                        </>
                      )}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-2 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.organization}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <span className="mt-1.5 inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {user.role === 'FOOD_PROVIDER' ? 'Role: Food Provider' : 'Role: Recipient Org'}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/notifications"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Bell className="h-3.5 w-3.5 text-slate-500" />
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                      >
                        <LogOut className="h-3.5 w-3.5 text-red-600" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <Link
              href="/notifications"
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 shadow-lg">
          {user && (
            <div className="pb-3 border-b border-slate-100 px-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{user.organization}</p>
                <p className="text-[11px] text-slate-500">{user.name}</p>
              </div>
            </div>
          )}

          <nav className="flex flex-col space-y-1 pt-1" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between text-base font-medium px-3 py-2 rounded-md transition-colors ${
                  pathname === link.href
                    ? 'text-emerald-700 bg-emerald-50 font-semibold'
                    : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
                }`}
              >
                <span>{link.name}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center text-sm font-semibold text-red-600 hover:bg-red-50 py-2.5 rounded-lg border border-red-200 transition-colors"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-sm font-medium text-slate-700 hover:bg-slate-100 py-2.5 rounded-lg border border-slate-200 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
