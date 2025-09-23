# Brand Components Usage Guide

## Available Components

The following brand components are available for consistent blue styling of "Future Cashflow" and "Cashflow" throughout the application:

### 1. `LogoIcon`
Basic logo component with customizable styling:
```tsx
import { LogoIcon } from '@/components/brand-logo'

<LogoIcon className="w-8 h-8 text-blue-600" />
```

### 2. `CashflowBrand`
"Cashflow" text with optional icon:
```tsx
import { CashflowBrand } from '@/components/brand-logo'

<CashflowBrand showIcon={true} iconSize="w-6 h-6" />
<CashflowBrand showIcon={false} className="text-lg" />
```

### 3. `FutureCashflowBrand`
"Future Cashflow" text with optional icon:
```tsx
import { FutureCashflowBrand } from '@/components/brand-logo'

<FutureCashflowBrand showIcon={true} iconSize="w-8 h-8" />
<FutureCashflowBrand showIcon={false} className="text-xl" />
```

### 4. `FutureCashflowLink`
Interactive link version with hover effects:
```tsx
import { FutureCashflowLink } from '@/components/brand-logo'

<FutureCashflowLink href="/" iconSize="w-10 h-10" />
<FutureCashflowLink href="/dashboard" onClick={handleClick}>
  Custom Text
</FutureCashflowLink>
```

## Design System

### Colors
- Primary blue: `from-blue-600 to-blue-800`
- Icon color: `text-blue-600`
- Hover states: `from-blue-700 to-blue-900`

### Typography
- Font weight: `font-bold`
- Gradient text: `bg-gradient-to-r bg-clip-text text-transparent`

### Animations
- Scale on hover: `hover:scale-105`
- Smooth transitions: `transition-all duration-300`
- Icon color transitions: `transition-colors duration-300`

## Updated Files

All instances of "Future Cashflow" and "Cashflow" have been updated with consistent blue styling:

1. **Landing Page** (`app/page.tsx`)
2. **Authentication Pages** (`app/auth/login/`, `app/register/`)
3. **Dashboard Pages** (`app/dashboard/buyer/`)
4. **Loading Pages** (all loading.tsx files)
5. **Facility Application** (`app/facility-application/`)
6. **Email Templates** (`lib/email.tsx`)

## Benefits

- **Consistent Branding**: All "Future Cashflow" and "Cashflow" instances now use the same blue gradient styling
- **Reusable Components**: Easy to maintain and update brand styling across the application
- **Better UX**: Logo icons provide visual consistency and brand recognition
- **Responsive Design**: Components work well at different sizes and breakpoints
