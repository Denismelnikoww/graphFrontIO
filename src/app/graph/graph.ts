import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../http-service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: GraphNode;
  target: GraphNode;
  weight: number;
  directed: boolean;
  label: string;
  highlighted?: boolean;
}

interface GraphRequest {
  nodes: Array<{
    id: string;
    label: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    weight: number;
    directed: boolean;
  }>;
  algorithm: string;
}

interface GraphResult {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    weight: number;
    directed: boolean;
    highlighted: boolean;
  }>;
  description: string;
}

interface GraphResponse {
  originalGraph: GraphRequest;
  resultGraphs?: GraphResult[];
  algorithmResult?: any;
  message?: string;
}

interface AlgorithmOption {
  id: string;
  name: string;
  category: string;
  description: string;
}

@Component({
  selector: 'app-graph',
  templateUrl: './graph.html',
  imports: [
    FormsModule,
    CommonModule,
    HttpClientModule,
  ],
  styleUrls: ['./graph.css']
})
export class GraphComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graphContainer') container!: ElementRef<HTMLDivElement>;

  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private simulation!: d3.Simulation<GraphNode, GraphLink>;
  private nodeRadius = 25;
  private margin = 50;

  width = 1200;
  height = 600;

  nodes: GraphNode[] = [
    { id: '1', label: '1', x: 200, y: 300 },
    { id: '2', label: '2', x: 400, y: 300 },
    { id: '3', label: '3', x: 600, y: 300 }
  ];

  links: GraphLink[] = [
    {
      id: 'e1',
      source: this.nodes[0],
      target: this.nodes[1],
      weight: 3,
      directed: true,
      label: '3'
    },
    {
      id: 'e2',
      source: this.nodes[1],
      target: this.nodes[2],
      weight: 7,
      directed: true,
      label: '7'
    }
  ];

  selectedNodeIds: string[] = [];
  selectedLinkId: string | null = null;

  algorithms: AlgorithmOption[] = [
    { id: 'bfs', name: 'Поиск в ширину (BFS)', category: 'Быстрые алгоритмы', description: 'Обход графа в ширину' },
    { id: 'dfs', name: 'Поиск в глубину (DFS)', category: 'Быстрые алгоритмы', description: 'Обход графа в глубину' },
    { id: 'topological', name: 'Топологическая сортировка', category: 'Быстрые алгоритмы', description: 'Упорядочивание вершин ориентированного графа' },
    { id: 'prim', name: 'Алгоритм Прима', category: 'Минимальное остовное дерево', description: 'Построение минимального остовного дерева' },
    { id: 'kruskal', name: 'Алгоритм Крускала', category: 'Минимальное остовное дерево', description: 'Построение минимального остовного дерева' },
    { id: 'dijkstra', name: 'Алгоритм Дейкстры', category: 'Кратчайшие пути', description: 'Поиск кратчайших путей от одной вершины' },
    { id: 'bellman-ford', name: 'Алгоритм Беллмана-Форда', category: 'Кратчайшие пути', description: 'Поиск кратчайших путей с отрицательными весами' },
    { id: 'ford-fulkerson', name: 'Алгоритм Форда-Фалкерсона', category: 'Потоки в сетях', description: 'Поиск максимального потока в сети' },
    { id: 'articulation', name: 'Точки сочленения', category: 'Связность', description: 'Поиск точек сочленения графа' },
    { id: 'bridges', name: 'Мосты графа', category: 'Связность', description: 'Поиск мостов графа' }
  ];

  selectedAlgorithm: string = 'bfs';
  groupedAlgorithms: Map<string, AlgorithmOption[]> = new Map();

  resultGraphs: GraphResult[] = [];
  currentResultIndex: number = 0;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  newEdgeWeight: number = 1;
  newEdgeDirected: boolean = true;

  constructor(private httpService: HttpService) {
    this.groupAlgorithmsByCategory();
  }

  private groupAlgorithmsByCategory() {
    this.groupedAlgorithms.clear();
    this.algorithms.forEach(algorithm => {
      if (!this.groupedAlgorithms.has(algorithm.category)) {
        this.groupedAlgorithms.set(algorithm.category, []);
      }
      this.groupedAlgorithms.get(algorithm.category)!.push(algorithm);
    });
  }

  ngAfterViewInit() {
    this.initGraph();
  }

  ngOnDestroy() {
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  private initGraph() {
    const container = this.container.nativeElement;
    container.innerHTML = '';

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`);

    this.simulation = d3.forceSimulation<GraphNode>(this.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(this.links)
        .id((d: GraphNode) => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(this.nodeRadius + 10))
      .force('boundingBox', this.createBoundingBoxForce());

    this.renderGraph();
  }

  private createBoundingBoxForce() {
    return () => {
      const margin = this.margin;
      const width = this.width;
      const height = this.height;
      const radius = this.nodeRadius;

      this.nodes.forEach(node => {
        if (node.x === undefined || node.y === undefined) return;

        if (node.x - radius < margin) {
          node.x = margin + radius;
          if (node.vx) node.vx = -node.vx * 0.5;
        } else if (node.x + radius > width - margin) {
          node.x = width - margin - radius;
          if (node.vx) node.vx = -node.vx * 0.5;
        }

        if (node.y - radius < margin) {
          node.y = margin + radius;
          if (node.vy) node.vy = -node.vy * 0.5;
        } else if (node.y + radius > height - margin) {
          node.y = height - margin - radius;
          if (node.vy) node.vy = -node.vy * 0.5;
        }
      });
    };
  }

  private renderGraph() {
    this.svg.selectAll('*').remove();

    const linkGroup = this.svg.append('g').attr('class', 'links');
    const nodeGroup = this.svg.append('g').attr('class', 'nodes');

    const defs = this.svg.append('defs');

    ['', '-reverse', '-selected', '-reverse-selected', '-highlighted', '-reverse-highlighted'].forEach(suffix => {
      const isSelected = suffix.includes('selected');
      const isHighlighted = suffix.includes('highlighted');
      const isReverse = suffix.includes('reverse');
      const id = `arrow${suffix}`;

      let color = '#666';
      if (isSelected) color = '#FF5722';
      else if (isHighlighted) color = '#FF9800';

      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', this.nodeRadius + 3)
        .attr('refY', 0)
        .attr('markerWidth', 7)
        .attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4Z')
        .attr('fill', color)
        .attr('transform', isReverse ? 'rotate(180)' : '');
    });

    const link = linkGroup.selectAll('.link')
      .data(this.links)
      .enter()
      .append('g')
      .attr('class', 'link')
      .attr('id', (d: GraphLink) => `link-${d.id}`)
      .on('click', (event: MouseEvent, d: GraphLink) => this.selectLink(d.id));

    link.append('path')
      .attr('class', 'line')
      .attr('stroke', (d: GraphLink) => {
        if (d.highlighted) return '#FF9800';
        if (this.selectedLinkId === d.id) return '#FF5722';
        return '#666';
      })
      .attr('stroke-width', (d: GraphLink) => d.highlighted ? 4 : 3)
      .attr('fill', 'none')
      .attr('marker-end', (d: GraphLink) => {
        if (!d.directed) return '';
        const isSelected = this.selectedLinkId === d.id;
        const isHighlighted = d.highlighted;
        const isReverse = this.isReverseLink(d);

        if (isHighlighted) {
          return `url(#arrow${isReverse ? '-reverse' : ''}-highlighted)`;
        } else if (isSelected) {
          return `url(#arrow${isReverse ? '-reverse' : ''}-selected)`;
        } else {
          return `url(#arrow${isReverse ? '-reverse' : ''})`;
        }
      });

    link.append('circle')
      .attr('class', 'label-background')
      .attr('r', 14)
      .attr('fill', (d: GraphLink) => d.highlighted ? '#FFF3E0' : 'white')
      .attr('stroke', (d: GraphLink) => {
        if (d.highlighted) return '#FF9800';
        if (this.selectedLinkId === d.id) return '#FF5722';
        return '#E91E63';
      })
      .attr('stroke-width', 2);

    link.append('text')
      .attr('class', 'edge-label')
      .text((d: GraphLink) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', (d: GraphLink) => {
        if (d.highlighted) return '#FF9800';
        if (this.selectedLinkId === d.id) return '#FF5722';
        return '#E91E63';
      })
      .attr('font-weight', 'bold')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none');

    const node = nodeGroup.selectAll('.node')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('id', (d: GraphNode) => `node-${d.id}`)
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => this.dragStarted(event, d))
          .on('drag', (event, d) => this.dragged(event, d))
          .on('end', (event, d) => this.dragEnded(event, d))
      )
      .on('click', (event: MouseEvent, d: GraphNode) => this.selectNode(d.id));

    node.append('circle')
      .attr('r', this.nodeRadius)
      .attr('fill', (d: GraphNode) => this.selectedNodeIds.includes(d.id) ? '#4CAF50' : '#2196F3')
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    node.append('text')
      .text((d: GraphNode) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none');

    this.simulation.on('tick', () => {
      this.updatePositions(link, node);
    });

    this.centerGraph();
  }

  isEdgeDirected(edgeId: string | null): boolean {
    if (!edgeId) return false;
    const edge = this.links.find(e => e.id === edgeId);
    return edge?.directed || false;
  }

  private updatePositions(
    link: d3.Selection<SVGGElement, GraphLink, SVGGElement, unknown>,
    node: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>
  ) {
    node.attr('transform', (d: GraphNode) => `translate(${d.x || 0},${d.y || 0})`);

    link.each((d: GraphLink, i: number, groups: SVGGElement[] | ArrayLike<SVGGElement>) => {
      const linkElement = groups[i] as SVGGElement;
      const source = d.source as GraphNode;
      const target = d.target as GraphNode;

      if (!source.x || !source.y || !target.x || !target.y) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        this.updateSelfLoop(linkElement, source, d);
        return;
      }

      const nx = dx / distance;
      const ny = dy / distance;

      const startX = source.x + nx * this.nodeRadius;
      const startY = source.y + ny * this.nodeRadius;
      const endX = target.x - nx * this.nodeRadius;
      const endY = target.y - ny * this.nodeRadius;

      const line = d3.select(linkElement).select<SVGPathElement>('.line');
      line.attr('d', `M${startX},${startY} L${endX},${endY}`);

      const labelBg = d3.select(linkElement).select<SVGCircleElement>('.label-background');
      const text = d3.select(linkElement).select<SVGTextElement>('.edge-label');

      const middleX = (startX + endX) / 2;
      const middleY = (startY + endY) / 2;

      const offset = 15;
      const perpX = -ny * offset;
      const perpY = nx * offset;

      const labelX = middleX + perpX;
      const labelY = middleY + perpY;

      labelBg
        .attr('cx', labelX)
        .attr('cy', labelY);

      text
        .attr('x', labelX)
        .attr('y', labelY);
    });
  }

  private updateSelfLoop(linkElement: SVGGElement, node: GraphNode, link: GraphLink) {
    if (!node.x || !node.y) return;

    const line = d3.select(linkElement).select<SVGPathElement>('.line');
    const labelBg = d3.select(linkElement).select<SVGCircleElement>('.label-background');
    const text = d3.select(linkElement).select<SVGTextElement>('.edge-label');

    const loopSize = 50;
    const loopX = node.x;
    const loopY = node.y - this.nodeRadius - 20;

    line.attr('d', `
      M${node.x},${node.y - this.nodeRadius}
      C${node.x - loopSize},${node.y - this.nodeRadius - 20}
       ${node.x + loopSize},${node.y - this.nodeRadius - 20}
       ${node.x},${node.y - this.nodeRadius}
    `);

    labelBg
      .attr('cx', loopX)
      .attr('cy', loopY - 15);

    text
      .attr('x', loopX)
      .attr('y', loopY - 15);
  }

  private isReverseLink(link: GraphLink): boolean {
    const reverseLink = this.links.find(l =>
      l.id !== link.id &&
      l.source === link.target &&
      l.target === link.source
    );
    return !!reverseLink;
  }

  private dragStarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragEnded(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  selectNode(nodeId: string, event?: MouseEvent) {
    if (event) event.stopPropagation();

    if (this.selectedNodeIds.includes(nodeId)) {
      this.selectedNodeIds = this.selectedNodeIds.filter(id => id !== nodeId);
    } else {
      if (this.selectedNodeIds.length < 2) {
        this.selectedNodeIds = [...this.selectedNodeIds, nodeId];
      } else {
        this.selectedNodeIds = [this.selectedNodeIds[1], nodeId];
      }
    }
    this.selectedLinkId = null;
    this.updateGraph();
  }

  selectLink(linkId: string, event?: MouseEvent) {
    if (event) event.stopPropagation();

    if (this.selectedLinkId === linkId) {
      this.selectedLinkId = null;
    } else {
      this.selectedLinkId = linkId;
    }
    this.selectedNodeIds = [];
    this.updateGraph();
  }

  addNode() {
    const newNode: GraphNode = {
      id: `node-${Date.now()}`,
      label: `${this.nodes.length + 1}`,
      x: this.margin + this.nodeRadius + Math.random() * (this.width - 2 * (this.margin + this.nodeRadius)),
      y: this.margin + this.nodeRadius + Math.random() * (this.height - 2 * (this.margin + this.nodeRadius))
    };
    this.nodes.push(newNode);
    this.updateGraph();
  }

  addEdge() {
    if (this.selectedNodeIds.length < 2) {
      alert('Выберите 2 вершины для соединения');
      return;
    }

    const sourceId = this.selectedNodeIds[0];
    const targetId = this.selectedNodeIds[1];
    const sourceNode = this.nodes.find(n => n.id === sourceId);
    const targetNode = this.nodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) return;

    const existingEdge = this.links.find(l =>
      l.source === sourceNode && l.target === targetNode
    );

    if (existingEdge) {
      alert('Такое ребро уже существует!');
      return;
    }

    const newLink: GraphLink = {
      id: `edge-${Date.now()}`,
      source: sourceNode,
      target: targetNode,
      weight: this.newEdgeWeight,
      directed: this.newEdgeDirected,
      label: `${this.newEdgeWeight}`
    };

    this.links.push(newLink);
    this.selectedNodeIds = [];
    this.updateGraph();
  }

  updateEdgeWeight() {
    if (!this.selectedLinkId) {
      alert('Выберите ребро для изменения веса');
      return;
    }

    const edge = this.links.find(e => e.id === this.selectedLinkId);
    if (edge) {
      const newWeight = prompt('Введите новый вес ребра:', edge.weight.toString() || '1');
      if (newWeight !== null) {
        const weight = parseInt(newWeight, 10);
        if (!isNaN(weight) && weight >= 0) {
          edge.weight = weight;
          edge.label = `${weight}`;
          this.updateGraph();
        } else {
          alert('Введите корректное число!');
        }
      }
    }
  }

  toggleEdgeDirection() {
    if (!this.selectedLinkId) {
      alert('Выберите ребро для изменения направления');
      return;
    }

    const edge = this.links.find(e => e.id === this.selectedLinkId);
    if (edge) {
      edge.directed = !edge.directed;
      this.updateGraph();
    }
  }

  deleteNode() {
    if (this.selectedNodeIds.length !== 1) {
      alert('Выберите одну вершину для удаления');
      return;
    }

    const nodeId = this.selectedNodeIds[0];
    if (!confirm(`Удалить вершину "${nodeId}"?`)) return;

    const nodeToDelete = this.nodes.find(n => n.id === nodeId);

    if (nodeToDelete) {
      this.nodes = this.nodes.filter(n => n.id !== nodeId);
      this.links = this.links.filter(e =>
        e.source !== nodeToDelete && e.target !== nodeToDelete
      );

      this.selectedNodeIds = [];
      this.updateGraph();
    }
  }

  deleteEdge() {
    if (!this.selectedLinkId) {
      alert('Выберите ребро для удаления');
      return;
    }

    if (!confirm('Удалить выбранное ребро?')) return;

    this.links = this.links.filter(e => e.id !== this.selectedLinkId);
    this.selectedLinkId = null;
    this.updateGraph();
  }

  private updateGraph() {
    if (this.simulation) {
      this.simulation.stop();
    }

    this.simulation = d3.forceSimulation<GraphNode>(this.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(this.links)
        .id((d: GraphNode) => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(this.nodeRadius + 10))
      .force('boundingBox', this.createBoundingBoxForce());

    this.renderGraph();
  }

  clearSelection() {
    this.selectedNodeIds = [];
    this.selectedLinkId = null;
    this.updateGraph();
  }

  centerGraph() {
    if (this.nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    this.nodes.forEach(node => {
      if (node.x && node.x < minX) minX = node.x;
      if (node.x && node.x > maxX) maxX = node.x;
      if (node.y && node.y < minY) minY = node.y;
      if (node.y && node.y > maxY) maxY = node.y;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const offsetX = this.width / 2 - centerX;
    const offsetY = this.height / 2 - centerY;

    this.nodes.forEach(node => {
      if (node.x) node.x += offsetX;
      if (node.y) node.y += offsetY;
      if (node.fx) node.fx += offsetX;
      if (node.fy) node.fy += offsetY;
    });

    this.simulation.alpha(0.3).restart();
  }

  getSelectedEdgeWeight(): string {
    if (!this.selectedLinkId) return '';
    const edge = this.links.find(e => e.id === this.selectedLinkId);
    return edge ? edge.weight.toString() : '';
  }

  solveGraph() {
    if (!this.selectedAlgorithm) {
      alert('Выберите алгоритм для выполнения');
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.resultGraphs = [];
    this.currentResultIndex = 0;

    const graphData: GraphRequest = {
      nodes: this.nodes.map(node => ({
        id: node.id,
        label: node.label
      })),
      edges: this.links.map(link => ({
        id: link.id,
        source: (link.source as GraphNode).id,
        target: (link.target as GraphNode).id,
        weight: link.weight,
        directed: link.directed
      })),
      algorithm: this.selectedAlgorithm
    };

    this.httpService.post<GraphRequest, GraphResponse>('/graph/solve', graphData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          if (response.resultGraphs && response.resultGraphs.length > 0) {
            this.resultGraphs = response.resultGraphs;
            this.currentResultIndex = 0;
            this.applyGraphResult(this.resultGraphs[0]);
          } else if (response.message) {
            this.errorMessage = response.message;
          } else {
            this.errorMessage = 'Нет результатов для отображения';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = `Ошибка при отправке данных: ${error.message || 'Неизвестная ошибка'}`;
          console.error('Ошибка при отправке графа:', error);
        }
      });
  }

  private applyGraphResult(resultGraph: GraphResult) {
    if (!resultGraph) return;

    this.links.forEach(link => {
      link.highlighted = false;
    });

    resultGraph.edges.forEach((resultEdge: { id: string; highlighted: boolean }) => {
      const link = this.links.find(l => l.id === resultEdge.id);
      if (link) {
        link.highlighted = resultEdge.highlighted;
      }
    });

    this.updateGraph();
  }

  showNextResult() {
    if (this.resultGraphs && this.resultGraphs.length > 0) {
      this.currentResultIndex = (this.currentResultIndex + 1) % this.resultGraphs.length;
      this.applyGraphResult(this.resultGraphs[this.currentResultIndex]);
    }
  }

  showPreviousResult() {
    if (this.resultGraphs && this.resultGraphs.length > 0) {
      this.currentResultIndex = this.currentResultIndex === 0
        ? this.resultGraphs.length - 1
        : this.currentResultIndex - 1;
      this.applyGraphResult(this.resultGraphs[this.currentResultIndex]);
    }
  }

  clearResults() {
    this.resultGraphs = [];
    this.currentResultIndex = 0;
    this.links.forEach(link => {
      link.highlighted = false;
    });
    this.updateGraph();
  }

  getCurrentResultDescription(): string {
    if (!this.resultGraphs || this.resultGraphs.length === 0) {
      return 'Нет результатов';
    }

    const currentResult = this.resultGraphs[this.currentResultIndex];
    return currentResult.description || `Результат ${this.currentResultIndex + 1} из ${this.resultGraphs.length}`;
  }

  getSelectedAlgorithmName(): string {
    const algo = this.algorithms.find(a => a.id === this.selectedAlgorithm);
    return algo ? algo.name : 'Выберите алгоритм';
  }

  getSelectedAlgorithmDescription(): string {
    const algo = this.algorithms.find(a => a.id === this.selectedAlgorithm);
    return algo ? algo.description : '';
  }
}
