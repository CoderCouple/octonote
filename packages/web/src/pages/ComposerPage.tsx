import { Wand2 } from 'lucide-react';
import { ComingSoon } from '@/components/layout/ComingSoon';

export function ComposerPage() {
  return (
    <ComingSoon
      icon={Wand2}
      title="Composer"
      description="A prompt-driven canvas to compose long-form content — drafts, briefs, posts — with Claude as your co-writer. Save the output straight into your vault."
      bullets={[
        'Multi-turn drafts with branches you can compare',
        'Pull in context from existing notes via [[wikilinks]]',
        'One-click "Save as note" / "Save as plan"',
      ]}
    />
  );
}
