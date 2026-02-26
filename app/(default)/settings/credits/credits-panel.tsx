'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

export default function CreditsPanel() {
  const searchParams = useSearchParams()
  const showSuccess = searchParams.get('success') === '1'
  const [loadingPack, setLoadingPack] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBuy = useCallback(async (pack: string) => {
    setError(null)
    setLoadingPack(pack)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      if (data.url) window.location.href = data.url
      else throw new Error('No checkout URL')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoadingPack(null)
    }
  }, [])

  return (
    <div className="grow">

      <div className="p-6 space-y-6">

        {showSuccess && (
          <div className="p-4 rounded-lg bg-green-500/10 dark:bg-green-500/20 text-green-800 dark:text-green-200 border border-green-500/30">
            Payment successful. Your credits have been added to your account.
          </div>
        )}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-800 dark:text-red-200 border border-red-500/30">
            {error}
          </div>
        )}

        <section>
          <div className="mb-2">
            <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">Pay as you go</h2>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">You only pay for what you need. No subscriptions, no monthly payment, no hidden fees.</div>
            <div className="grid grid-cols-12 gap-6">
              <div className="relative col-span-full xl:col-span-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-sm rounded-b-lg">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500" aria-hidden="true"></div>
                <div className="px-5 pt-5 pb-6 border-b border-gray-200 dark:border-gray-700/60">
                  <header className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full shrink-0 bg-green-500 mr-3">
                      <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M12 17a.833.833 0 01-.833-.833 3.333 3.333 0 00-3.334-3.334.833.833 0 110-1.666 3.333 3.333 0 003.334-3.334.833.833 0 111.666 0 3.333 3.333 0 003.334 3.334.833.833 0 110 1.666 3.333 3.333 0 00-3.334 3.334c0 .46-.373.833-.833.833z" />
                      </svg>
                    </div>
                    <h3 className="text-lg text-gray-800 dark:text-gray-100 font-semibold">50 credits</h3>
                  </header>
                  <div className="text-sm mb-2 text-gray-600 dark:text-gray-400">50 Product Photos (Studio & Lifestyle)</div>
                  <div className="text-gray-800 dark:text-gray-100 font-bold mb-4">
                    <span className="text-2xl">$</span><span className="text-3xl">27</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy('50')}
                    disabled={!!loadingPack}
                    className="btn border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 w-full disabled:opacity-50"
                  >
                    {loadingPack === '50' ? 'Redirecting…' : 'Buy'}
                  </button>
                </div>
                <div className="px-5 pt-4 pb-5">
                  <div className="text-xs text-gray-800 dark:text-gray-100 font-semibold uppercase mb-4">What&apos;s included</div>
                  <ul>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">4K quality</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Unlimited products</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Unlimited campaigns</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Use on PDPs, ads, socials</div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="relative col-span-full xl:col-span-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-sm rounded-b-lg">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-sky-500" aria-hidden="true"></div>
                <div className="px-5 pt-5 pb-6 border-b border-gray-200 dark:border-gray-700/60">
                  <header className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full shrink-0 bg-sky-500 mr-3">
                      <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M12 17a.833.833 0 01-.833-.833 3.333 3.333 0 00-3.334-3.334.833.833 0 110-1.666 3.333 3.333 0 003.334-3.334.833.833 0 111.666 0 3.333 3.333 0 003.334 3.334.833.833 0 110 1.666 3.333 3.333 0 00-3.334 3.334c0 .46-.373.833-.833.833z" />
                      </svg>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg text-gray-800 dark:text-gray-100 font-semibold">100 credits</h3>
                      <span className="text-xs inline-flex font-medium bg-sky-500/20 text-sky-700 dark:text-sky-300 rounded-full px-2.5 py-1">Most popular</span>
                    </div>
                  </header>
                  <div className="text-sm mb-2 text-gray-600 dark:text-gray-400">100 Product Photos (Studio & Lifestyle)</div>
                  <div className="text-gray-800 dark:text-gray-100 font-bold mb-4">
                    <span className="text-2xl">$</span><span className="text-3xl">47</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy('100')}
                    disabled={!!loadingPack}
                    className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white w-full disabled:opacity-50"
                  >
                    {loadingPack === '100' ? 'Redirecting…' : 'Buy'}
                  </button>
                </div>
                <div className="px-5 pt-4 pb-5">
                  <div className="text-xs text-gray-800 dark:text-gray-100 font-semibold uppercase mb-4">What&apos;s included</div>
                  <ul>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">4K quality</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Unlimited products</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Unlimited campaigns</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Use on PDPs, ads, socials</div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="relative col-span-full xl:col-span-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-sm rounded-b-lg">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500" aria-hidden="true"></div>
                <div className="px-5 pt-5 pb-6 border-b border-gray-200 dark:border-gray-700/60">
                  <header className="flex items-center mb-2">
                    <div className="w-6 h-6 rounded-full shrink-0 bg-violet-500 mr-3">
                      <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M12 17a.833.833 0 01-.833-.833 3.333 3.333 0 00-3.334-3.334.833.833 0 110-1.666 3.333 3.333 0 003.334-3.334.833.833 0 111.666 0 3.333 3.333 0 003.334 3.334.833.833 0 110 1.666 3.333 3.333 0 00-3.334 3.334c0 .46-.373.833-.833.833z" />
                      </svg>
                    </div>
                    <h3 className="text-lg text-gray-800 dark:text-gray-100 font-semibold">200 credits</h3>
                  </header>
                  <div className="text-sm mb-2 text-gray-600 dark:text-gray-400">200 Product Photos (Studio & Lifestyle)</div>
                  <div className="text-gray-800 dark:text-gray-100 font-bold mb-4">
                    <span className="text-2xl">$</span><span className="text-3xl">97</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy('200')}
                    disabled={!!loadingPack}
                    className="btn border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 w-full disabled:opacity-50"
                  >
                    {loadingPack === '200' ? 'Redirecting…' : 'Buy'}
                  </button>
                </div>
                <div className="px-5 pt-4 pb-5">
                  <div className="text-xs text-gray-800 dark:text-gray-100 font-semibold uppercase mb-4">What&apos;s included</div>
                  <ul>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">4K quality</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Unlimited products</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Unlimited campaigns</div>
                    </li>
                    <li className="flex items-center py-1">
                      <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                        <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                      </svg>
                      <div className="text-sm">Use on PDPs, ads, socials</div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="px-5 py-3 bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04] rounded-lg text-center xl:text-left xl:flex xl:flex-wrap xl:justify-between xl:items-center">
            <div className="text-gray-800 dark:text-gray-100 font-semibold mb-2 xl:mb-0">Looking for buying credits in large volumes?</div>
            <a href="mailto:hello@yuzuu.co" className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white">Contact us</a>
          </div>
        </section>

        <section>
          <div className="my-8">
            <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">FAQs</h2>
          </div>
          <ul className="space-y-6">
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Isn&apos;t AI product photography obvious?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>Usually it is. That&apos;s the problem. Most AI photos are over-polished, over-lit, and instantly feel fake. Our approach is the opposite: subtle, imperfect, believable. If someone can tell it&apos;s AI, the job failed.</p>
              </div>
            </li>
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Will this work on real product pages, not just ads?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>Yes. These photos are designed to live on PDPs, landing pages, paid ads, and marketplaces. They don&apos;t scream &quot;campaign visual&quot; — they blend in like a real studio shoot.</p>
              </div>
            </li>
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Are you redesigning or &apos;improving&apos; my product?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>No. Your product stays 100% unchanged: same proportions, colors, textures, and packaging details. No creative interpretation, no AI &quot;enhancement&quot;.</p>
              </div>
            </li>
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                How is this different from other AI photo tools?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>Most tools optimize for &quot;wow, this looks cool.&quot; We optimize for &quot;this feels real enough to trust&quot;: natural lighting, realistic results, no AI smoothing or glow, no stock-photo stiffness. Conversion beats novelty.</p>
              </div>
            </li>
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Will customers know this was made with AI?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>They won&apos;t ask — and that&apos;s the point. If the photo feels real, the question never comes up. People think &quot;do I trust this product?&quot; not &quot;is this AI?&quot;</p>
              </div>
            </li>
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Why not just do a real photoshoot?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>You can, when it makes sense. But real shoots are expensive, slow, hard to iterate, and painful to reshoot for every variation. This gives you studio-quality results faster and cheaper, without the coordination.</p>
              </div>
            </li>
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                What if the result doesn&apos;t feel right?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>You can regenerate or adjust. The goal isn&apos;t just delivery — it&apos;s confidence using the image on your product page.</p>
              </div>
            </li>
            <li>
              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Who is this not for?
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>This is not for AI art projects, fantasy visuals, or over-stylized branding. It&apos;s for brands who care about trust and conversion.</p>
              </div>
            </li>
          </ul>
        </section>

      </div>

    </div>
  )
}
