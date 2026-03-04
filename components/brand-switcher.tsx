'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react'
import { getBrands } from '@/lib/brands'
import type { BrandRow } from '@/lib/brands'

const CURRENT_BRAND_ID_COOKIE = 'current_brand_id'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year

function getCurrentBrandIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`${CURRENT_BRAND_ID_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1].trim()) : null
}

function setCurrentBrandIdCookie(brandId: string): void {
  document.cookie = `${CURRENT_BRAND_ID_COOKIE}=${encodeURIComponent(brandId)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export default function BrandSwitcher() {
  const [brands, setBrands] = useState<BrandRow[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const router = useRouter()

  const loadBrands = useCallback(async () => {
    const list = await getBrands()
    setBrands(list)
    const fromCookie = getCurrentBrandIdFromCookie()
    if (fromCookie && list.some((b) => b.id === fromCookie)) {
      setCurrentId(fromCookie)
    } else if (list.length > 0) {
      setCurrentId(list[0].id)
      setCurrentBrandIdCookie(list[0].id)
    } else {
      setCurrentId(null)
    }
  }, [])

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  const currentBrand = brands.find((b) => b.id === currentId)
  const displayName = currentBrand?.name || currentBrand?.domain || 'Select brand'
  const initial = (displayName.charAt(0) || '?').toUpperCase()

  const handleSelect = (brand: BrandRow) => {
    setCurrentId(brand.id)
    setCurrentBrandIdCookie(brand.id)
    router.refresh()
  }

  const handleAddNewBrand = () => {
    window.location.href = '/onboarding/brand'
  }

  if (brands.length === 0) return null

  return (
    <Menu as="div" className="relative inline-flex">
      <MenuButton className="inline-flex justify-center items-center group cursor-pointer">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500 text-white text-sm font-semibold shrink-0">
          {initial}
        </span>
        <div className="flex items-center truncate min-w-0">
          <span className="truncate ml-2 text-sm font-medium text-gray-600 dark:text-gray-100 group-hover:text-gray-800 dark:group-hover:text-white">
            {displayName}
          </span>
          <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
            <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
          </svg>
        </div>
      </MenuButton>
      <Transition
        as="div"
        className="origin-top-left z-10 absolute top-full left-0 min-w-[11rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1"
        enter="transition ease-out duration-200 transform"
        enterFrom="opacity-0 -translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
          <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">Current brand</div>
          <div className="font-medium text-gray-800 dark:text-gray-100 truncate mt-0.5">{displayName}</div>
        </div>
        <MenuItems as="ul" className="focus:outline-none">
          {brands.map((brand) => (
            <MenuItem key={brand.id} as="li">
              <button
                type="button"
                onClick={() => handleSelect(brand)}
                className={`font-medium text-sm flex items-center w-full py-1 px-3 cursor-pointer text-left ${
                  brand.id === currentId
                    ? 'text-violet-500 bg-violet-500/5 dark:bg-violet-500/10'
                    : 'text-gray-700 dark:text-gray-300 hover:text-violet-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {brand.id === currentId && (
                  <svg className="w-4 h-4 shrink-0 fill-current text-violet-500 mr-2" viewBox="0 0 16 16">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                )}
                <span className={brand.id === currentId ? '' : 'ml-6'}>{brand.name || brand.domain || 'Unnamed brand'}</span>
              </button>
            </MenuItem>
          ))}
          <MenuItem as="li" className="border-t border-gray-200 dark:border-gray-700/60 mt-1 pt-1 list-none">
            <button
              type="button"
              onClick={handleAddNewBrand}
              className="font-medium text-sm flex items-center w-full py-1 px-3 text-violet-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0 mr-2 text-violet-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add a new brand
            </button>
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  )
}
