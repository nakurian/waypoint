import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SkillMeta } from '@/lib/content-loaders/skills';

export function SkillMatrix({ skills }: { skills: SkillMeta[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {skills.map((s) => (
        <Card key={s.slug}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="font-mono text-base">/{s.name}</span>
              {s.status === 'coming-soon' && (
                <Badge variant="secondary">coming-soon — Plan 3</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{s.description}</p>
            <div className="flex flex-wrap gap-1">
              {s.roles.map((r) => (
                <Badge key={r} variant="outline">
                  {r}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {s.ides.map((i) => (
                <Badge key={i}>{i}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
