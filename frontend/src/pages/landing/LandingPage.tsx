import React from 'react';
import { Box, Typography, Button, Container, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { LocalPharmacy, TrendingUp, Inventory, Receipt, People, Security, BarChart, ShoppingCart } from '@mui/icons-material';

const features = [
  { icon: <Receipt sx={{ fontSize: 28 }} />, title: 'GST Sales Billing', desc: 'Generate CGST/SGST/IGST invoices in seconds. Batch tracking, walk-in & registered customer support.', color: '#1565C0' },
  { icon: <ShoppingCart sx={{ fontSize: 28 }} />, title: 'Purchase Management', desc: 'Track supplier invoices with batch, expiry, MRP & PTR. Auto stock updates on every purchase.', color: '#2E7D32' },
  { icon: <Inventory sx={{ fontSize: 28 }} />, title: 'Smart Inventory', desc: 'Real-time stock with low stock alerts, expiry warnings and reorder level monitoring.', color: '#F57F17' },
  { icon: <BarChart sx={{ fontSize: 28 }} />, title: 'Live Dashboard', desc: "Today's sales, profit & stock value at a glance. Monthly Sales vs Purchase vs Profit charts.", color: '#7B52F6' },
  { icon: <People sx={{ fontSize: 28 }} />, title: 'Customer & Supplier CRM', desc: 'Manage profiles with GSTIN, DL number, credit limits and payment history.', color: '#00695C' },
  { icon: <Security sx={{ fontSize: 28 }} />, title: 'Role-Based Access', desc: 'Admin, Pharmacist and Cashier roles with secure JWT authentication.', color: '#C62828' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      {/* NAV */}
      <Box component="nav" sx={{
        position: 'fixed', top: 0, width: '100%', zIndex: 100,
        backdropFilter: 'blur(16px)',
        bgcolor: 'rgba(255,255,255,0.9)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        px: { xs: 2, md: 6 }, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg,#1565C0,#0288D1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocalPharmacy sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: '#1565C0', lineHeight: 1 }}>MedNex</Typography>
            <Typography sx={{ fontSize: '0.58rem', color: '#94A3B8', letterSpacing: 1, fontWeight: 600 }}>PHARMACY ERP</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" size="small" onClick={() => navigate('/login')} sx={{ borderRadius: 2, fontWeight: 600 }}>Sign In</Button>
          <Button variant="contained" size="small" onClick={() => navigate('/login')} sx={{ borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg,#1565C0,#0288D1)' }}>Open App →</Button>
        </Box>
      </Box>

      {/* HERO */}
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg,#F8FAFF 0%,#EEF2FF 40%,#E3F2FD 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', pt: 14, pb: 10, px: 3,
      }}>
        <Chip
          label="🟢 GST-Compliant · Live Dashboard · Instant Invoicing"
          sx={{ mb: 3, fontWeight: 600, fontSize: '0.78rem', bgcolor: 'rgba(21,101,192,0.08)', color: '#1565C0', border: '1px solid rgba(21,101,192,0.2)', borderRadius: 50 }}
        />
        <Typography variant="h1" sx={{
          fontSize: { xs: '2.5rem', md: '5rem' }, fontWeight: 900,
          lineHeight: 1.05, letterSpacing: '-2px', color: '#0d1b4b', mb: 3,
        }}>
          Smart Pharmacy<br />
          <Box component="span" sx={{ background: 'linear-gradient(135deg,#1565C0,#7B52F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Billing Made Simple
          </Box>
        </Typography>
        <Typography sx={{ fontSize: { xs: '1rem', md: '1.2rem' }, color: '#475569', maxWidth: 580, mb: 5, lineHeight: 1.8 }}>
          MedNex is a complete GST Pharmacy Billing & Management System — sales, purchases, inventory, invoicing, and real-time analytics. All in one place.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained" size="large"
            onClick={() => navigate('/login')}
            sx={{ borderRadius: 3, fontWeight: 700, fontSize: '1rem', px: 3.5, py: 1.5, background: 'linear-gradient(135deg,#1565C0,#0288D1)', boxShadow: '0 8px 28px rgba(21,101,192,0.35)', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 36px rgba(21,101,192,0.45)' } }}
          >
            🚀 Open Dashboard
          </Button>
          <Button
            variant="outlined" size="large"
            href="https://vayunexsolution.com" target="_blank"
            sx={{ borderRadius: 3, fontWeight: 600, fontSize: '1rem', px: 3.5, py: 1.5, borderColor: '#E2E8F0', color: '#1E293B' }}
          >
            About VayuNex →
          </Button>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: { xs: 3, md: 6 }, flexWrap: 'wrap', justifyContent: 'center', mt: 8 }}>
          {[
            { num: '100%', label: 'GST Compliant' },
            { num: 'A4 PDF', label: 'Instant Invoices' },
            { num: 'Live', label: 'Dashboard Charts' },
            { num: 'Multi', label: 'Payment Modes' },
          ].map(s => (
            <Box key={s.label} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#1565C0' }}>{s.num}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* FEATURES */}
      <Box sx={{ py: 12, px: { xs: 3, md: 6 }, bgcolor: '#F8FAFC' }}>
        <Container maxWidth="lg">
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#1565C0', mb: 1.5 }}>Everything You Need</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, fontWeight: 800, color: '#1E293B', mb: 2 }}>Built for Modern Pharmacies</Typography>
          <Typography sx={{ color: '#475569', fontSize: '1.05rem', maxWidth: 520, mb: 7, lineHeight: 1.75 }}>
            From a small medical shop to a multi-outlet chain — MedNex handles it all.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 3 }}>
            {features.map(f => (
              <Box key={f.title} sx={{
                bgcolor: '#fff', borderRadius: 4, p: 3.5, border: '1px solid #E2E8F0',
                transition: 'all 0.25s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.10)', borderColor: '#BFDBFE' },
                position: 'relative', overflow: 'hidden',
                '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${f.color}, #7B52F6)`, opacity: 0, transition: 'opacity 0.3s' },
                '&:hover::before': { opacity: 1 },
              }}>
                <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, mb: 2 }}>
                  {f.icon}
                </Box>
                <Typography sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>{f.title}</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.65 }}>{f.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* VAYUNEX SECTION */}
      <Box sx={{
        py: 12, px: { xs: 3, md: 6 },
        background: 'linear-gradient(160deg,#0d1b4b 0%,#1a237e 50%,#1565C0 100%)',
        color: '#fff',
      }}>
        <Container maxWidth="lg">
          {/* Logo */}
          <Box sx={{ mb: 6 }}>
            <Typography sx={{ 
              fontSize: { xs: '3.5rem', md: '5.5rem' }, 
              fontWeight: 900, 
              letterSpacing: '-2px', 
              lineHeight: 1,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.4) 100%)',
              backgroundSize: '200% auto',
              color: 'transparent',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              animation: 'shine 4s linear infinite',
              '@keyframes shine': {
                'to': {
                  backgroundPosition: '200% center'
                }
              }
            }}>
              VAYUNEX
            </Typography>
            <Typography sx={{ fontSize: '1rem', letterSpacing: 8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', mt: 0.5 }}>S O L U T I O N</Typography>
          </Box>
          <Typography sx={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, maxWidth: 640, mb: 6 }}>
            VayuNex Solution is a <strong style={{ color: '#fff' }}>product-led engineering firm</strong> based in the Chandigarh Tricity, India — building and scaling enterprise SaaS products while delivering custom software for industry partners. MedNex is one of our flagship healthcare solutions.
          </Typography>
          {/* Services */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5, mb: 6 }}>
            {[
              { icon: '💻', title: 'Software & Web Dev', desc: 'Full-stack web apps, ERPs, e-commerce platforms and custom business software.' },
              { icon: '🤖', title: 'AI Solutions', desc: 'VayuNex Assist AI agent, chatbots, AI-powered workflows and CRM integrations.' },
              { icon: '📈', title: 'Growth & Marketing', desc: 'SEO, Google & Meta Ads, content marketing and digital growth consulting.' },
              { icon: '🏗️', title: 'Virtual CTO', desc: 'Technical strategy, architecture decisions and implementation leadership.' },
              { icon: '👔', title: 'Recruitment Services', desc: 'End-to-end tech recruitment and staffing solutions for growing teams.' },
              { icon: '🏥', title: 'Healthcare Tech', desc: 'Clinic lead engines, patient CRM management and appointment automation.' },
            ].map(s => (
              <Box key={s.title} sx={{
                bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4, p: 3, transition: 'all 0.25s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', transform: 'translateY(-3px)' },
              }}>
                <Typography sx={{ fontSize: '1.6rem', mb: 1.5 }}>{s.icon}</Typography>
                <Typography sx={{ fontWeight: 700, mb: 1, fontSize: '0.95rem' }}>{s.title}</Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.65 }}>{s.desc}</Typography>
              </Box>
            ))}
          </Box>
          {/* Products */}
          <Box sx={{ mb: 6 }}>
            <Typography sx={{ fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', mb: 2, fontWeight: 600 }}>Our Product Ecosystem</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {['💊 MedNex', '💳 PayNex', '💎 Jwelnex', '📱 SocialNex', '🏫 SchoolDost', '📦 InventoryNex', '🤖 VayuNex Assist'].map(p => (
                <Box key={p} sx={{ bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, px: 2.5, py: 0.75, fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{p}</Box>
              ))}
            </Box>
          </Box>
          {/* CTA */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4, p: { xs: 3, md: 4 }, flexWrap: 'wrap', gap: 3,
          }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', mb: 0.5 }}>Need a custom solution for your business?</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Contact VayuNex Solution — we build what your industry demands.</Typography>
            </Box>
            <Button
              variant="contained" href="https://vayunexsolution.com" target="_blank"
              sx={{ bgcolor: '#fff', color: '#1565C0', fontWeight: 700, borderRadius: 2, px: 3, py: 1.2, '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-2px)' } }}
            >
              Visit VayuNex Solution →
            </Button>
          </Box>
          <Typography sx={{ textAlign: 'center', mt: 5, fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textTransform: 'uppercase' }}>
            ⚡ Engineered in India · Built with precision · Powered by passion
          </Typography>
        </Container>
      </Box>

      {/* CTA BANNER */}
      <Box sx={{ py: 10, px: 3, background: 'linear-gradient(135deg,#1565C0 0%,#7B52F6 100%)', textAlign: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, fontWeight: 900, color: '#fff', mb: 2 }}>
          Ready to Modernise Your Pharmacy?
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.05rem', maxWidth: 520, mx: 'auto', mb: 4 }}>
          Join pharmacies across India using MedNex for faster billing, smarter inventory, and full GST compliance.
        </Typography>
        <Button
          variant="contained" size="large"
          onClick={() => navigate('/login')}
          sx={{ bgcolor: '#fff', color: '#1565C0', fontWeight: 800, fontSize: '1rem', px: 4, py: 1.5, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.2)', '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-2px)' } }}
        >
          Get Started → Open App
        </Button>
      </Box>

      {/* FOOTER */}
      <Box component="footer" sx={{ bgcolor: '#1E293B', color: 'rgba(255,255,255,0.65)', pt: 8, pb: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 6, mb: 6 }}>
            {/* Brand */}
            <Box>
              <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>MedNex</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, mb: 2 }}>PHARMACY MANAGEMENT SYSTEM</Typography>
              <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.75, maxWidth: 300, mb: 2.5 }}>
                A complete GST-compliant pharmacy billing and inventory management platform for Indian pharmacies.
              </Typography>
              <Box
                component="a" href="https://vayunexsolution.com" target="_blank"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, px: 2, py: 1.2, textDecoration: 'none', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <Box sx={{ width: 28, height: 28, borderRadius: 1, background: 'linear-gradient(135deg,#5C6BC0,#7B52F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: '#fff' }}>Vx</Box>
                <Box>
                  <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>Powered by</Typography>
                <Typography sx={{ 
                  fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.4,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.4) 100%)',
                  backgroundSize: '200% auto',
                  color: 'transparent',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  animation: 'shine 4s linear infinite',
                }}>VAYUNEX SOLUTION</Typography>
                </Box>
              </Box>
            </Box>
            {/* Links */}
            <Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', mb: 2.5 }}>Product</Typography>
              {['Sales Billing', 'Purchase Entry', 'Stock Management', 'Reports', 'GST Invoicing', 'Settings'].map(l => (
                <Box key={l} onClick={() => navigate('/login')} sx={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', mb: 1.5, cursor: 'pointer', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>{l}</Box>
              ))}
            </Box>
            {/* VayuNex */}
            <Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', mb: 2.5 }}>VayuNex Solution</Typography>
              {[['About Us', 'https://vayunexsolution.com'], ['Services', 'https://vayunexsolution.com'], ['Products', 'https://vayunexsolution.com'], ['VayuNex Assist', 'https://vayunexsolution.com'], ['Careers', 'https://vayunexsolution.com'], ['Contact', 'https://vayunexsolution.com']].map(([l, href]) => (
                <Box key={l} component="a" href={href} target="_blank" sx={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', mb: 1.5, textDecoration: 'none', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>{l}</Box>
              ))}
            </Box>
          </Box>
          {/* Bottom */}
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', pt: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>MedNex</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>© 2025 VayuNex Solution. All Rights Reserved.</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
              Engineered in India 🇮🇳 · Built with ❤️ by{' '}
              <Box component="a" href="https://vayunexsolution.com" target="_blank" sx={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', '&:hover': { color: '#fff' } }}>
                VayuNex Solution
              </Box>
            </Typography>
          </Box>
        </Container>
      </Box>

    </Box>
  );
};

export default LandingPage;
