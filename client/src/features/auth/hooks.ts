import { useAppSelector } from '../../app/hooks';

export function useAuth() {
  return useAppSelector((state) => state.auth);
}
