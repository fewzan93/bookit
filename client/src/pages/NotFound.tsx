import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-6xl font-bold text-zinc-700">404</p>
      <p className="text-zinc-400">This page is not part of the plan yet.</p>
      <Link to="/" className="text-sm text-fuchsia-400 underline-offset-4 hover:underline">
        Back home
      </Link>
    </div>
  );
}
