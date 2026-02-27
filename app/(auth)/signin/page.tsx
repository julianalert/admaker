export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Yuzuu to create AI product photos for your photoshoots.',
}

import Link from 'next/link'
import AuthHeader from '../auth-header'
import AuthImage from '../auth-image'
import { GoogleSignInButton } from '../google-sign-in-button'

export default function SignIn() {
  return (
    <main className="bg-white dark:bg-gray-900">

      <div className="relative md:flex">

        {/* Content */}
        <div className="md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">

            <AuthHeader />

            <div className="max-w-sm mx-auto w-full px-4 py-8">
              <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-3">Hello there!</h1>
              <div className="text-sm mb-6">
                  Log in with Google to access your dashboard.
                </div>
              {/* Form */}
              <div className="space-y-4">
                <GoogleSignInButton />
              </div>
              {/* Footer */}
              <div className="pt-5 mt-6 border-t border-gray-100 dark:border-gray-700/60">
                <div className="text-sm">
                  Don't you have an account? <Link className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" href="/signup">Sign Up</Link>
                </div>
                {/* Warning */}
                <div className="mt-5">
                  
                </div>
              </div>
            </div>

          </div>
        </div>

        <AuthImage />

      </div>

    </main>
  )
}
