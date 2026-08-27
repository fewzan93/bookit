import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-6xl font-bold text-zinc-700">404</p>
      <p className="text-muted-foreground">This page doesn't exist yet.</p>
      <Link to="/" className="text-sm text-primary underline-offset-4 hover:underline">
        Back home
      </Link>
    </div>
  );
}
