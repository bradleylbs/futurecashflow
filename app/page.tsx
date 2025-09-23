import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Landmark, Hammer, Truck, Linkedin, Twitter, ArrowRight, Check, TrendingUp, DollarSign, AlertTriangle, Building } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Logo with brand blue (solid, no gradient)
export const LogoIcon = ({ className = "w-10 h-10 text-blue-500" }) => (
  <div className="relative">
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 80 80">
      <path d="M40 8L16 32H26L40 18L54 32H64L40 8Z" />
      <path d="M40 28L16 52H26L40 38L54 52H64L40 28Z" />
    </svg>
  </div>
)

// Hero Section - solid black background, solid blue accents (no shiny effects)
const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
      
      <div className="container relative z-10 text-center px-4">
        <div className="max-w-6xl mx-auto">
          {/* Logo and company name */}
          <div className="flex items-center justify-center gap-8 mb-16">
            <div className="relative">
              <LogoIcon className="w-16 h-16 lg:w-20 lg:h-20 text-blue-500" />
            </div>
            <div className="flex items-baseline">
              <h1 className="font-black text-6xl lg:text-8xl xl:text-9xl tracking-tight text-white">
                Future
              </h1>
              <div className="border-l-4 h-16 lg:h-20 xl:h-24 mx-6 bg-blue-500 w-1 rounded-full"></div>
              <span className="font-light text-4xl lg:text-6xl xl:text-7xl text-white whitespace-nowrap">
                Finance Cashflow 
              </span>
            </div>
          </div>

          {/* Tagline pill */}
          <div className="mb-16">
            <div className="inline-block bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-medium">
              African Mining Supply Chain Finance Reimagined
            </div>
          </div>

          {/* Credit provider info */}
          <div className="mb-8">
            <p className="text-gray-300 text-base">
              Future Mining Finance (Pty) Ltd is a registered Credit Provider NCRCP18174
            </p>
          </div>
        </div>
        {/* CTAs */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link href="/register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/auth/login" className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-100 px-6 py-3 rounded-xl font-semibold transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}

// Company Description (black background, solid accents)
const CompanyDescriptionSection = () => {
  return (
    <section className="relative bg-black text-white py-24 overflow-hidden">
      <div className="container relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="space-y-8 text-2xl lg:text-3xl leading-relaxed font-light">
            <div className="mb-16">
              <p>
                <span className="font-semibold">Future Mining Finance is a fintech and funding platform</span> enabling
                mining companies to offer{" "}
                <span className="bg-blue-600 text-white rounded-full px-6 py-2 font-semibold">
                  early payment
                </span>{" "}
                programs for SMEs in their supply chain.
              </p>
            </div>
            
            <div className="mb-16">
              <p>
                Africa's mining sector can have a much greater impact on SMEs,
                but most mines take too long to pay their suppliers.
              </p>
            </div>
            
            <div>
              <p>
                Through our platform, suppliers can receive{" "}
                <span className="underline decoration-blue-500 underline-offset-4">immediate payments</span>{" "}
                for approved invoices, improving their{" "}
                <span className="underline decoration-blue-500 underline-offset-4">cash flow</span>{" "}
                and fostering sustainable growth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Problem Section Icons - Exact match to presentation
const PaymentTermsIcon = () => (
  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
    <div className="text-center text-white">
      <div className="text-2xl font-bold">90</div>
      <div className="text-xs">DAYS</div>
    </div>
  </div>
)

const FundingBarriersIcon = () => (
  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
    <Building className="w-10 h-10 text-white" />
  </div>
)

const CashflowIssuesIcon = () => (
  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
    <DollarSign className="w-10 h-10 text-white" />
  </div>
)

const InefficiencyIcon = () => (
  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
    <AlertTriangle className="w-10 h-10 text-white" />
  </div>
)

// Problem Section (black background, red chip, gray copy)
const ProblemSection = () => {
  return (
    <section className="relative bg-black text-white py-24 overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <div className="bg-red-600 text-white px-8 py-4 rounded-full inline-block mb-8">
            <h2 className="text-2xl font-bold">THE PROBLEM WE'RE SOLVING</h2>
          </div>
          <p className="text-xl text-gray-300 mb-12">
            Most mines take too long to pay their suppliers...
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Payment Terms */}
          <div className="text-center">
            <PaymentTermsIcon />
            <h3 className="font-bold text-xl mb-4 mt-6">Payment Terms</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Suppliers face long payment cycles, with the industry average of 90 days severely impacting their cashflow.
            </p>
          </div>

          {/* Funding Barriers */}
          <div className="text-center">
            <FundingBarriersIcon />
            <h3 className="font-bold text-xl mb-4 mt-6">Funding Barriers</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              SMEs lack access to affordable financing, making it hard to bridge the gap between invoicing and payment.
            </p>
          </div>

          {/* Cashflow Issues */}
          <div className="text-center">
            <CashflowIssuesIcon />
            <h3 className="font-bold text-xl mb-4 mt-6">Cashflow Issues</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              SMEs often struggle with cashflow due to mines' extended payment terms, causing instability.
            </p>
          </div>

          {/* Inefficiency */}
          <div className="text-center">
            <InefficiencyIcon />
            <h3 className="font-bold text-xl mb-4 mt-6">Inefficiency</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Supplier instability disrupts supply chains, reduces quality and increases costs for mining operations.
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-300 max-w-4xl mx-auto">
            ...too few financiers have provided fast, tech-enabled, scalable solutions based on a{" "}
            <span className="underline decoration-blue-500">mine's credit risk</span>
          </p>
        </div>
      </div>
    </section>
  )
}

// Solution Icons - Exact match to presentation
const FastPayoutIcon = () => (
  <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center">
    <div className="text-white text-center">
      <div className="text-2xl">⚡</div>
    </div>
  </div>
)

const AffordableRatesIcon = () => (
  <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center">
    <div className="text-white text-center">
      <div className="text-2xl">%</div>
    </div>
  </div>
)

const EasyApplicationIcon = () => (
  <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center">
    <div className="text-white text-center">
      <div className="text-2xl">✓</div>
    </div>
  </div>
)

const MiningFocusedIcon = () => (
  <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center">
    <Hammer className="w-10 h-10 text-white" />
  </div>
)

// Solution Section (black background, solid blue accents)
const SolutionSection = () => {
  return (
    <section className="relative bg-black text-white py-24 overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <div className="bg-white text-black px-8 py-4 rounded-full inline-block mb-8">
            <h2 className="text-2xl font-bold">OUR SOLUTION</h2>
          </div>
          <p className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto">
            Our tech-platform integrates with a mine's accounts payable, to give their suppliers the option to receive immediate payment for approved invoices...
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Fast Payout */}
          <div className="text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-blue-600 text-white">
              <div className="text-2xl">⚡</div>
            </div>
            <h3 className="font-bold text-lg mb-4 mt-6">Fast approval and payment for verified suppliers</h3>
            <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-4">
              FAST PAYOUT
            </div>
          </div>

          {/* Affordable Rates */}
          <div className="text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-blue-600 text-white">
              <div className="text-2xl">%</div>
            </div>
            <h3 className="font-bold text-lg mb-4 mt-6">Our developmental focus empowers suppliers</h3>
            <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-4">
              AFFORDABLE RATES
            </div>
          </div>

          {/* Easy Application */}
          <div className="text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-blue-600 text-white">
              <div className="text-2xl">✓</div>
            </div>
            <h3 className="font-bold text-lg mb-4 mt-6">Frictionless journey backed by the best systems</h3>
            <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-4">
              EASY APPLICATION
            </div>
          </div>

          {/* Mining Focused */}
          <div className="text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-blue-600 text-white">
              <Hammer className="w-10 h-10 text-white" />
            </div>
            <h3 className="font-bold text-lg mb-4 mt-6">Our systems are tailored for mining, unlike non-specialist financing</h3>
            <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-4">
              MINING FOCUSED
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// How it Works Section (black background, white pill header)
const HowItWorksSection = () => {
  return (
    <section className="relative bg-black text-white py-24 overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <div className="bg-white text-black px-8 py-4 rounded-full inline-block mb-8">
            <h2 className="text-2xl font-bold">HOW SUPPLY CHAIN FINANCE WORKS</h2>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
              1
            </div>
            <p className="text-lg">
              A <span className="underline">supplier delivers</span> (R100) worth of goods to a mine, and the <span className="underline">mine approves their invoice</span>.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
              2
            </div>
            <p className="text-lg">
              <span className="underline">We notify the supplier</span> that their invoice is approved and offer them the choice of either getting paid (R95) immediately by us or waiting the usual 90 days to get paid their (R100) by the mine.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
              3
            </div>
            <p className="text-lg">
              If the supplier chooses to receive (R95) immediately <span className="underline">we pay it to them</span> and the mine pays us the (R100) directly after 90 days.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
              ✓
            </div>
            <p className="text-lg">
              It therefore costs the supplier just (R5) to get paid early by us, instead of them waiting 90 days.
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
              ✓
            </div>
            <p className="text-lg">
              We make R5 gross profit on the transaction and then repay our big loans with interest to the banks and financiers that give us the capital to make this all happen.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Ecosystem Section (black background, white pill header, solid accents)
const EcosystemSection = () => {
  return (
    <section className="relative bg-black text-white py-24 overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <div className="bg-white text-black px-8 py-4 rounded-full inline-block mb-8">
            <h2 className="text-2xl font-bold">OUR ECOSYSTEM</h2>
          </div>
          <p className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto">
            We are a platform and ecosystem business, adding value by connecting cash from banks and funders with mines' suppliers that need it the most.
          </p>
        </div>

        <div className="space-y-8 max-w-6xl mx-auto">
          {/* Funders */}
          <div className="flex items-center gap-8">
            <div className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg">
              FUNDERS
            </div>
            <div className="bg-gray-600 p-4 rounded-xl">
              <Landmark className="w-12 h-12 text-white" />
            </div>
            <p className="flex-1 text-lg">
              Banks and lenders lend our fund capital at a rate based on a mine's credit risk.
            </p>
          </div>

          {/* Mines */}
          <div className="flex items-center gap-8">
            <div className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg">
              MINES
            </div>
            <div className="bg-gray-600 p-4 rounded-xl">
              <Hammer className="w-12 h-12 text-white" />
            </div>
            <p className="flex-1 text-lg">
              Mines give us access to their accounts payable so that we can offer their suppliers immediate discounted payment for their invoices.
            </p>
          </div>

          {/* Suppliers */}
          <div className="flex items-center gap-8">
            <div className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg">
              SUPPLIERS
            </div>
            <div className="bg-gray-600 p-4 rounded-xl">
              <Truck className="w-12 h-12 text-white" />
            </div>
            <p className="flex-1 text-lg">
              Suppliers can elect to receive an immediate discounted payment for their invoices, already approved by the mine.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <LogoIcon className="w-8 h-8 text-blue-500" />
            <span className="font-bold text-white text-xl">Future Mining Finance</span>
          </div>
          <p className="text-base mb-6">
            Future Mining Finance (Pty) Ltd is a registered Credit Provider NCRCP18174
          </p>
          <div className="text-sm">
            &copy; 2025 Future Mining Finance. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

// Main Component
export default function LandingPage() {
  return (
    <div className="bg-black text-white">
      <HeroSection />
      <CompanyDescriptionSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <EcosystemSection />
      <Footer />
    </div>
  )
}