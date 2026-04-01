import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import type { GraphData, GraphNode, GraphEdge } from '@/types';
import * as d3 from 'd3';

// ---------------------------------------------------------------------------
// D3 simulation node / link types (extend with x, y for force layout)
// ---------------------------------------------------------------------------

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  linkCount: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GraphPage() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch graph data
  useEffect(() => {
    setLoading(true);
    api.graph
      .get()
      .then((data) => {
        setGraphData(data);
      })
      .catch(() => {
        setGraphData({ nodes: [], edges: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  // Navigation callback for node click
  const navigateToNote = useCallback(
    (nodeId: string) => {
      navigate(`/notes/${nodeId}`);
    },
    [navigate],
  );

  // D3 setup
  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr('width', width).attr('height', height);

    // Prepare data copies for D3 (D3 mutates these in-place)
    const nodes: SimNode[] = graphData.nodes.map((n: GraphNode) => ({
      id: n.id,
      title: n.title,
      linkCount: n.linkCount,
    }));

    const links: SimLink[] = graphData.edges.map((e: GraphEdge) => ({
      source: e.source,
      target: e.target,
    }));

    // Build a lookup for quick checks
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    // Filter links to only include those whose source and target exist
    const validLinks = links.filter(
      (l) =>
        nodeById.has(typeof l.source === 'string' ? l.source : l.source.id) &&
        nodeById.has(typeof l.target === 'string' ? l.target : l.target.id),
    );

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(validLinks)
          .id((d) => d.id)
          .distance(80),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Zoom behavior
    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Edge lines
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(validLinks)
      .join('line')
      .attr('stroke', 'hsl(var(--muted-foreground) / 0.3)')
      .attr('stroke-width', 1);

    // Node groups
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => Math.max(6, Math.min(16, 6 + d.linkCount * 2)))
      .attr('fill', 'hsl(var(--primary))')
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 2);

    // Node labels
    node
      .append('text')
      .text((d) => d.title)
      .attr('x', (d) => Math.max(6, Math.min(16, 6 + d.linkCount * 2)) + 6)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('pointer-events', 'none');

    // Hover: highlight connected edges
    node.on('mouseenter', (_event, d) => {
      link.attr('stroke', (l) => {
        const srcId = typeof l.source === 'string' ? l.source : (l.source as SimNode).id;
        const tgtId = typeof l.target === 'string' ? l.target : (l.target as SimNode).id;
        return srcId === d.id || tgtId === d.id
          ? 'hsl(var(--primary))'
          : 'hsl(var(--muted-foreground) / 0.3)';
      });
      link.attr('stroke-width', (l) => {
        const srcId = typeof l.source === 'string' ? l.source : (l.source as SimNode).id;
        const tgtId = typeof l.target === 'string' ? l.target : (l.target as SimNode).id;
        return srcId === d.id || tgtId === d.id ? 2 : 1;
      });
    });

    node.on('mouseleave', () => {
      link
        .attr('stroke', 'hsl(var(--muted-foreground) / 0.3)')
        .attr('stroke-width', 1);
    });

    // Click: navigate to note
    node.on('click', (_event, d) => {
      navigateToNote(d.id);
    });

    // Tick: update positions
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      svg.attr('width', newWidth).attr('height', newHeight);
      simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    });

    resizeObserver.observe(container);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
    };
  }, [graphData, navigateToNote]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full max-w-2xl rounded-lg" />
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No graph data
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create notes with [[wikilinks]] to build your knowledge graph.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Knowledge Graph</h1>
        <span className="ml-3 text-sm text-muted-foreground">
          {graphData.nodes.length} notes &middot; {graphData.edges.length} links
        </span>
      </div>
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <svg ref={svgRef} className="h-full w-full" />
      </div>
    </div>
  );
}
