import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-fade-in">
      <div className="text-9xl font-black gradient-text">404</div>
      <div>
        <h1 className="text-2xl font-bold text-primary">Page not found</h1>
        <p className="text-secondary mt-2">The page you are looking for does not exist or has been moved.</p>
      </div>
      <Button onClick={() => navigate('/dashboard')} leftIcon={<Home size={16} />}>
        Back to Dashboard
      </Button>
    </div>
  );
}
