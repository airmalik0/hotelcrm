import React, { type ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  showIllustration?: boolean
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showIllustration = true,
}: AuthLayoutProps) {
  return (
    <section className="bg-white dark:bg-dark-2 flex flex-wrap min-h-screen">
      {showIllustration && (
        <div className="lg:w-1/2 lg:block hidden">
          <div className="flex items-center flex-col h-full justify-center">
            <div className="w-full max-w-md text-center">
              <div className="w-64 h-64 mx-auto mb-8 bg-gradient-to-br from-primary-600 to-purple-600 rounded-full flex items-center justify-center">
                <div className="w-48 h-48 bg-white dark:bg-dark-2 rounded-full flex items-center justify-center">
                  <div className="text-6xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                    CRM
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                Hotel CRM System
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage your hotel operations with ease
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`${showIllustration ? "lg:w-1/2" : "w-full"} py-8 px-6 flex flex-col justify-center`}
      >
        <div className="lg:max-w-[464px] mx-auto w-full">
          <div className="mb-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-white">H</span>
              </div>
            </div>
            <h4 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
              {title}
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-0">
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
