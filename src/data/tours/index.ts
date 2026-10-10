import type { Tour } from '../types';
import { tomares } from './tomares';

export const TOURS: Tour[] = [tomares];

export const getTour = (id: string) => TOURS.find(t => t.id === id);
