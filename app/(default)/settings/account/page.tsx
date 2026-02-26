export const metadata = {
  title: 'Account settings',
  description: 'Manage your Yuzuu account and profile.',
}

import AccountPanel from './account-panel'

export default function AccountSettings() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">

      {/* Page header */}
      <div className="mb-8">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Account Settings</h1>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl mb-8">
        <AccountPanel />
      </div>

    </div>
  )
}