'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// ============================================================================
// META DESIGN SYSTEM (DESIGN.md) TOKEN VALUES
// ============================================================================
const TOKENS = {
  colors: {
    primary: '#0064e0',        // Cobalt buy-now action
    primaryDeep: '#0457cb',    // Cobalt pressed
    primarySoft: '#0091ff',
    inkButton: '#000000',      // Marketing button pill
    canvas: '#ffffff',         // Stark white canvas
    surfaceSoft: '#f1f4f7',    // Soft cloud thumbnail & card bg
    inkDeep: '#0a1317',        // Primary headline & body
    ink: '#1c1e21',            // Secondary text
    charcoal: '#444950',
    slate: '#4b4c4f',
    steel: '#5d6c7b',
    stone: '#8595a4',
    hairline: '#ced0d4',
    hairlineSoft: '#dee3e9',
    success: '#31a24c',
    warning: '#f7b928',
    fbBlue: '#1876f2',
  },
  typography: {
    fontFamily: 'Optimistic VF, Montserrat, Helvetica, Arial, sans-serif',
    fontFeature: '"ss01", "ss02"',
  },
};

interface ColorOption {
  id: string;
  name: string;
  finish: string;
  hex: string;
  lensColor: string;
  images: string[];
}

interface LensOption {
  id: string;
  name: string;
  tagline: string;
  priceDelta: number;
}

const COLOR_VARIANTS: ColorOption[] = [
  {
    id: 'shiny-black',
    name: 'Shiny Black',
    finish: 'Classic Gloss Finish',
    hex: '#0a0a0a',
    lensColor: 'Polarized G15 Green',
    images: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'matte-black',
    name: 'Matte Black',
    finish: 'Tactile Velvet Satin',
    hex: '#2b2c2d',
    lensColor: 'Graduated Polarized Dark Grey',
    images: [
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'caramel-transparent',
    name: 'Caramel Transparent',
    finish: 'Translucent Acetate Glow',
    hex: '#8b5a2b',
    lensColor: 'Amber Gradient Sun',
    images: [
      'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'denim-blue',
    name: 'Jeans Blue Shiny',
    finish: 'Deep Cobalt Tint Frame',
    hex: '#1e3d59',
    lensColor: 'Mirrored Sapphire Blue',
    images: [
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

const LENS_OPTIONS: LensOption[] = [
  {
    id: 'standard-sun',
    name: 'Standard Sun Lenses',
    tagline: '100% UVA/UVB protection, everyday clarity',
    priceDelta: 0,
  },
  {
    id: 'polarized',
    name: 'Polarized Anti-Glare',
    tagline: 'Cuts 99% reflected glare, water & road clarity',
    priceDelta: 40,
  },
  {
    id: 'transitions',
    name: 'Transitions® GEN S™',
    tagline: 'Clear indoors, darkens in seconds under sunlight',
    priceDelta: 80,
  },
  {
    id: 'prescription',
    name: 'Prescription Ready',
    tagline: 'Single vision & progressive lens customization',
    priceDelta: 120,
  },
];

const FAQ_ITEMS = [
  {
    q: 'How does Meta AI work on the glasses?',
    a: 'Simply say "Hey Meta" to ask questions, translate signs in real time, take photos hands-free, or get contextual information on what you are looking at with the ultra-wide 12MP ultra-sensor.',
  },
  {
    q: 'Can I get these glasses with my prescription?',
    a: 'Yes! Ray-Ban Meta frames can be fitted with authentic prescription lenses directly through Meta.com or certified optical partners including LensCrafters and Pearle Vision.',
  },
  {
    q: 'How long does the battery last, and how do I recharge?',
    a: 'You get up to 4 hours of continuous use on a single charge. The included genuine leather companion charging case holds up to 32 additional hours of reserve power, giving you multiple full days on the go.',
  },
  {
    q: 'Are my photos and voice interactions private?',
    a: 'Yes. An exterior front-facing capture LED pulses visibly whenever you take a photo or record video so people around you always know. You have granular control over your stored media in the Meta View companion app.',
  },
  {
    q: 'Are the glasses water-resistant?',
    a: 'Yes, Ray-Ban Meta glasses feature an IPX4 water resistance rating, making them completely protected against rain showers and heavy workout sweat.',
  },
];

export default function MetaPDPPage() {
  const [selectedColor, setSelectedColor] = useState<ColorOption>(COLOR_VARIANTS[0]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedLens, setSelectedLens] = useState<LensOption>(LENS_OPTIONS[0]);
  const [selectedSize, setSelectedSize] = useState<'standard' | 'large'>('standard');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [cartSuccess, setCartSuccess] = useState<boolean>(false);

  const basePrice = 299;
  const totalPrice = basePrice + selectedLens.priceDelta;

  const handleAddToCart = () => {
    setCartSuccess(true);
    setTimeout(() => setCartSuccess(false), 3500);
  };

  return (
    <div
      className="min-h-screen bg-white text-[#0a1317] antialiased selection:bg-[#0064e0] selection:text-white"
      style={{ fontFamily: TOKENS.typography.fontFamily }}
    >
      {/* ==================================================================== */}
      {/* 1. PROMO BANNER (Above Nav — DESIGN.md: promo-banner) */}
      {/* ==================================================================== */}
      <aside
        className="w-full bg-[#0a1317] text-white px-4 py-2.5 sm:px-6 text-xs sm:text-sm font-semibold tracking-tight text-center flex items-center justify-center gap-2 relative z-50"
      >
        <span className="inline-block bg-[#f7b928] text-[#0a1317] text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
          Limited time
        </span>
        <span>
          Get free expedited shipping and a custom charging case with Ray-Ban Meta.
        </span>
        <button
          onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
          className="underline font-bold hover:text-[#0091ff] transition ml-1 cursor-pointer"
        >
          Configure now
        </button>
      </aside>

      {/* ==================================================================== */}
      {/* 2. TOP NAVIGATION (DESIGN.md: Desktop & Mobile Top Nav) */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#dee3e9] transition-all">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Meta Wordmark */}
          <div className="flex items-center gap-6">
            <Link href="/meta-pdp" className="flex items-center gap-2 group">
              {/* Meta Ribbon Infinity Symbol SVG */}
              <svg className="w-8 h-5 text-[#0a1317]" viewBox="0 0 24 16" fill="currentColor">
                <path d="M12 9.288c-1.396-2.076-2.923-3.708-4.57-3.708-2.613 0-4.43 2.115-4.43 4.92 0 2.805 1.817 4.92 4.43 4.92 1.647 0 3.174-1.632 4.57-3.708 1.396 2.076 2.923 3.708 4.57 3.708 2.613 0 4.43-2.115 4.43-4.92 0-2.805-1.817-4.92-4.43-4.92-1.647 0-3.174 1.632-4.57 3.708zm0-3.128C10.51 3.936 8.784 2 6.556 2 2.935 2 0 5.176 0 9.2c0 4.024 2.935 7.2 6.556 7.2 2.228 0 3.954-1.936 5.444-4.16 1.49 2.224 3.216 4.16 5.444 4.16 3.621 0 6.556-3.176 6.556-7.2 0-4.024-2.935-7.2-6.556-7.2-2.228 0-3.954 1.936-5.444 4.16z" />
              </svg>
              <span
                className="text-xl font-bold tracking-tight text-[#0a1317] group-hover:text-[#0064e0] transition"
                style={{ fontFeatureSettings: TOKENS.typography.fontFeature }}
              >
                Meta
              </span>
            </Link>

            {/* Pill Tabs (Desktop: button-pill-tab) */}
            <nav className="hidden lg:flex items-center gap-1.5 ml-4">
              <span className="bg-[#0a1317] text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xs">
                AI Glasses
              </span>
              <button className="bg-transparent hover:bg-[#f1f4f7] text-[#1c1e21] text-xs font-bold px-4 py-2 rounded-full border border-transparent hover:border-[#ced0d4] transition">
                Meta Quest
              </button>
              <button className="bg-transparent hover:bg-[#f1f4f7] text-[#1c1e21] text-xs font-bold px-4 py-2 rounded-full border border-transparent hover:border-[#ced0d4] transition">
                Ray-Ban Stories
              </button>
              <button className="bg-transparent hover:bg-[#f1f4f7] text-[#1c1e21] text-xs font-bold px-4 py-2 rounded-full border border-transparent hover:border-[#ced0d4] transition">
                Accessories
              </button>
            </nav>
          </div>

          {/* Right: Search Pill + Utility Buttons */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-[#f1f4f7] rounded-full px-3.5 py-1.5 border border-transparent focus-within:border-[#0064e0] focus-within:bg-white transition w-48 md:w-60">
              <svg className="w-4 h-4 text-[#5d6c7b] mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search Meta store..."
                className="bg-transparent text-xs text-[#1c1e21] placeholder-[#5d6c7b] outline-hidden w-full font-medium"
              />
            </div>

            {/* Account Icon (button-icon-circular) */}
            <button
              aria-label="Account"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white hover:bg-[#f1f4f7] border border-[#dee3e9] text-[#1c1e21] transition shadow-2xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {/* Bag Icon (button-icon-circular) with Active Badge */}
            <button
              onClick={handleAddToCart}
              aria-label="Shopping Bag"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white hover:bg-[#f1f4f7] border border-[#dee3e9] text-[#1c1e21] transition shadow-2xs relative"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#0064e0] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                1
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 3. BREADCRUMB (DESIGN.md: PDP Breadcrumb) */}
      {/* ==================================================================== */}
      <nav className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-5 pb-2">
        <ol className="flex items-center gap-2 text-xs text-[#5d6c7b] font-medium">
          <li>
            <Link href="/" className="hover:text-[#0a1317] transition">
              Hardware
            </Link>
          </li>
          <li className="text-[#8595a4] select-none">›</li>
          <li>
            <Link href="/meta-pdp" className="hover:text-[#0a1317] transition">
              AI Glasses
            </Link>
          </li>
          <li className="text-[#8595a4] select-none">›</li>
          <li>
            <span className="text-[#1c1e21] font-bold">
              Ray-Ban Meta Skyler (Gen 2)
            </span>
          </li>
        </ol>
      </nav>

      {/* ==================================================================== */}
      {/* 4. MAIN PDP SPLIT HERO: 58% GALLERY + 42% STICKY RAIL */}
      {/* ==================================================================== */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ================================================================ */}
          {/* LEFT COLUMN: PRODUCT GALLERY (DESIGN.md: product-gallery-pdp) */}
          {/* ================================================================ */}
          <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4 lg:gap-6 items-start">
            
            {/* 4-Up Vertical Thumbnail Strip */}
            <div className="flex md:flex-col gap-3 w-full md:w-20 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {selectedColor.images.map((imgUrl, idx) => {
                const isActive = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-[#f1f4f7] border-2 transition shrink-0 cursor-pointer ${
                      isActive ? 'border-[#0a1317] shadow-xs' : 'border-transparent hover:border-[#ced0d4]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-cover object-center"
                    />
                  </button>
                );
              })}
            </div>

            {/* Main Stage Image (rounded-32px full-bleed frame) */}
            <div className="flex-1 w-full relative bg-[#f1f4f7] rounded-[32px] overflow-hidden border border-[#dee3e9]/60 aspect-4/3 sm:aspect-square flex items-center justify-center p-4">
              {/* Badge Overlaid Top Left */}
              <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
                <span className="bg-[#0a1317] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                  New Gen 2
                </span>
                <span className="bg-white/90 backdrop-blur-xs text-[#0a1317] text-xs font-semibold px-3 py-1 rounded-full border border-[#dee3e9]">
                  Meta AI Inside
                </span>
              </div>

              {/* Main Photo with smooth transition */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`${selectedColor.id}-${activeImageIndex}`}
                src={selectedColor.images[activeImageIndex]}
                alt={`${selectedColor.name} Frame`}
                className="w-full h-full object-cover rounded-[24px] transform hover:scale-105 transition-transform duration-500 ease-out"
              />

              {/* Bottom Caption Pill */}
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between pointer-events-none">
                <span className="bg-white/95 backdrop-blur-xs text-[#0a1317] text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-xs border border-[#dee3e9]">
                  {selectedColor.name} · {selectedColor.lensColor}
                </span>
                <span className="bg-white/95 backdrop-blur-xs text-[#5d6c7b] text-xs font-medium px-3 py-1.5 rounded-full shadow-xs hidden sm:inline-block">
                  Click thumbnail to change angle
                </span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN: STICKY PURCHASE RAIL (card-checkout-summary) */}
          {/* ================================================================ */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 bg-white p-6 sm:p-8 rounded-[24px] border border-[#dee3e9] shadow-[0_1px_4px_0_rgba(20,22,26,0.08)]">
            
            {/* Header: Title, Category, Rating & Price */}
            <div className="space-y-2 border-b border-[#dee3e9] pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-[#5d6c7b]">
                  Smart Glasses
                </span>
                <div className="flex items-center gap-1 text-xs text-[#0a1317] font-bold">
                  <span className="text-[#f7b928]">★</span>
                  <span>4.8</span>
                  <span className="text-[#5d6c7b] font-normal">(1,248 reviews)</span>
                </div>
              </div>

              <h1
                className="text-3xl sm:text-4xl font-medium tracking-tight text-[#0a1317]"
                style={{
                  fontFamily: TOKENS.typography.fontFamily,
                  fontFeatureSettings: TOKENS.typography.fontFeature,
                }}
              >
                Ray-Ban | Meta Skyler
              </h1>
              <p className="text-sm text-[#444950] leading-relaxed">
                Classic iconic styling fused with hands-free capture, open-ear directional audio, and conversational Meta AI.
              </p>

              {/* Price Lock */}
              <div className="pt-2 flex items-baseline gap-3">
                <span className="text-3xl font-bold tracking-tight text-[#0a1317]">
                  ${totalPrice}
                </span>
                <span className="text-xs text-[#5d6c7b]">
                  or <strong className="text-[#0a1317] font-semibold">${Math.round(totalPrice / 12)}/mo</strong> with 0% APR 12-mo financing
                </span>
              </div>

              {/* Stock & Reassurance Pill */}
              <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-[#31a24c]">
                <span className="w-2 h-2 rounded-full bg-[#31a24c] animate-pulse" />
                <span>In stock · Free 2-day delivery & 30-day returns</span>
              </div>
            </div>

            {/* Option 1: Frame Color Swatches (color-sku-picker-row) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0a1317] uppercase tracking-wider">
                  1. Frame Color
                </span>
                <span className="text-[#5d6c7b] font-semibold">
                  {selectedColor.name} ({selectedColor.finish})
                </span>
              </div>

              {/* 4 Swatch Circles with 2px White Ring on Selection */}
              <div className="flex items-center gap-3">
                {COLOR_VARIANTS.map((c) => {
                  const isSelected = selectedColor.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c);
                        setActiveImageIndex(0);
                      }}
                      title={`${c.name} - ${c.finish}`}
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                        isSelected ? 'ring-2 ring-[#0a1317] ring-offset-2' : 'hover:scale-110'
                      }`}
                    >
                      <span
                        className="w-full h-full rounded-full border-2 border-white shadow-xs"
                        style={{ backgroundColor: c.hex }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Option 2: Lens Selection (radio-option & radio-option-selected) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0a1317] uppercase tracking-wider">
                  2. Lens Technology
                </span>
                <span className="text-[#0064e0] font-semibold cursor-pointer hover:underline">
                  Lens Guide
                </span>
              </div>

              <div className="space-y-2">
                {LENS_OPTIONS.map((lens) => {
                  const isSelected = selectedLens.id === lens.id;
                  return (
                    <button
                      key={lens.id}
                      type="button"
                      onClick={() => setSelectedLens(lens)}
                      className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#0064e0] bg-[#0064e0]/5 shadow-2xs'
                          : 'border border-[#dee3e9] bg-white hover:border-[#ced0d4]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs sm:text-sm font-bold text-[#0a1317]">
                          {lens.name}
                        </div>
                        <div className="text-[11px] text-[#5d6c7b]">
                          {lens.tagline}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#0a1317] shrink-0 ml-3">
                        {lens.priceDelta === 0 ? 'Included' : `+$${lens.priceDelta}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Option 3: Sizing (Pill Options) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0a1317] uppercase tracking-wider">
                  3. Frame Fit
                </span>
                <span className="text-[#5d6c7b]">Standard fits 90% of faces</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSize('standard')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold text-center border transition cursor-pointer ${
                    selectedSize === 'standard'
                      ? 'border-2 border-[#0064e0] bg-white text-[#0a1317]'
                      : 'border-[#dee3e9] text-[#5d6c7b] hover:border-[#ced0d4]'
                  }`}
                >
                  Standard (50-22)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize('large')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold text-center border transition cursor-pointer ${
                    selectedSize === 'large'
                      ? 'border-2 border-[#0064e0] bg-white text-[#0a1317]'
                      : 'border-[#dee3e9] text-[#5d6c7b] hover:border-[#ced0d4]'
                  }`}
                >
                  Large (53-22)
                </button>
              </div>
            </div>

            {/* Primary Action: Cobalt Buy CTA (button-buy-cta) */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full bg-[#0064e0] hover:bg-[#0457cb] active:bg-[#0457cb] text-white text-sm font-bold tracking-tight py-3.5 px-8 rounded-full transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Add to Bag</span>
                <span>•</span>
                <span>${totalPrice}</span>
              </button>

              {/* Feedback Alert on Add To Bag */}
              {cartSuccess && (
                <div className="bg-[#31a24c]/10 border border-[#31a24c]/30 text-[#31a24c] px-3.5 py-2 rounded-lg text-xs font-semibold text-center animate-fade-in">
                  ✓ Ray-Ban Meta Skyler added to your bag!
                </div>
              )}

              {/* Secondary Ghost CTA (button-secondary) */}
              <button
                type="button"
                className="w-full bg-transparent hover:bg-[#f1f4f7] text-[#0a1317] text-xs font-bold py-3 px-6 rounded-full border-2 border-[#0a1317] transition cursor-pointer"
              >
                Find in Retail Store
              </button>
            </div>

            {/* Warranty & Inclusions Callout (warranty-card) */}
            <div className="bg-[#f1f4f7] rounded-xl p-4 space-y-2 text-xs text-[#444950]">
              <div className="flex items-center gap-2 font-bold text-[#0a1317]">
                <span>🛡️</span>
                <span>Includes 1-Year Official Meta Limited Warranty</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#5d6c7b]">
                Box includes: Ray-Ban Meta glasses, genuine leather recharging case, USB-C to USB-C charging cord, microfiber cleaning cloth.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ==================================================================== */}
      {/* 5. REASSURANCE 4-UP TILES (DESIGN.md: feature-icon-row / why-buy-tile) */}
      {/* ==================================================================== */}
      <section className="border-t border-[#dee3e9] bg-[#f1f4f7]/40 py-12 px-4 sm:px-8 mt-16">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#dee3e9] space-y-2 shadow-2xs">
            <span className="text-2xl">📦</span>
            <h2 className="text-sm font-bold text-[#0a1317]">Free 2-Day Delivery</h2>
            <p className="text-xs text-[#5d6c7b] leading-relaxed">
              Order today and receive fast, carbon-neutral shipping straight to your doorstep.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#dee3e9] space-y-2 shadow-2xs">
            <span className="text-2xl">🔄</span>
            <h2 className="text-sm font-bold text-[#0a1317]">30-Day Hassle-Free Returns</h2>
            <p className="text-xs text-[#5d6c7b] leading-relaxed">
              Try them at home for a month. If you are not completely satisfied, return them for a full refund.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#dee3e9] space-y-2 shadow-2xs">
            <span className="text-2xl">⚡</span>
            <h2 className="text-sm font-bold text-[#0a1317]">0% APR Monthly Financing</h2>
            <p className="text-xs text-[#5d6c7b] leading-relaxed">
              Split your purchase into 12 interest-free payments with Affirm or Klarna at checkout.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#dee3e9] space-y-2 shadow-2xs">
            <span className="text-2xl">🛡️</span>
            <h2 className="text-sm font-bold text-[#0a1317]">Worry-Free 1Y Warranty</h2>
            <p className="text-xs text-[#5d6c7b] leading-relaxed">
              Full coverage against hardware defects with optional accidental damage extensions.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. FULL-BLEED PHOTOGRAPHIC FEATURE CARDS (card-product-feature) */}
      {/* ==================================================================== */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0064e0]">
            Hardware Engineering
          </span>
          <h2
            className="text-3xl sm:text-5xl font-medium tracking-tight text-[#0a1317]"
            style={{ fontFeatureSettings: TOKENS.typography.fontFeature }}
          >
            Advanced. Inside and out.
          </h2>
          <p className="text-base text-[#444950]">
            Ray-Ban iconic craftsmanship packed with cutting-edge optical intelligence.
          </p>
        </div>

        {/* 3-Up Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: 12MP Camera */}
          <div className="bg-white rounded-[32px] overflow-hidden border border-[#dee3e9] flex flex-col shadow-xs group">
            <div className="h-64 sm:h-72 w-full overflow-hidden bg-[#f1f4f7] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80"
                alt="Ultra-wide 12MP Camera"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 bg-[#0a1317]/80 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full">
                12MP Ultrawide
              </span>
            </div>
            <div className="p-6 sm:p-8 space-y-2 flex-1">
              <h3 className="text-xl font-bold text-[#0a1317]">
                First-Person 1080p Video
              </h3>
              <p className="text-xs sm:text-sm text-[#5d6c7b] leading-relaxed">
                Take high-resolution photos and livestream directly to Instagram and Facebook hands-free. View the world through your authentic perspective.
              </p>
            </div>
          </div>

          {/* Card 2: Meta AI Voice */}
          <div className="bg-white rounded-[32px] overflow-hidden border border-[#dee3e9] flex flex-col shadow-xs group">
            <div className="h-64 sm:h-72 w-full overflow-hidden bg-[#f1f4f7] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80"
                alt="Meta AI with Vision"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 bg-[#0064e0] text-white text-[11px] font-bold px-3 py-1 rounded-full">
                Conversational AI
              </span>
            </div>
            <div className="p-6 sm:p-8 space-y-2 flex-1">
              <h3 className="text-xl font-bold text-[#0a1317]">
                Say &quot;Hey Meta&quot; to Explore
              </h3>
              <p className="text-xs sm:text-sm text-[#5d6c7b] leading-relaxed">
                Ask questions about whatever you are looking at. Translate foreign signs on the fly, write witty captions, or check recommendations on your route.
              </p>
            </div>
          </div>

          {/* Card 3: Directional Open-Ear Sound */}
          <div className="bg-white rounded-[32px] overflow-hidden border border-[#dee3e9] flex flex-col shadow-xs group">
            <div className="h-64 sm:h-72 w-full overflow-hidden bg-[#f1f4f7] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=1200&q=80"
                alt="Discreet Open-Ear Audio"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 bg-[#0a1317]/80 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full">
                Custom Micro-Speakers
              </span>
            </div>
            <div className="p-6 sm:p-8 space-y-2 flex-1">
              <h3 className="text-xl font-bold text-[#0a1317]">
                Discreet Open-Ear Audio
              </h3>
              <p className="text-xs sm:text-sm text-[#5d6c7b] leading-relaxed">
                Custom speakers deliver rich bass and clear vocal isolation while keeping your ears open to the world around you, with minimal sound leakage.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. TECH SPECS TABLE (DESIGN.md: tech-specs-table) */}
      {/* ==================================================================== */}
      <section className="max-w-[1000px] mx-auto px-4 sm:px-8 py-16 border-t border-[#dee3e9]">
        <div className="space-y-3 mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#5d6c7b]">
            Specifications
          </span>
          <h2
            className="text-3xl sm:text-4xl font-medium tracking-tight text-[#0a1317]"
            style={{ fontFeatureSettings: TOKENS.typography.fontFeature }}
          >
            Technical Specifications
          </h2>
        </div>

        <div className="divide-y divide-[#dee3e9] border-y border-[#dee3e9]">
          <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0a1317]">Camera</span>
            <span className="sm:col-span-2 text-xs sm:text-sm text-[#444950]">
              12MP ultra-wide sensor, 1080p @ 30fps video, portrait mode auto-framing
            </span>
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0a1317]">Audio</span>
            <span className="sm:col-span-2 text-xs sm:text-sm text-[#444950]">
              Custom open-ear 2-speaker array with dual bass reflex ports; 5-microphone array with beamforming noise cancellation
            </span>
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0a1317]">Battery & Charging</span>
            <span className="sm:col-span-2 text-xs sm:text-sm text-[#444950]">
              Up to 4 hours per charge; up to 36 hours total with included portable leather charging case (50% charge in 22 min)
            </span>
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0a1317]">Memory & Storage</span>
            <span className="sm:col-span-2 text-xs sm:text-sm text-[#444950]">
              32GB flash storage (stores up to 500+ photos or 100+ thirty-second videos)
            </span>
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0a1317]">Connectivity & Sensors</span>
            <span className="sm:col-span-2 text-xs sm:text-sm text-[#444950]">
              Wi-Fi 6, Bluetooth 5.3, capacitive touch sensor on temple, capture button, wear-detection proximity sensor
            </span>
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0a1317]">Water Resistance</span>
            <span className="sm:col-span-2 text-xs sm:text-sm text-[#444950]">
              IPX4 water-resistant rating against rain, sweat, and splashes
            </span>
          </div>

          <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#0a1317]">Weight</span>
            <span className="sm:col-span-2 text-xs sm:text-sm text-[#444950]">
              48.6 grams (almost identical to standard non-smart Ray-Ban frames)
            </span>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 8. FAQ ACCORDION (DESIGN.md: faq-accordion) */}
      {/* ==================================================================== */}
      <section className="max-w-[1000px] mx-auto px-4 sm:px-8 py-16 border-t border-[#dee3e9]">
        <div className="space-y-3 mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#5d6c7b]">
            Got Questions?
          </span>
          <h2
            className="text-3xl sm:text-4xl font-medium tracking-tight text-[#0a1317]"
            style={{ fontFeatureSettings: TOKENS.typography.fontFeature }}
          >
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-[#dee3e9] rounded-2xl bg-white overflow-hidden transition shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#0a1317] hover:text-[#0064e0] transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className={`text-xl transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-[#5d6c7b] leading-relaxed border-t border-[#dee3e9]/60 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 9. SITE FOOTER (DESIGN.md: footer-region) */}
      {/* ==================================================================== */}
      <footer className="border-t border-[#dee3e9] bg-white py-16 px-4 sm:px-8 text-xs text-[#5d6c7b]">
        <div className="max-w-[1280px] mx-auto space-y-12">
          {/* Multi-column grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="space-y-3">
              <h3 className="font-bold text-[#0a1317] text-xs uppercase tracking-wider">
                Hardware
              </h3>
              <ul className="space-y-2">
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Ray-Ban Meta Glasses</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Meta Quest 3S</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Meta Quest 3</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Charging Cases</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Accessories & Cables</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-[#0a1317] text-xs uppercase tracking-wider">
                Meta AI
              </h3>
              <ul className="space-y-2">
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Voice Commands</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Live Multimodal Vision</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Translation</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Meta View App</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-[#0a1317] text-xs uppercase tracking-wider">
                Support & Warranty
              </h3>
              <ul className="space-y-2">
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Order Status</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Returns & Exchanges</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Find a Retail Store</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Prescription Lenses</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Help Center</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-[#0a1317] text-xs uppercase tracking-wider">
                Company
              </h3>
              <ul className="space-y-2">
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">About Meta</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Sustainability</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Newsroom</Link></li>
                <li><Link href="/meta-pdp" className="hover:text-[#0a1317] transition">Careers</Link></li>
              </ul>
            </div>

            <div className="space-y-3 col-span-2 md:col-span-1">
              <h3 className="font-bold text-[#0a1317] text-xs uppercase tracking-wider">
                Language & Region
              </h3>
              <div className="space-y-2">
                <button className="flex items-center gap-2 border border-[#dee3e9] rounded-lg px-3 py-1.5 text-xs text-[#0a1317] font-semibold hover:border-[#0a1317] transition">
                  <span>🌐 United States (English)</span>
                </button>
                <p className="text-[11px] text-[#8595a4]">
                  Prices shown in USD. Taxes calculated at checkout.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Legal Links */}
          <div className="pt-8 border-t border-[#dee3e9] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#8595a4]">
            <p>© {new Date().getFullYear()} Meta Platforms, Inc. Ray-Ban is a registered trademark of Luxottica Group S.p.A.</p>
            <div className="flex flex-wrap items-center gap-4 text-[#5d6c7b]">
              <Link href="/privacidade" className="hover:underline">Privacy Policy</Link>
              <Link href="/privacidade" className="hover:underline">Terms of Service</Link>
              <Link href="/privacidade" className="hover:underline">Cookie Settings</Link>
              <Link href="/privacidade" className="hover:underline">Consumer Health Privacy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* 10. MOBILE STICKY CHECKOUT BAR (< 768px - DESIGN.md: Responsive) */}
      {/* ==================================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#dee3e9] p-4 flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="min-w-0">
          <div className="text-xs text-[#5d6c7b] truncate">
            {selectedColor.name} · {selectedLens.name}
          </div>
          <div className="text-base font-bold text-[#0a1317] leading-tight">
            ${totalPrice}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="bg-[#0064e0] hover:bg-[#0457cb] active:bg-[#0457cb] text-white text-xs sm:text-sm font-bold py-3 px-6 rounded-full transition shadow-xs shrink-0 cursor-pointer"
        >
          Add to Bag
        </button>
      </div>
    </div>
  );
}
