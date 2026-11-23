import {readFileSync} from 'node:fs';
import {parseOpenings} from '../opening_csv.js';

export const bundledOpenings=parseOpenings(
    readFileSync(new URL('../InitialPosition.csv',import.meta.url),'utf8'),
    {expected:96,strict:true},
);
