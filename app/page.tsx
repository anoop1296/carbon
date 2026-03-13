'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VillageCarbonLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vw, setVw] = useState(1280);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const isMobile = vw < 768;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden font-sans">
      {/* ── NAVIGATION ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/80'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-4 md:py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shadow-md border-2 border-emerald-700/30">
              <img
                src="/images/6080892.png"
                alt="Leaf emblem"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                Village Carbon Dashboard
              </h1>
              <p className="text-xs text-emerald-700 font-medium">
                SLCR • Varanasi
              </p>
            </div>
          </div>

          {isMobile ? (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-xl text-gray-700 hover:text-emerald-700 transition-colors"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="
                bg-emerald-700 hover:bg-emerald-800 text-white
                font-semibold px-6 py-2.5 rounded-full shadow-lg
                hover:shadow-xl hover:shadow-emerald-300/30
                transition-all duration-300 text-base
              "
            >
              Open Dashboard →
            </Link>
          )}
        </div>

        {/* Mobile menu */}
        {isMobile && menuOpen && (
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <div className="px-5 py-5 flex flex-col gap-4">
              <Link
                href="/dashboard"
                className="
                  bg-emerald-700 text-white text-center font-semibold
                  py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all
                "
              >
                Open Dashboard →
              </Link>
              <a href="#process" className="text-center text-emerald-700 font-medium py-3">
                See the Process →
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO: TEXT LEFT – VIDEO RIGHT (no overlay) ── */}
      <section className="relative py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left: Text Content */}
            <div className="text-left">
              <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-5 py-2 rounded-full mb-6 text-sm font-medium text-emerald-800">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-400/40" />
                India–Denmark Joint Climate Initiative • 2024–2026
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-gray-900">
                Village Carbon Dashboard
              </h1>

              <p className="mt-6 text-lg md:text-xl text-gray-700 max-w-xl leading-relaxed">
                Empowering rural India to measure, reduce, and neutralize carbon emissions — building sustainable, climate-resilient villages.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="
                    bg-emerald-600 hover:bg-emerald-700 text-white
                    font-bold px-8 py-4 rounded-full shadow-lg shadow-emerald-300/30
                    hover:shadow-xl hover:shadow-emerald-400/40 hover:scale-105
                    transition-all duration-300 text-lg
                  "
                >
                  Explore Dashboard →
                </Link>

                <a
                  href="#process"
                  className="
                    border-2 border-emerald-600 text-emerald-700 font-bold
                    px-8 py-4 rounded-full hover:bg-emerald-50
                    transition-all duration-300 text-lg
                  "
                >
                  Learn the Steps →
                </a>
              </div>
            </div>

            {/* Right: Video (no overlay) */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster="/images/village-carbon-emissions-square.jpg"
                className="w-full h-auto aspect-video object-cover"
              >
                <source src="/images/vedio-1.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROCESS SECTION ── */}
      <section id="process" className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="text-center mb-14 md:mb-18">
            <div className="inline-block uppercase text-emerald-600 text-sm font-extrabold tracking-widest mb-4">
              Step-by-Step Path
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900">
              How Villages Become <span className="text-emerald-700">Carbon Neutral</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-9">
            {[
              { num: 1, title: 'Define Boundary', text: 'Establish the exact geographical area and catalog all emission sources.' },
              { num: 2, title: 'Prepare Baseline', text: 'Calculate current emissions and existing natural carbon sinks.' },
              { num: 3, title: 'Build Dashboard', text: 'Deploy real-time digital tracking of emissions, sequestration & net balance.' },
              { num: 4, title: 'Identify Hotspots', text: 'Pinpoint highest emission sectors — energy, agriculture, transport, waste.' },
              { num: 5, title: 'Implement Solutions', text: 'Deploy solar, biogas, efficient cookstoves, low-carbon farming practices.' },
              { num: 6, title: 'Boost Sequestration', text: 'Large-scale tree planting, agroforestry, soil health improvement.' },
              { num: 7, title: 'Continuous Monitoring', text: 'Regular data collection, dashboard updates, progress tracking.' },
              { num: 8, title: 'Achieve Neutrality', text: 'Emissions ≤ Sequestration → certified carbon-neutral village.' },
              { num: 9, title: 'Scale Regionally', text: 'Replicate model across neighboring villages → build climate-resilient clusters.' },
            ].map((step, i) => (
              <div
                key={i}
                className="
                  bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl
                  hover:-translate-y-2 transition-all duration-300 border border-gray-100
                "
              >
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="p-7 md:p-9">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-3xl font-bold text-emerald-700 border-2 border-emerald-200 shadow-inner">
                      {step.num}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16 md:mt-20">
            <Link
              href="/dashboard"
              className="
                inline-flex items-center gap-3 bg-emerald-700 hover:bg-emerald-800
                text-white font-bold px-10 py-5 rounded-full shadow-2xl shadow-emerald-900/30
                hover:shadow-2xl hover:shadow-emerald-900/40 hover:scale-105
                transition-all duration-300 text-lg md:text-xl
              "
            >
              View Real Village Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200 py-12 md:py-16 px-5 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-6">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-md">
              <img
                src="/images/6080892.png"
                alt="Leaf"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                Village Carbon Dashboard
              </h3>
              <p className="text-gray-600 mt-1 text-sm">SLCR • Varanasi</p>
            </div>
          </div>

          <p className="text-gray-600 text-base mb-3">
            Smart Laboratory on Clean Rivers (SLCR) • Varanasi
          </p>
          <p className="text-gray-500 text-sm">
            A joint initiative of India & Denmark • Ministry of Jal Shakti • © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}