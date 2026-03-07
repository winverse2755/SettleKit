# 🚀 Quick Start Guide - Running Your New UI

## Step 1: Install Dependencies

Navigate to your client app directory and install all the new packages:

```bash
cd apps/client
npm install
```

This will install:

- Tailwind CSS and plugins
- All Radix UI primitives
- Lucide React icons
- Utility libraries

**Expected time:** 2-3 minutes

## Step 2: Clean Build Cache (Optional but Recommended)

Clear any old Next.js cache:

```bash
rm -rf .next
```

## Step 3: Start Development Server

```bash
npm run dev
```

The app will start at `http://localhost:3000`

## Step 4: Verify Everything Works

Open your browser and check:

✅ **Header**: Logo with gradient, wallet button
✅ **Background**: Animated gradient orbs
✅ **Hero**: Large gradient text
✅ **Feature Cards**: 4 cards with icons
✅ **Transfer Form**: All inputs and controls

## 🎨 What to Expect

### Landing Page

- Deep dark background with animated gradient orbs
- "SettleKit" branding with icon
- Large hero text: "Cross-Chain Liquidity Orchestration"
- 4 feature cards with icons (Connect, Configure, Bridge, Liquidity)

### Connect Wallet

1. Click "Connect Wallet" button (top right)
2. If no wallet: Beautiful modal with MetaMask/Coinbase options
3. If wallet detected: Connect and see address dropdown

### Main Flow

1. **Configuration Card**
   - USDC amount input with icon
   - Pool info badge (blue)
   - Risk policy settings (purple card)
   - Execution mode toggle
   - Large gradient action button

2. **Transaction Log** (appears after starting)
   - Timeline with icons
   - Expandable steps
   - Progress bar at bottom

3. **Risk Dashboard** (appears with simulation)
   - Confidence meter
   - Slippage metrics
   - Finality delays
   - Recommended action

## 🐛 Common Issues & Fixes

### Issue: "Module not found" errors

**Solution:**

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Styles not applying

**Solution:**

```bash
# Clear Next.js cache and restart
rm -rf .next
npm run dev
```

### Issue: TypeScript errors

**Solution:**
Check that all imports are correct:

```typescript
// Should be @/components/ui/... not @components/ui/...
import { Button } from "@/components/ui/button";
```

### Issue: Tailwind classes not working

**Solution:**
Verify `tailwind.config.ts` includes all paths:

```typescript
content: [
  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
];
```

## 📝 Customization Quick Wins

### Change Primary Color

Edit `tailwind.config.ts`:

```typescript
colors: {
  primary: "hsl(270 91.2% 59.8%)", // Purple instead of blue
}
```

### Change Brand Name

Edit `app/page.tsx`:

```typescript
<h1 className="text-xl font-bold gradient-text">YourName</h1>
```

### Add More Feature Cards

In `app/page.tsx`, add to the features array:

```typescript
{
  icon: YourIcon,
  title: 'Your Feature',
  desc: 'Description here',
  gradient: 'from-teal-500 to-blue-500'
}
```

### Adjust Animations

Edit `globals.css`:

```css
@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Slower animation: 8s → 15s */
.animate-gradient {
  animation: gradient-shift 15s ease infinite;
}
```

## 🎯 Testing Checklist

Before your hackathon presentation:

- [ ] Test on mobile device (responsive design)
- [ ] Test wallet connection flow
- [ ] Test simulation mode (should complete in ~5 seconds)
- [ ] Verify all animations are smooth
- [ ] Check console for no errors
- [ ] Test all expandable sections (transaction log)
- [ ] Verify all links open correctly
- [ ] Test in different browsers (Chrome, Firefox, Safari)

## 🏆 Hackathon Presentation Tips

1. **Start with wallet not connected** - Show the install modal
2. **Connect during demo** - Live connection is impressive
3. **Use simulation mode** - Faster, no real txs needed
4. **Highlight the risk dashboard** - Shows sophistication
5. **Expand transaction details** - Show the polish

## 🔥 Pro Tips

### Dark Mode Toggle (Future Enhancement)

The current design is dark-only. To add light mode:

```typescript
// In layout.tsx
<html lang="en" className="dark"> // Remove this for toggle
```

### Custom Toasts

Already styled! Uses react-hot-toast with your theme colors.

### Loading States

All buttons have loading states:

```typescript
<Button disabled={isRunning}>
  {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

## 📱 Mobile Testing

Test on mobile using:

1. **Chrome DevTools**: F12 → Toggle device toolbar (Ctrl+Shift+M)
2. **Ngrok/Localhost Tunnel**: Expose localhost to phone
3. **Network IP**: Use your computer's IP (e.g., 192.168.1.x:3000)

## 🎨 Design Tokens

Key values you might want to adjust:

```css
/* Border radius */
--radius: 0.5rem /* Roundness of cards/buttons */ /* Spacing */ container: 4rem
  /* Padding on main container */ /* Font sizes */ text-4xl: 2.25rem
  /* Hero mobile */ text-6xl: 3.75rem /* Hero desktop */;
```

## 🚢 Building for Production

```bash
npm run build
npm run start
```

Optimizations included:

- Automatic code splitting
- Image optimization
- CSS purging (Tailwind)
- Bundle minification

## 🎉 You're Ready!

Your SettleKit UI is now:

- ✅ Modern and professional
- ✅ Fully responsive
- ✅ Accessible
- ✅ Performant
- ✅ Hackathon-ready!

---

**Need help?** Check the component documentation at [ui.shadcn.com](https://ui.shadcn.com)

**Good luck at your hackathon! 🏆**
