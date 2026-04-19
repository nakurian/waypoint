import path from 'node:path';
import { mergeForVertical } from '@/lib/content-loaders/packs';
import { PackCompareToggle } from '@/components/pack-compare-toggle';

export default async function PacksComparePage() {
  const PACKS = path.resolve(process.cwd(), '../packs');
  // mergeForVertical already composes ibs-core + the vertical pack with the
  // correct mergePacks(core, [vertical]) signature. The plan's example called
  // mergePacks([core, vertical]) directly, which doesn't match transform-core.
  const cruise = await mergeForVertical(PACKS, 'cruise');
  const ota = await mergeForVertical(PACKS, 'ota');

  return (
    <>
      <section className="dark bg-waypoint-navy text-primary-foreground">
        <div className="container py-12">
          <h1 className="text-3xl font-bold mb-2">Compare the packs</h1>
          <p className="text-muted-foreground max-w-2xl">
            Same skills, different vocabulary. Each pack extends <code>ibs-core</code> with its
            vertical&apos;s glossary, services, patterns, and entities. Flip between them to see
            what your installed domain bundle would look like.
          </p>
        </div>
      </section>
      <section className="container py-8 max-w-5xl">
        <PackCompareToggle cruise={cruise} ota={ota} />
      </section>
    </>
  );
}
