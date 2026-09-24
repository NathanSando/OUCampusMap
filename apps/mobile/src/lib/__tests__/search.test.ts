import type { Building } from '@ou-campus-map/shared-types';

import seed from '@/data/seed.generated.json';
import { searchBuildings } from '../search';

const buildings = seed.buildings as Building[];
const top = (q: string) => searchBuildings(buildings, q)[0]?.name;

// Definition of done #3: a building is findable by name, abbreviation, or common nickname.
describe('searchBuildings', () => {
  it('finds by name', () => {
    expect(top('Devon Energy Hall')).toBe('Devon Energy Hall');
    expect(top('gaylord hall')).toBe('Gaylord Hall');
  });

  it('finds by abbreviation', () => {
    expect(top('SEC')).toBe('Sarkeys Energy Center');
    expect(top('deh')).toBe('Devon Energy Hall');
    expect(top('OMU')).toBe('Oklahoma Memorial Union');
  });

  it('finds by nickname', () => {
    expect(top('the library')).toBe('Bizzell Memorial Library');
    expect(top('the Union')).toBe('Oklahoma Memorial Union');
    expect(top('Hester Hall')).toBe('Farzaneh Hall');
    expect(top('Memorial Stadium')).toBe('Gaylord Family–Oklahoma Memorial Stadium');
  });

  it('matches prefixes as the user types', () => {
    expect(searchBuildings(buildings, 'biz').map((b) => b.name)).toContain(
      'Bizzell Memorial Library',
    );
  });

  it('returns nothing for an empty query', () => {
    expect(searchBuildings(buildings, '   ')).toEqual([]);
  });
});
