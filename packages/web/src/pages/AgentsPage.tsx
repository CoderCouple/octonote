import { Bot } from 'lucide-react';
import { ComingSoon } from '@/components/layout/ComingSoon';

export function AgentsPage() {
  return (
    <ComingSoon
      icon={Bot}
      title="Agents"
      description="Saved AI agents you can run against your vault — each with its own prompt, model, and toolset. Like saved searches, but for Claude."
      bullets={[
        'Author agents in markdown with structured front-matter',
        'Run an agent on the current note or the whole vault',
        'See every agent run in the brain — fully audited',
      ]}
    />
  );
}
