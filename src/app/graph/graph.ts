import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import {FormsModule} from '@angular/forms';

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
}

@Component({
  selector: 'app-graph',
  templateUrl: './graph.html',
  imports: [
    FormsModule
  ],
  styleUrls: ['./graph.css']
})
export class GraphComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graphContainer') container!: ElementRef<HTMLDivElement>;

  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private simulation!: d3.Simulation<GraphNode, GraphLink>;
  private nodeRadius = 25;
  private margin = 50; // Отступ от краев

  // Размеры области
  width = 1000;
  height = 600;

  // Данные графа
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

  // Для двустороннего связывания
  newEdgeWeight: number = 1;
  newEdgeDirected: boolean = true;

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

    // Очищаем контейнер
    container.innerHTML = '';

    // Создаем SVG
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`);

    // Симуляция сил с ограничивающей рамкой
    this.simulation = d3.forceSimulation<GraphNode>(this.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(this.links)
        .id((d: GraphNode) => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(this.nodeRadius + 10))
      .force('boundingBox', this.createBoundingBoxForce());

    // Отрисовка графа
    this.renderGraph();
  }

  // Создаем силу для удержания узлов в границах
  private createBoundingBoxForce() {
    return (alpha: number) => {
      const margin = this.margin;
      const width = this.width;
      const height = this.height;
      const radius = this.nodeRadius;

      this.nodes.forEach(node => {
        if (node.x === undefined || node.y === undefined) return;

        // Проверяем границы по X
        if (node.x - radius < margin) {
          node.x = margin + radius;
          if (node.vx) node.vx = -node.vx * 0.5; // Рикошет
        } else if (node.x + radius > width - margin) {
          node.x = width - margin - radius;
          if (node.vx) node.vx = -node.vx * 0.5;
        }

        // Проверяем границы по Y
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
    // Очищаем предыдущий граф
    this.svg.selectAll('*').remove();

    // Добавляем границы области (для визуализации)
    this.svg.append('rect')
      .attr('x', this.margin)
      .attr('y', this.margin)
      .attr('width', this.width - 2 * this.margin)
      .attr('height', this.height - 2 * this.margin)
      .attr('fill', 'none')
      .attr('stroke', '#eee')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 1);

    // Создаем группу для ссылок
    const linkGroup = this.svg.append('g').attr('class', 'links');
    const nodeGroup = this.svg.append('g').attr('class', 'nodes');

    // Определения для стрелок
    const defs = this.svg.append('defs');

    // Маркеры для разных направлений
    ['', '-reverse', '-selected', '-reverse-selected'].forEach(suffix => {
      const isSelected = suffix.includes('selected');
      const isReverse = suffix.includes('reverse');
      const id = `arrow${suffix}`;

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
        .attr('fill', isSelected ? '#FF5722' : '#666')
        .attr('transform', isReverse ? 'rotate(180)' : '');
    });

    // Рисуем ссылки
    const link = linkGroup.selectAll('.link')
      .data(this.links)
      .enter()
      .append('g')
      .attr('class', 'link')
      .attr('id', (d: GraphLink) => `link-${d.id}`)
      .on('click', (event: MouseEvent, d: GraphLink) => this.selectLink(d.id));

    // Линия ссылки
    link.append('path')
      .attr('class', 'line')
      .attr('stroke', (d: GraphLink) => this.selectedLinkId === d.id ? '#FF5722' : '#666')
      .attr('stroke-width', 3)
      .attr('fill', 'none')
      .attr('marker-end', (d: GraphLink) => {
        if (!d.directed) return '';
        const isSelected = this.selectedLinkId === d.id;
        const isReverse = this.isReverseLink(d);
        return `url(#arrow${isReverse ? '-reverse' : ''}${isSelected ? '-selected' : ''})`;
      });

    // Фон для метки
    link.append('circle')
      .attr('class', 'label-background')
      .attr('r', 14)
      .attr('fill', 'white')
      .attr('stroke', (d: GraphLink) => this.selectedLinkId === d.id ? '#FF5722' : '#E91E63')
      .attr('stroke-width', 2);

    // Вес ребра
    link.append('text')
      .attr('class', 'edge-label')
      .text((d: GraphLink) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', (d: GraphLink) => this.selectedLinkId === d.id ? '#FF5722' : '#E91E63')
      .attr('font-weight', 'bold')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none');

    // Рисуем узлы
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

    // Круг узла
    node.append('circle')
      .attr('r', this.nodeRadius)
      .attr('fill', (d: GraphNode) => this.selectedNodeIds.includes(d.id) ? '#4CAF50' : '#2196F3')
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Текст узла
    node.append('text')
      .text((d: GraphNode) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none');

    // Обновление позиций при тиках симуляции
    this.simulation.on('tick', () => {
      this.updatePositions(link, node);
    });

    // Центрируем граф
    this.centerGraph();
  }

  // Центрирование графа
  private centerGraph() {
    if (this.nodes.length === 0) return;

    // Находим границы
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    this.nodes.forEach(node => {
      if (node.x && node.x < minX) minX = node.x;
      if (node.x && node.x > maxX) maxX = node.x;
      if (node.y && node.y < minY) minY = node.y;
      if (node.y && node.y > maxY) maxY = node.y;
    });

    // Центрируем
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

  private updatePositions(
    link: d3.Selection<SVGGElement, GraphLink, SVGGElement, unknown>,
    node: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>
  ) {
    // Обновляем позиции узлов
    node.attr('transform', (d: GraphNode) => `translate(${d.x || 0},${d.y || 0})`);

    // Обновляем линии и метки
    link.each((d: GraphLink, i: number, groups: SVGGElement[] | ArrayLike<SVGGElement>) => {
      const linkElement = groups[i] as SVGGElement;
      const source = d.source as GraphNode;
      const target = d.target as GraphNode;

      if (!source.x || !source.y || !target.x || !target.y) return;

      // Вычисляем вектор направления
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        // Если узлы на одной точке (обратное ребро)
        this.updateSelfLoop(linkElement, source, d);
        return;
      }

      const nx = dx / distance;
      const ny = dy / distance;

      // Точки на границах узлов
      const startX = source.x + nx * this.nodeRadius;
      const startY = source.y + ny * this.nodeRadius;
      const endX = target.x - nx * this.nodeRadius;
      const endY = target.y - ny * this.nodeRadius;

      // Обновляем линию
      const line = d3.select(linkElement).select<SVGPathElement>('.line');
      line.attr('d', `M${startX},${startY} L${endX},${endY}`);

      // Обновляем позицию метки - СМЕЩАЕМ В СТОРОНУ от центра линии
      const labelBg = d3.select(linkElement).select<SVGCircleElement>('.label-background');
      const text = d3.select(linkElement).select<SVGTextElement>('.edge-label');

      const middleX = (startX + endX) / 2;
      const middleY = (startY + endY) / 2;

      // Смещаем метку перпендикулярно линии на 15 пикселей
      const offset = 35;
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

      // Обновляем маркер для направленных ребер
      if (d.directed) {
        const markerEnd = `url(#arrow${this.isReverseLink(d) ? '-reverse' : ''}${this.selectedLinkId === d.id ? '-selected' : ''})`;
        line.attr('marker-end', markerEnd);
      } else {
        line.attr('marker-end', '');
      }
    });
  }

  // Обработка обратных ребер (петли)
  private updateSelfLoop(linkElement: SVGGElement, node: GraphNode, link: GraphLink) {
    if (!node.x || !node.y) return;

    const line = d3.select(linkElement).select<SVGPathElement>('.line');
    const labelBg = d3.select(linkElement).select<SVGCircleElement>('.label-background');
    const text = d3.select(linkElement).select<SVGTextElement>('.edge-label');

    // Рисуем петлю
    const loopSize = 50;
    const loopX = node.x;
    const loopY = node.y - this.nodeRadius - 20;

    line.attr('d', `
      M${node.x},${node.y - this.nodeRadius}
      C${node.x - loopSize},${node.y - this.nodeRadius - 20}
       ${node.x + loopSize},${node.y - this.nodeRadius - 20}
       ${node.x},${node.y - this.nodeRadius}
    `);

    // Позиционируем метку над петлей
    labelBg
      .attr('cx', loopX)
      .attr('cy', loopY - 15);

    text
      .attr('x', loopX)
      .attr('y', loopY - 15);
  }

  // Проверка на обратное ребро (A -> B и B -> A одновременно)
  private isReverseLink(link: GraphLink): boolean {
    const reverseLink = this.links.find(l =>
      l.id !== link.id &&
      l.source === link.target &&
      l.target === link.source
    );
    return !!reverseLink;
  }

  // Проверка на петлю (узел ссылается сам на себя)
  private isSelfLoop(link: GraphLink): boolean {
    return link.source === link.target;
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

  // Методы управления графом
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

    // Проверяем, нет ли уже такого ребра
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
      // Удаляем узел
      this.nodes = this.nodes.filter(n => n.id !== nodeId);

      // Удаляем все связанные ребра
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
    // Пересоздаем симуляцию с новыми данными
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

    // Перерисовываем граф
    this.renderGraph();
  }

  clearSelection() {
    this.selectedNodeIds = [];
    this.selectedLinkId = null;
    this.updateGraph();
  }

  // Кнопка центрирования
  centerView() {
    this.centerGraph();
    this.updateGraph();
  }

  // Вспомогательный метод для шаблона
  isEdgeDirected(edgeId: string | null): boolean {
    if (!edgeId) return false;
    const edge = this.links.find(e => e.id === edgeId);
    return edge?.directed || false;
  }

  // Получить текущий вес выбранного ребра
  getSelectedEdgeWeight(): string {
    if (!this.selectedLinkId) return '';
    const edge = this.links.find(e => e.id === this.selectedLinkId);
    return edge ? edge.weight.toString() : '';
  }
}
