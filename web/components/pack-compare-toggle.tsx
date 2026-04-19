'use client';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { DomainBundle } from '@waypoint/transform-core';

type Vertical = 'cruise' | 'ota';

export function PackCompareToggle({ cruise, ota }: { cruise: DomainBundle; ota: DomainBundle }) {
  const [active, setActive] = useState<Vertical>('cruise');
  const bundle = active === 'cruise' ? cruise : ota;

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Button
          variant={active === 'cruise' ? 'default' : 'outline'}
          onClick={() => setActive('cruise')}
        >
          cruise
        </Button>
        <Button
          variant={active === 'ota' ? 'default' : 'outline'}
          onClick={() => setActive('ota')}
        >
          ota
        </Button>
      </div>
      <Tabs defaultValue="glossary">
        <TabsList>
          <TabsTrigger value="glossary">Glossary ({bundle.glossary.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({bundle.services.length})</TabsTrigger>
          <TabsTrigger value="patterns">Patterns ({bundle.patterns.length})</TabsTrigger>
          <TabsTrigger value="entities">Entities ({bundle.entities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="glossary">
          <ul className="divide-y">
            {bundle.glossary.map((g) => (
              <li key={g.term} className="py-3">
                <strong>{g.term}.</strong> {g.definition}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="services">
          {/*
            transform-core's Service shape is { name, purpose, techStack? } —
            the plan's example rendered s.description which doesn't exist on the
            actual pack JSON. Render purpose (required) + techStack (optional).
          */}
          <ul className="divide-y">
            {bundle.services.map((s) => (
              <li key={s.name} className="py-3">
                <strong>{s.name}.</strong> {s.purpose}
                {s.techStack && s.techStack.length > 0 ? (
                  <span className="text-muted-foreground text-xs ml-2">
                    [{s.techStack.join(', ')}]
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="patterns">
          {/*
            transform-core's Pattern shape is { name, when, why } — the plan's
            example rendered p.summary which doesn't exist. Show both axes so
            the reader sees the trigger condition AND the rationale.
          */}
          <ul className="divide-y">
            {bundle.patterns.map((p) => (
              <li key={p.name} className="py-3">
                <strong>{p.name}.</strong>{' '}
                <span className="text-muted-foreground">When:</span> {p.when}{' '}
                <span className="text-muted-foreground">Why:</span> {p.why}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="entities">
          <ul className="divide-y">
            {bundle.entities.map((e) => (
              <li key={e.name} className="py-3">
                <strong>{e.name}.</strong> {e.description}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
