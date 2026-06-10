import { Shuffle } from 'lucide-react';
import { ComingSoon } from '@/components/layout/ComingSoon';

export function TransformerPage() {
  return (
    <ComingSoon
      icon={Shuffle}
      title="Transformer"
      description="Run AI transformations across notes: rewrite, summarise, translate, extract action items, reformat. Pick the input, pick the transform, get the output."
      bullets={[
        'Pre-built transforms: summarise, simplify, translate, extract todos',
        'Custom transforms backed by saved Claude prompts',
        'Batch transform multiple notes at once',
      ]}
    />
  );
}
