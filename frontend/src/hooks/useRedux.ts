import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';

export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector);
export const useAppDispatch = () => useDispatch<AppDispatch>();
