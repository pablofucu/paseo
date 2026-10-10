import type { Tour } from '../types';
import { sevilla } from './sevilla';
import { tomares } from './tomares';

export const TOURS: Tour[] = [sevilla, tomares];

export const getTour = (id: string) => TOURS.find(t => t.id === id);
