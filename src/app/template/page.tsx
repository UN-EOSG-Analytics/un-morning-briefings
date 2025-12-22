import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex min-h-screen justify-center bg-background px-4 sm:px-6">
        <div className="max-w-2xl py-8 lg:max-w-3xl">
          {/* Logo */}
          <Image
            src={`${basePath}/images/UN_Logo_Stacked_Colour_English.svg`}
            alt="UN Logo"
            width={200}
            height={48}
            className="mb-12 h-10 w-auto select-none sm:h-12"
            draggable={false}
          />

          {/* Header */}
          <header className="mb-5">
            <h1 className="text-3xl font-bold text-foreground">
              UN Website Boilerplate
            </h1>
          </header>

          {/* Content */}
          <section>
            <p className="leading-relaxed">
              A modern, responsive foundation for United Nations web
              applications.
            </p>
          </section>

          {/* GitHub Link */}
          <a
            href="https://github.com/kleinlennart/un-website-boilerplate"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-un-blue hover:underline"
          >
            <Github className="h-5 w-5" />
            <span>View on GitHub</span>
          </a>

          {/* Theme Colors Showcase */}
          <section className="mt-6">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Theme Colors
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-un-blue" />
                <div>
                  <p className="text-sm font-medium text-foreground">UN Blue</p>
                  <p className="text-xs text-gray-600">#009EDB</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-faded-jade" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Faded Jade
                  </p>
                  <p className="text-xs text-gray-600">#4A7C7E</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-camouflage-green" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Camouflage Green
                  </p>
                  <p className="text-xs text-gray-600">#7D8471</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-pale-oyster" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pale Oyster
                  </p>
                  <p className="text-xs text-gray-600">#9B8B7A</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-au-chico" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Au Chico
                  </p>
                  <p className="text-xs text-gray-600">#A0665C</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-smoky" />
                <div>
                  <p className="text-sm font-medium text-foreground">Smoky</p>
                  <p className="text-xs text-gray-600">#6C5B7B</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-shuttle-gray" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Shuttle Gray
                  </p>
                  <p className="text-xs text-gray-600">#5A6C7D</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-trout" />
                <div>
                  <p className="text-sm font-medium text-foreground">Trout</p>
                  <p className="text-xs text-gray-600">#495057</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-20 rounded-lg bg-dusty-gray" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Dusty Gray
                  </p>
                  <p className="text-xs text-gray-600">#969696</p>
                </div>
              </div>
            </div>
          </section>

          {/* Grayscale Showcase */}
          <section className="mt-12">
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Grayscale
            </h2>
            <a
              href="https://tailwindcss.com/docs/colors"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 inline-block text-sm text-un-blue hover:underline"
            >
              from Tailwind CSS
            </a>
            <div className="space-y-0 overflow-hidden rounded-lg">
              <div className="bg-black p-6">
                <p className="font-bold text-white">black</p>
              </div>
              <div className="bg-gray-950 p-6">
                <p className="font-bold text-white">gray-950</p>
              </div>
              <div className="bg-gray-900 p-6">
                <p className="font-bold text-white">gray-900</p>
              </div>
              <div className="bg-gray-800 p-6">
                <p className="font-bold text-white">gray-800</p>
              </div>
              <div className="bg-gray-700 p-6">
                <p className="font-bold text-white">gray-700</p>
              </div>
              <div className="bg-gray-600 p-6">
                <p className="font-bold text-white">gray-600</p>
              </div>
              <div className="bg-gray-500 p-6">
                <p className="font-bold text-white">gray-500</p>
              </div>
              <div className="bg-gray-400 p-6">
                <p className="font-bold text-black">gray-400</p>
              </div>
              <div className="bg-gray-300 p-6">
                <p className="font-bold text-black">gray-300</p>
              </div>
              <div className="bg-gray-200 p-6">
                <p className="font-bold text-black">gray-200</p>
              </div>
              <div className="bg-gray-100 p-6">
                <p className="font-bold text-black">gray-100</p>
              </div>
              <div className="bg-gray-50 p-6">
                <p className="font-bold text-black">gray-50</p>
              </div>
              <div className="bg-white p-6">
                <p className="font-bold text-black">white</p>
              </div>
            </div>
          </section>

          {/* Components Section Header */}
          <section className="mt-16">
            <h2 className="mb-2 text-3xl font-bold text-foreground">
              Components
            </h2>
            <p className="mb-6 text-foreground">
              Explore the component library with reusable UI elements.
            </p>
            <Link
              href="/component-library"
              className="inline-flex items-center gap-2 text-un-blue hover:underline"
            >
              <span>View Full Component Library</span>
            </Link>
          </section>

          {/* Typography Showcase */}
          <section className="mt-12">
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Typography Scale
            </h2>
            <p className="mb-6 text-sm text-gray-600">Roboto Font Family</p>
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-xs · 0.75rem (12px)
                </p>
                <p className="text-xs text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-sm · 0.875rem (14px)
                </p>
                <p className="text-sm text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-base · 1rem (16px)
                </p>
                <p className="text-base text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-lg · 1.125rem (18px)
                </p>
                <p className="text-lg text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-xl · 1.25rem (20px)
                </p>
                <p className="text-xl text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-2xl · 1.5rem (24px)
                </p>
                <p className="text-2xl text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-3xl · 1.875rem (30px)
                </p>
                <p className="text-3xl text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="mb-2 text-xs text-gray-600">
                  text-4xl · 2.25rem (36px)
                </p>
                <p className="text-4xl text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-600">
                  text-5xl · 3rem (48px)
                </p>
                <p className="text-5xl text-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
