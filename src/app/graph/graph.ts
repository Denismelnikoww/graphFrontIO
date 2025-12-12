import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../http-service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

// Интерфейс для связи в предустановленных графах (храним только ID)
interface PresetLink {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  directed: boolean;
}

interface GraphPreset {
  id: string;
  name: string;
  description: string;
  nodes: GraphNode[];
  links: PresetLink[];
}

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
  startNodeId?: string;
  endNodeId?: string;
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

  selectedStartNodeId: string | null = null;
  selectedEndNodeId: string | null = null;

  width = 1400;
  height = 800;

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

  graphPresets: GraphPreset[] = [
    {
      id: 'simple-triangle',
      name: 'Простой треугольник',
      description: 'Три вершины, соединенные в треугольник',
      nodes: [
        { id: '1', label: '1', x: 400, y: 200 },
        { id: '2', label: '2', x: 200, y: 400 },
        { id: '3', label: '3', x: 600, y: 400 }
      ],
      links: [
        { id: 'e1', sourceId: '1', targetId: '2', weight: 5, directed: false },
        { id: 'e2', sourceId: '2', targetId: '3', weight: 7, directed: false },
        { id: 'e3', sourceId: '3', targetId: '1', weight: 3, directed: false }
      ]
    },
    {
      "id": "PVSH-BFS",
      "name": "Граф для BFS (поиска в ширину)",
      "description": "Девять вершин, соединённых последовательно в цепочку с дополнительными рёбрами для демонстрации BFS",
      "nodes": [
        { "id": "1", "label": "1", "x": 300, "y": 100 },
        { "id": "2", "label": "2", "x": 500, "y": 100 },
        { "id": "3", "label": "3", "x": 700, "y": 100 },
        { "id": "4", "label": "4", "x": 1100, "y": 300 },
        { "id": "5", "label": "5", "x": 300, "y": 300 },
        { "id": "6", "label": "6", "x": 500, "y": 300 },
        { "id": "7", "label": "7", "x": 700, "y": 300 },
        { "id": "8", "label": "8", "x": 900, "y": 100 },
        { "id": "9", "label": "9", "x": 900, "y": 300 }
      ],
      "links": [
        { "id": "e1", "sourceId": "1", "targetId": "2", "weight": 1, "directed": false },
        { "id": "e2", "sourceId": "2", "targetId": "3", "weight": 1, "directed": false },
        { "id": "e3", "sourceId": "1", "targetId": "5", "weight": 1, "directed": false },
        { "id": "e4", "sourceId": "3", "targetId": "6", "weight": 1, "directed": false },
        { "id": "e5", "sourceId": "5", "targetId": "6", "weight": 1, "directed": false },
        { "id": "e7", "sourceId": "6", "targetId": "7", "weight": 1, "directed": false },
        { "id": "e8", "sourceId": "8", "targetId": "9", "weight": 1, "directed": false },
        { "id": "e10", "sourceId": "9", "targetId": "7", "weight": 1, "directed": false },
        { "id": "e11", "sourceId": "2", "targetId": "6", "weight": 1, "directed": false },
        { "id": "e12", "sourceId": "3", "targetId": "7", "weight": 1, "directed": false },
        { "id": "e13", "sourceId": "3", "targetId": "8", "weight": 1, "directed": false },
        { "id": "e15", "sourceId": "7", "targetId": "8", "weight": 1, "directed": false },
        { "id": "e16", "sourceId": "8", "targetId": "4", "weight": 1, "directed": false }
      ]
    },
    {
      id: 'OstPrim',
      name: 'Граф для алгоритма Прима',
      description: 'Невзвешенный неориентированный граф с 5 вершинами и 8 ребрами, используемый для демонстрации работы алгоритма Прима.',
      nodes: [
        { id: '1', label: '1', x: 200, y: 200 },
        { id: '2', label: '2', x: 600, y: 200 },
        { id: '3', label: '3', x: 400, y: 400 },
        { id: '4', label: '4', x: 200, y: 600 },
        { id: '5', label: '5', x: 600, y: 600 }
      ],
      links: [
        { id: 'e1', sourceId: '1', targetId: '2', weight: 7, directed: false },
        { id: 'e2', sourceId: '1', targetId: '3', weight: 2, directed: false },
        { id: 'e3', sourceId: '1', targetId: '4', weight: 5, directed: false },
        { id: 'e4', sourceId: '2', targetId: '3', weight: 3, directed: false },
        { id: 'e5', sourceId: '2', targetId: '5', weight: 5, directed: false },
        { id: 'e6', sourceId: '3', targetId: '4', weight: 4, directed: false },
        { id: 'e7', sourceId: '3', targetId: '5', weight: 6, directed: false },
        { id: 'e8', sourceId: '4', targetId: '5', weight: 3, directed: false }
      ]
    },
    {
      "id": "Dijkstra",
      "name": "Граф для алгоритма Дейкстры",
      "description": "Взвешенный ориентированный граф с 5 вершинами и 11 направленными ребрами, используемый для демонстрации работы алгоритма Дейкстры.",
      "nodes": [
        { "id": "1", "label": "1", "x": 200, "y": 400 },
        { "id": "2", "label": "2", "x": 400, "y": 200 },
        { "id": "3", "label": "3", "x": 600, "y": 200 },
        { "id": "4", "label": "4", "x": 400, "y": 600 },
        { "id": "5", "label": "5", "x": 600, "y": 600 }
      ],
      "links": [
        { "id": "e1",  "sourceId": "1", "targetId": "2", "weight": 2, "directed": true },
        { "id": "e2",  "sourceId": "1", "targetId": "4", "weight": 4, "directed": true },
        { "id": "e3",  "sourceId": "1", "targetId": "5", "weight": 6, "directed": true },
        { "id": "e4",  "sourceId": "2", "targetId": "3", "weight": 2, "directed": true },
        { "id": "e5",  "sourceId": "2", "targetId": "4", "weight": 1, "directed": true },
        { "id": "e6",  "sourceId": "2", "targetId": "5", "weight": 2, "directed": true },
        { "id": "e7",  "sourceId": "4", "targetId": "2", "weight": 2, "directed": true },
        { "id": "e8",  "sourceId": "4", "targetId": "5", "weight": 1, "directed": true },
        { "id": "e9", "sourceId": "5", "targetId": "3", "weight": 1, "directed": true },
        { "id": "e10", "sourceId": "1", "targetId": "3", "weight": 7, "directed": true }
      ]
    },
    {
      id: 'FordFulkerson',
      name: 'Граф для алгоритма Форда-Фалкерсона',
      description: 'Взвешенный ориентированный граф с 5 вершинами и 9 направленными ребрами, используемый для демонстрации работы алгоритма Форда-Фалкерсона. Веса рёбер представляют пропускную способность. Вершина 1 — источник, вершина 5 — сток.',
      nodes: [
        { id: '1', label: '1', x: 200, y: 400 },
        { id: '2', label: '2', x: 400, y: 200 },
        { id: '3', label: '3', x: 600, y: 400 },
        { id: '4', label: '4', x: 400, y: 600 },
        { id: '5', label: '5', x: 800, y: 400 }
      ],
      links: [
        { id: 'e1', sourceId: '1', targetId: '2', weight: 5, directed: true },
        { id: 'e2', sourceId: '1', targetId: '4', weight: 1, directed: true },
        { id: 'e3', sourceId: '2', targetId: '3', weight: 1, directed: true },
        { id: 'e4', sourceId: '2', targetId: '4', weight: 2, directed: true },
        { id: 'e5', sourceId: '2', targetId: '5', weight: 1, directed: true },
        { id: 'e6', sourceId: '3', targetId: '2', weight: 1, directed: true },
        { id: 'e7', sourceId: '3', targetId: '5', weight: 1, directed: true },
        { id: 'e8', sourceId: '4', targetId: '3', weight: 4, directed: true },
        { id: 'e9', sourceId: '4', targetId: '5', weight: 3, directed: true }
      ]
    },
    {
      id: 'BlocksBridgesArticulation',
      name: 'Граф для анализа блоков, мостов и точек раздела',
      description: 'Неориентированный граф с 7 вершинами и 8 ребрами, демонстрирующий структурные компоненты: блоки, мосты и точки раздела.',
      nodes: [
        { id: '1', label: '1', x: 200, y: 200 },
        { id: '2', label: '2', x: 200, y: 600 },
        { id: '3', label: '3', x: 400, y: 400 },
        { id: '4', label: '4', x: 600, y: 400 },
        { id: '5', label: '5', x: 800, y: 200 },
        { id: '6', label: '6', x: 800, y: 600 },
        { id: '7', label: '7', x: 1000, y: 400 }
      ],
      links: [
        { id: 'e1', sourceId: '1', targetId: '3', weight: 1, directed: false },
        { id: 'e2', sourceId: '2', targetId: '3', weight: 1, directed: false },
        { id: 'e3', sourceId: '1', targetId: '2', weight: 1, directed: false },
        { id: 'e4', sourceId: '3', targetId: '4', weight: 1, directed: false },
        { id: 'e5', sourceId: '4', targetId: '5', weight: 1, directed: false },
        { id: 'e6', sourceId: '4', targetId: '6', weight: 1, directed: false },
        { id: 'e7', sourceId: '5', targetId: '7', weight: 1, directed: false },
        { id: 'e8', sourceId: '6', targetId: '7', weight: 1, directed: false },
        { id: 'e9', sourceId: '4', targetId: '7', weight: 1, directed: false }
      ]
    }
  ];

  selectedPreset: string = 'simple-triangle';

  algorithms = [
    { id: 'bfs', name: 'Поиск в ширину (BFS)' },
    { id: 'prim', name: 'Алгоритм Прима' },
    { id: 'dijkstra', name: 'Алгоритм Дейкстры' },
    { id: 'ford-fulkerson', name: 'Алгоритм Форда-Фалкерсона' },
    { id: 'bridges', name: 'Блоки, мосты, точки раздела' }
  ];

  selectedAlgorithm: string = 'bfs';

  resultGraphs: GraphResult[] = [];
  currentResultIndex: number = 0;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  newEdgeWeight: number = 1;
  newEdgeDirected: boolean = true;

  constructor(private httpService: HttpService) {
    // Загружаем начальный граф
    this.loadInitialPreset();
  }

  private loadInitialPreset() {
    const preset = this.graphPresets.find(p => p.id === this.selectedPreset);
    if (preset) {
      this.loadPresetData(preset);
    }
  }

  private loadPresetData(preset: GraphPreset) {
    // Копируем узлы
    this.nodes = preset.nodes.map(node => ({
      ...node,
      x: node.x || Math.random() * (this.width - 2 * this.margin) + this.margin,
      y: node.y || Math.random() * (this.height - 2 * this.margin) + this.margin
    }));

    this.selectedStartNodeId = null;
    this.selectedEndNodeId = null;

    // Создаем связи, находя соответствующие узлы по их ID
    this.links = [];

    preset.links.forEach(link => {
      const sourceNode = this.nodes.find(n => n.id === link.sourceId);
      const targetNode = this.nodes.find(n => n.id === link.targetId);

      if (!sourceNode || !targetNode) {
        console.warn(`Не удалось найти узлы для связи ${link.id}: sourceId=${link.sourceId}, targetId=${link.targetId}`);
        return;
      }

      this.links.push({
        id: link.id,
        source: sourceNode,
        target: targetNode,
        weight: link.weight,
        directed: link.directed,
        label: `${link.weight}`,
        highlighted: false
      });
    });

    // Очищаем выделения
    this.selectedNodeIds = [];
    this.selectedLinkId = null;
    this.resultGraphs = [];
    this.currentResultIndex = 0;
    this.errorMessage = null;

    // Обновляем граф
    if (this.simulation) {
      this.updateGraph();
    }
  }

  loadPreset() {
    const preset = this.graphPresets.find(p => p.id === this.selectedPreset);
    if (preset) {
      if (this.nodes.length > 0) {
        if (!confirm('Текущий граф будет заменен. Продолжить?')) {
          return;
        }
      }
      this.loadPresetData(preset);
    }
  }

  clearGraph() {
    if (this.nodes.length === 0) {
      return;
    }

    if (!confirm('Очистить весь граф? Все вершины и ребра будут удалены.')) {
      return;
    }

    this.nodes = [];
    this.links = [];
    this.selectedNodeIds = [];
    this.selectedLinkId = null;
    this.selectedStartNodeId = null;
    this.selectedEndNodeId = null;
    this.resultGraphs = [];
    this.currentResultIndex = 0;
    this.errorMessage = null;

    this.updateGraph();
  }

  getSelectedPresetName(): string {
    const preset = this.graphPresets.find(p => p.id === this.selectedPreset);
    return preset ? preset.name : 'Не выбран';
  }

  getSelectedPresetDescription(): string {
    const preset = this.graphPresets.find(p => p.id === this.selectedPreset);
    return preset ? preset.description : '';
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

    // Создаем различные типы стрелок
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

    // Рисуем связи (рёбра)
    const link = linkGroup.selectAll('.link')
      .data(this.links)
      .enter()
      .append('g')
      .attr('class', 'link')
      .attr('id', (d: GraphLink) => `link-${d.id}`)
      .on('click', (event: MouseEvent, d: GraphLink) => this.selectLink(d.id));

    // Линия ребра
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

    // Фон для метки ребра
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

    // Метка ребра (вес)
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

    // Рисуем вершины
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

    // Круг вершины
    node.append('circle')
      .attr('r', this.nodeRadius)
      .attr('fill', (d: GraphNode) => {
        // Приоритет цветов: начальная вершина > конечная вершина > выбранные > обычные
        if (d.id === this.selectedStartNodeId) return '#4CAF50'; // Зеленый для начальной
        if (d.id === this.selectedEndNodeId) return '#F44336';   // Красный для конечной
        if (this.selectedNodeIds.includes(d.id)) return '#2196F3'; // Синий для выбранных
        return '#607D8B'; // Серый для обычных
      })
      .attr('stroke', (d: GraphNode) => {
        if (d.id === this.selectedStartNodeId || d.id === this.selectedEndNodeId) {
          return '#333'; // Темный контур для вершин алгоритма
        }
        return this.selectedNodeIds.includes(d.id) ? '#1565C0' : '#333';
      })
      .attr('stroke-width', (d: GraphNode) => {
        if (d.id === this.selectedStartNodeId || d.id === this.selectedEndNodeId) {
          return 3; // Толще для вершин алгоритма
        }
        return 2;
      });

    // Добавляем иконки для начальной и конечной вершин алгоритма
    node.each((d: GraphNode, i: number, nodes: SVGGElement[] | ArrayLike<SVGGElement>) => {
      const nodeElement = nodes[i] as SVGGElement;
      const group = d3.select(nodeElement);

      // Иконка для начальной вершины
      if (d.id === this.selectedStartNodeId) {
        group.append('text')
          .attr('class', 'node-icon')
          .attr('id', `icon-start-${d.id}`)
          .text('▶')
          .attr('x', -this.nodeRadius - 15)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#4CAF50')
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .attr('pointer-events', 'none');
      }

      // Иконка для конечной вершины
      if (d.id === this.selectedEndNodeId) {
        group.append('text')
          .attr('class', 'node-icon')
          .attr('id', `icon-end-${d.id}`)
          .text('⏹')
          .attr('x', this.nodeRadius + 15)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#F44336')
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .attr('pointer-events', 'none');
      }

      // Добавляем подписи для вершин алгоритма
      if (d.id === this.selectedStartNodeId) {
        group.append('text')
          .attr('class', 'node-algorithm-label')
          .attr('id', `label-start-${d.id}`)
          .text(this.selectedAlgorithm === 'ford-fulkerson' ? 'Источник' : 'Начало')
          .attr('x', -this.nodeRadius - 15)
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .attr('fill', '#4CAF50')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('pointer-events', 'none');
      }

      if (d.id === this.selectedEndNodeId) {
        group.append('text')
          .attr('class', 'node-algorithm-label')
          .attr('id', `label-end-${d.id}`)
          .text('Сток')
          .attr('x', this.nodeRadius + 15)
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .attr('fill', '#F44336')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('pointer-events', 'none');
      }
    });

    // Метка вершины (ID)
    node.append('text')
      .text((d: GraphNode) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none');

    // Добавляем индикатор выбора для алгоритмов
    if (this.selectedStartNodeId || this.selectedEndNodeId) {
      nodeGroup.append('rect')
        .attr('class', 'selection-indicator')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', this.width)
        .attr('height', 30)
        .attr('fill', '#FFF3E0')
        .attr('opacity', 0.8);

      let indicatorText = '';
      if (this.selectedStartNodeId && this.selectedEndNodeId) {
        indicatorText = `Выбраны вершины для алгоритма: Начало (${this.selectedStartNodeId}) → Конец (${this.selectedEndNodeId})`;
      } else if (this.selectedStartNodeId) {
        indicatorText = `Выбрана начальная вершина: ${this.selectedStartNodeId}`;
      }

      if (indicatorText) {
        nodeGroup.append('text')
          .attr('class', 'selection-indicator-text')
          .text(indicatorText)
          .attr('x', this.width / 2)
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .attr('fill', '#333')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold');
      }
    }

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
    // Обновляем позиции вершин
    node.attr('transform', (d: GraphNode) => `translate(${d.x || 0},${d.y || 0})`);

    // Обновляем позиции рёбер
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

    // Обновляем позиции индикатора выбора алгоритма
    if (this.selectedStartNodeId || this.selectedEndNodeId) {
      const indicatorRect = this.svg.select('.selection-indicator');
      const indicatorText = this.svg.select('.selection-indicator-text');

      if (indicatorRect.empty()) {
        this.svg.append('rect')
          .attr('class', 'selection-indicator')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', this.width)
          .attr('height', 30)
          .attr('fill', '#FFF3E0')
          .attr('opacity', 0.8);
      }

      if (indicatorText.empty()) {
        let text = '';
        if (this.selectedStartNodeId && this.selectedEndNodeId) {
          text = `Выбраны вершины для алгоритма: Начало (${this.selectedStartNodeId}) → Конец (${this.selectedEndNodeId})`;
        } else if (this.selectedStartNodeId) {
          text = `Выбрана начальная вершина: ${this.selectedStartNodeId}`;
        }

        if (text) {
          this.svg.append('text')
            .attr('class', 'selection-indicator-text')
            .text(text)
            .attr('x', this.width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold');
        }
      } else {
        // Обновляем текст индикатора
        let text = '';
        if (this.selectedStartNodeId && this.selectedEndNodeId) {
          text = `Выбраны вершины для алгоритма: Начало (${this.selectedStartNodeId}) → Конец (${this.selectedEndNodeId})`;
        } else if (this.selectedStartNodeId) {
          text = `Выбрана начальная вершина: ${this.selectedStartNodeId}`;
        }
        indicatorText.text(text);
      }
    } else {
      // Удаляем индикатор, если вершины не выбраны
      this.svg.selectAll('.selection-indicator, .selection-indicator-text').remove();
    }
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

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Проверяем, не пытаемся ли мы выбрать начальную/конечную вершину
    const isSelectingForAlgorithm = this.shouldSelectStartOrEndNode();

    if (isSelectingForAlgorithm) {
      this.handleAlgorithmNodeSelection(nodeId);
      return;
    }

    // Оригинальная логика выбора вершин
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

  public shouldSelectStartOrEndNode(): boolean {
    return this.selectedAlgorithm === 'dijkstra' ||
      this.selectedAlgorithm === 'bfs' ||
      this.selectedAlgorithm === 'ford-fulkerson';
  }

  private handleAlgorithmNodeSelection(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (this.selectedAlgorithm === 'dijkstra' || this.selectedAlgorithm === 'bfs') {
      if (this.selectedStartNodeId === nodeId) {
        this.selectedStartNodeId = null;
      } else {
        this.selectedStartNodeId = nodeId;
        this.selectedEndNodeId = null; // Сбрасываем конечную вершину, если выбрана начальная
      }
    } else if (this.selectedAlgorithm === 'ford-fulkerson') {
      if (!this.selectedStartNodeId) {
        this.selectedStartNodeId = nodeId;
      } else if (!this.selectedEndNodeId && this.selectedStartNodeId !== nodeId) {
        this.selectedEndNodeId = nodeId;
      } else if (this.selectedStartNodeId === nodeId) {
        this.selectedStartNodeId = null;
      } else if (this.selectedEndNodeId === nodeId) {
        this.selectedEndNodeId = null;
      }
    }

    this.updateGraph();
  }

  clearAlgorithmSelection() {
    this.selectedStartNodeId = null;
    this.selectedEndNodeId = null;
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

    // Проверка выбора вершин для алгоритмов
    if ((this.selectedAlgorithm === 'dijkstra' || this.selectedAlgorithm === 'bfs') && !this.selectedStartNodeId) {
      alert('Для этого алгоритма выберите начальную вершину!');
      return;
    }

    if (this.selectedAlgorithm === 'ford-fulkerson' && (!this.selectedStartNodeId || !this.selectedEndNodeId)) {
      alert('Для алгоритма Форда-Фалкерсона выберите начальную и конечную вершины!');
      return;
    }

    if (this.selectedAlgorithm === 'ford-fulkerson' && this.selectedStartNodeId === this.selectedEndNodeId) {
      alert('Начальная и конечная вершины не могут совпадать!');
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
      algorithm: this.selectedAlgorithm,
      startNodeId: this.selectedStartNodeId || undefined,
      endNodeId: this.selectedEndNodeId || undefined
    };

    this.httpService.post<GraphRequest, GraphResponse>('/graph/solve', graphData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          console.log('Получен ответ от сервера:', response); // Для отладки

          if (response.resultGraphs && response.resultGraphs.length > 0) {
            this.resultGraphs = response.resultGraphs;
            this.currentResultIndex = 0;
            this.applyGraphResult(this.resultGraphs[this.currentResultIndex]);

            // Показываем сообщение, если есть несколько шагов
            if (this.resultGraphs.length > 1) {
              this.errorMessage = null; // Очищаем ошибки
            }
          } else if (response.algorithmResult) {
            // Если есть результат, но нет промежуточных шагов
            this.resultGraphs = [{
              nodes: this.nodes.map(n => ({ id: n.id, label: n.label })),
              edges: this.links.map(l => ({
                id: l.id,
                source: (l.source as GraphNode).id,
                target: (l.target as GraphNode).id,
                weight: l.weight,
                directed: l.directed,
                highlighted: false
              })),
              description: response.message || 'Результат выполнения алгоритма'
            }];
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
    const descriptions: {[key: string]: string} = {
      'bfs': 'Обход графа в ширину от первой вершины',
      'prim': 'Построение минимального остовного дерева',
      'dijkstra': 'Поиск кратчайших путей от одной вершины до всех остальных',
      'ford-fulkerson': 'Поиск максимального потока в сети',
      'bridges': 'Поиск мостов (ребер, удаление которых разрывает связность), блоков, точек раздела'
    };

    return descriptions[this.selectedAlgorithm] || '';
  }
}
